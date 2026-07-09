import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { createRoasterEntry, listRoaster, updateRoaster, deleteRoaster, deactivateRoaster } from "../services/roaster.service";
import { isValidObjectId } from "mongoose";
import { UserModel } from "../models/user.model";
import { LookupModel } from "../models/lookup.model";
import { RoasterModel } from "../models/roaster.model";
import * as xml2js from 'xml2js';
import multer from 'multer';
import bcrypt from 'bcrypt';

const ascUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
export const ascUploadMiddleware = ascUpload.single('file');

export async function createRoasterHandler(req: Request, res: Response) {
    try{
        const { teacherId, gradeId, subjectId, section, day, period, startTime, endTime } = req.body;
        if(!teacherId || !gradeId || !subjectId || !section || !day || !period || !startTime || !endTime ){
            return sendResponse(res, 400, false, "All fields are required");
        }

        if(!isValidObjectId(teacherId) || !isValidObjectId(gradeId) || !isValidObjectId(subjectId)) {
            return sendResponse(res, 400, false, "Invalid teacherId/gradeIs/subjectId")
        }

        const teacher = await UserModel.findOne({_id: teacherId, isActive: true});
        if(!teacher) {
            return sendResponse(res, 400, false, "Teacher Not found");
        }

        const grade = await LookupModel.findOne({_id: gradeId, isActive: true })
        if(!grade) {
            return sendResponse(res, 400, false, "Invalid gradeId")
        }

        const subject = await LookupModel.findOne({_id: subjectId, isActive: true })
        if(!subject) {
            return sendResponse(res, 400, false, "Invalid subjectId")
        }
        const entry = await createRoasterEntry(req.body);
        return sendResponse(res, 200, true, "roaster entry created", entry);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function listRoasterHandler(req: Request, res: Response) {
    try {
        const { page, limit, ...filters } = req.query;
        const data = await listRoaster(filters, page ? Number(page) : 1, limit ? Number(limit) : 50);
        return sendResponse(res, 200, true, "Roaster List", data);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function updateRoasterHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const updated = await updateRoaster(id, req.body);
        return sendResponse(res, 200, true, "Roaster Updated", updated);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function deleteRoasterHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        await deleteRoaster(id);
        return sendResponse(res, 200, true, "Roaster Deleted");
    } catch(error){
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function deactivateRoasterHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const deactivated = await deactivateRoaster(id);
        return sendResponse(res, 200, true, "Roaster entry deactivated", deactivated);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function syncSectionsHandler(req: Request, res: Response) {
    try {
        const distinct: string[] = await RoasterModel.distinct('section');
        const maxDoc = await LookupModel.findOne({ type: 'SECTION' }).sort({ order: -1 }).select('order');
        let order = (maxDoc?.order || 0) + 1;
        let created = 0;

        for (const sec of distinct.filter(Boolean).sort()) {
            const code = sec.toUpperCase();
            const exists = await LookupModel.findOne({ type: 'SECTION', code });
            if (!exists) {
                await LookupModel.create({ type: 'SECTION', code, label: code, order: order++, isActive: true });
                created++;
            }
        }

        const all = await LookupModel.find({ type: 'SECTION', isActive: true }).sort({ order: 1 });
        return sendResponse(res, 200, true, `Synced sections: ${created} new`, { created, sections: all });
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

// Day mapping: aSc "days" bitmask → day name (YIS school week: Sun-Thu)
const DAY_MAP: Record<string, string> = {
    '10000': 'Sunday',
    '01000': 'Monday',
    '00100': 'Tuesday',
    '00010': 'Wednesday',
    '00001': 'Thursday',
};

// Period time ranges (period number → {start, end})
const PERIOD_TIMES: Record<number, { start: string; end: string }> = {
    1: { start: '07:30', end: '08:15' },
    2: { start: '08:15', end: '09:00' },
    3: { start: '09:20', end: '10:05' },
    4: { start: '10:05', end: '10:50' },
    5: { start: '10:50', end: '11:35' },
    6: { start: '11:35', end: '12:20' },
    7: { start: '12:20', end: '13:05' },
    8: { start: '13:05', end: '13:50' },
    9: { start: '13:50', end: '14:35' },
};

export async function importAscXml(req: any, res: Response) {
    try {
        if (!req.file) return sendResponse(res, 400, false, 'No file uploaded');

        const xmlStr = req.file.buffer.toString('utf8');
        const parsed = await xml2js.parseStringPromise(xmlStr, { explicitArray: true, mergeAttrs: false });

        const root = parsed.timetable || parsed.Timetable || Object.values(parsed)[0] as any;
        if (!root) return sendResponse(res, 400, false, 'Invalid aSc XML format');

        // Helper to extract array of items from potentially nested structure
        const getItems = (node: any, key: string): any[] => {
            if (!node) return [];
            const val = node[key];
            if (!val) return [];
            if (Array.isArray(val)) {
                // Could be array of wrapper objects or direct items
                if (val.length > 0 && val[0].$ ) return val; // direct items with attributes
                return val.flatMap((v: any) => (v[key.replace(/s$/, '')] || []));
            }
            return [];
        };

        // Parse teachers: id → { name, firstname, lastname, email }
        const teacherMap: Record<string, { name: string; firstname: string; lastname: string; email: string }> = {};
        const teachersNode = root.teachers?.[0] || root.Teachers?.[0];
        if (teachersNode) {
            const teachers = teachersNode.teacher || teachersNode.Teacher || [];
            for (const t of teachers) {
                const attrs = t.$ || t;
                if (attrs.id && attrs.name) {
                    teacherMap[attrs.id] = {
                        name: attrs.name.trim(),
                        firstname: (attrs.firstname || '').trim(),
                        lastname: (attrs.lastname || '').trim(),
                        email: (attrs.email || '').trim(),
                    };
                }
            }
        }

        // Parse subjects: id → name
        const subjectMap: Record<string, string> = {};
        const subjectsNode = root.subjects?.[0] || root.Subjects?.[0];
        if (subjectsNode) {
            const subjects = subjectsNode.subject || subjectsNode.Subject || [];
            for (const s of subjects) {
                const attrs = s.$ || s;
                if (attrs.id && attrs.name) subjectMap[attrs.id] = attrs.name;
            }
        }

        // Parse classes: id → { grade: number, section: string, name: string }
        const classMap: Record<string, { grade: number; section: string; name: string }> = {};
        const classesNode = root.classes?.[0] || root.Classes?.[0];
        if (classesNode) {
            const classes = classesNode.class || classesNode.Class || [];
            for (const c of classes) {
                const attrs = c.$ || c;
                if (!attrs.id) continue;
                const name: string = attrs.name || '';
                // "1 S" → grade=1, section="S"; or use attrs.grade
                const gradeNum = attrs.grade ? parseInt(attrs.grade) : parseInt(name.split(' ')[0]);
                const section = name.split(' ')[1] || 'A';
                classMap[attrs.id] = { grade: gradeNum, section, name };
            }
        }

        // Parse lessons: id → { classid, subjectid, teacherid }
        const lessonMap: Record<string, { classid: string; subjectid: string; teacherid: string }> = {};
        const lessonsNode = root.lessons?.[0] || root.Lessons?.[0];
        if (lessonsNode) {
            const lessons = lessonsNode.lesson || lessonsNode.Lesson || [];
            for (const l of lessons) {
                const attrs = l.$ || l;
                if (!attrs.id) continue;
                lessonMap[attrs.id] = {
                    classid: attrs.classid || attrs.classids || '',
                    subjectid: attrs.subjectid || '',
                    teacherid: attrs.teacherid || attrs.teacherids || '',
                };
            }
        }

        // Parse cards
        const cardsNode = root.cards?.[0] || root.Cards?.[0];
        const cards = cardsNode ? (cardsNode.card || cardsNode.Card || []) : [];

        // ── Auto-create missing GRADE, SUBJECT, and SECTION lookups from XML data ──

        // Collect all unique grade numbers referenced in classes
        const ascGradeNumbers = new Set<number>();
        for (const cls of Object.values(classMap)) {
            if (!isNaN(cls.grade)) ascGradeNumbers.add(cls.grade);
        }

        // Collect all unique subject names referenced in lessons
        const ascSubjectNames = new Set<string>();
        for (const lesson of Object.values(lessonMap)) {
            const name = subjectMap[lesson.subjectid];
            if (name) ascSubjectNames.add(name);
        }

        // Collect all unique section letters (e.g. "D", "Q", "V", "S")
        const ascSectionLetters = new Set<string>();
        for (const cls of Object.values(classMap)) {
            if (cls.section) ascSectionLetters.add(cls.section.toUpperCase());
        }

        // Find max order for each type to append new items
        const [maxGradeDoc, maxSubjectDoc, maxSectionDoc, existingSubjectDocs] = await Promise.all([
            LookupModel.findOne({ type: 'GRADE' }).sort({ order: -1 }).select('order'),
            LookupModel.findOne({ type: 'SUBJECT' }).sort({ order: -1 }).select('order'),
            LookupModel.findOne({ type: 'SECTION' }).sort({ order: -1 }).select('order'),
            LookupModel.find({ type: 'SUBJECT' }).select('code'),
        ]);
        let gradeOrder = (maxGradeDoc?.order || 0) + 1;
        let subjectOrder = (maxSubjectDoc?.order || 0) + 1;
        let sectionOrder = (maxSectionDoc?.order || 0) + 1;

        // Track already-used codes to avoid duplicates during this import run
        const usedSubjectCodes = new Set(existingSubjectDocs.map((d: any) => d.code as string));

        const uniqueCode = (name: string): string => {
            const base = name.slice(0, 6).toUpperCase().replace(/\s/g, '');
            let candidate = base;
            let i = 1;
            while (usedSubjectCodes.has(candidate)) {
                candidate = base.slice(0, 5) + i++;
            }
            usedSubjectCodes.add(candidate);
            return candidate;
        };

        // Upsert grades
        for (const gradeNum of Array.from(ascGradeNumbers).sort((a, b) => a - b)) {
            const label = `Grade ${gradeNum}`;
            const code = `G${gradeNum}`;
            const existing = await LookupModel.findOne({ type: 'GRADE', label });
            if (!existing) {
                await LookupModel.create({ type: 'GRADE', code, label, order: gradeOrder++, isActive: true });
            }
        }

        // Upsert subjects (skip department meeting subjects)
        for (const subjectName of Array.from(ascSubjectNames)) {
            if (subjectName.toLowerCase().includes('meeting')) continue;
            const existing = await LookupModel.findOne({ type: 'SUBJECT', label: { $regex: new RegExp(`^${subjectName}$`, 'i') } });
            if (!existing) {
                const code = uniqueCode(subjectName);
                await LookupModel.create({ type: 'SUBJECT', code, label: subjectName, order: subjectOrder++, isActive: true });
            }
        }

        // Upsert sections (letters like D, Q, V, S — sorted alphabetically for consistent ordering)
        for (const sectionLetter of Array.from(ascSectionLetters).sort()) {
            const existing = await LookupModel.findOne({ type: 'SECTION', code: sectionLetter });
            if (!existing) {
                await LookupModel.create({ type: 'SECTION', code: sectionLetter, label: sectionLetter, order: sectionOrder++, isActive: true });
            }
        }

        // ── Auto-create teacher accounts from XML ────────────────────────────────
        // First fetch existing teachers to build the map
        const existingTeachers = await UserModel.find({ role: { $in: ['TEACHER', 'HOD'] } });
        const dbTeacherByName: Record<string, any> = {};
        for (const t of existingTeachers) {
            dbTeacherByName[t.name.toLowerCase()] = t;
        }

        const TEMP_PASSWORD = 'Welcome@123';
        let teachersCreated = 0;

        for (const t of Object.values(teacherMap)) {
            if (dbTeacherByName[t.name.toLowerCase()]) continue; // already exists

            // Generate email: "Rana Abu Nadi" → "rana.abu.nadi@school.edu"
            const emailLocal = t.name.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .trim()
                .replace(/\s+/g, '.');
            const email = t.email || `${emailLocal}@school.edu`;

            // Skip if email already taken (could be duplicate short name)
            const emailExists = await UserModel.findOne({ email });
            if (emailExists) {
                dbTeacherByName[t.name.toLowerCase()] = emailExists;
                continue;
            }

            const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);
            const newUser = await UserModel.create({
                name: t.name,
                email,
                passwordHash,
                role: 'TEACHER',
                isActive: true,
                mustResetPassword: true,
            });
            dbTeacherByName[t.name.toLowerCase()] = newUser;
            teachersCreated++;
        }

        // ── Pre-fetch DB data (now includes auto-created lookups + teachers) ─────
        const [dbGrades, dbSubjects] = await Promise.all([
            LookupModel.find({ type: 'GRADE', isActive: true }),
            LookupModel.find({ type: 'SUBJECT', isActive: true }),
        ]);

        const dbGradeByNumber: Record<number, any> = {};
        for (const g of dbGrades) {
            // label like "Grade 1" or "1" or "KG"
            const m = g.label.match(/(\d+)/);
            if (m) dbGradeByNumber[parseInt(m[1])] = g;
        }

        const dbSubjectByName: Record<string, any> = {};
        for (const s of dbSubjects) {
            dbSubjectByName[s.label.toLowerCase()] = s;
        }

        let created = 0;
        let skipped = 0;
        const warnings: string[] = [];

        for (const card of cards) {
            const attrs = card.$ || card;
            const lessonid = attrs.lessonid || '';
            const days = attrs.days || '';
            const period = parseInt(attrs.period || '0');

            const lesson = lessonMap[lessonid];
            if (!lesson) { skipped++; continue; }

            const day = DAY_MAP[days];
            if (!day) { skipped++; continue; }

            const periodTimes = PERIOD_TIMES[period];
            if (!periodTimes) { skipped++; continue; }

            // Resolve class
            const classInfo = classMap[lesson.classid];
            if (!classInfo) {
                warnings.push(`Unknown class id: ${lesson.classid}`);
                skipped++; continue;
            }

            // Resolve grade
            const dbGrade = dbGradeByNumber[classInfo.grade];
            if (!dbGrade) {
                warnings.push(`Grade ${classInfo.grade} not found in DB`);
                skipped++; continue;
            }

            // Resolve subject
            const ascSubjectName = subjectMap[lesson.subjectid] || '';
            const dbSubject = dbSubjectByName[ascSubjectName.toLowerCase()];
            if (!dbSubject) {
                warnings.push(`Subject "${ascSubjectName}" not found in DB`);
                skipped++; continue;
            }

            // Resolve teacher
            const ascTeacher = teacherMap[lesson.teacherid];
            const ascTeacherName = ascTeacher?.name || '';
            const dbTeacher = ascTeacherName ? dbTeacherByName[ascTeacherName.toLowerCase()] : null;
            if (!dbTeacher) {
                if (ascTeacherName) warnings.push(`Teacher "${ascTeacherName}" could not be resolved`);
                skipped++; continue;
            }

            // Check for duplicate
            const existing = await RoasterModel.findOne({
                teacherId: dbTeacher._id,
                gradeId: dbGrade._id,
                subjectId: dbSubject._id,
                section: classInfo.section,
                day,
                period,
            });
            if (existing) { skipped++; continue; }

            await RoasterModel.create({
                teacherId: dbTeacher._id,
                gradeId: dbGrade._id,
                subjectId: dbSubject._id,
                section: classInfo.section,
                day,
                period,
                startTime: periodTimes.start,
                endTime: periodTimes.end,
                isActive: true,
            });
            created++;
        }

        // Count what was auto-created in Master Data
        const [finalGradeCount, finalSubjectCount, finalSectionCount] = await Promise.all([
            LookupModel.countDocuments({ type: 'GRADE', isActive: true }),
            LookupModel.countDocuments({ type: 'SUBJECT', isActive: true }),
            LookupModel.countDocuments({ type: 'SECTION', isActive: true }),
        ]);

        const uniqueWarnings = [...new Set(warnings)];
        return sendResponse(res, 201, true, `aSc import complete: ${created} roster entries created, ${skipped} skipped`, {
            created,
            skipped,
            teachersCreated,
            masterDataSynced: { grades: finalGradeCount, subjects: finalSubjectCount, sections: finalSectionCount },
            warnings: uniqueWarnings.slice(0, 30),
        });
    } catch (err: any) {
        console.error('aSc XML import error:', err);
        return sendResponse(res, 500, false, err.message || 'Import failed');
    }
}