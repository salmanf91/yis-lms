import { Schema, Types } from "mongoose";
import { lessonPlanModel } from "../models/lessonPlan.model";
import { CurriculumModel } from "../models/curriculum.model";
import { LookupModel } from "../models/lookup.model";
import { RoasterModel } from "../models/roaster.model";
import { UserModel } from "../models/user.model";

export interface createLessonPlanInput {
    curriculumId: string;
    topic: string;
    resource?: string;
    assessment?: string;
}

export async function createLessonPlan(teacherId: string, input: createLessonPlanInput) {
    console.log("teacher id : ", teacherId)

    if (!input.curriculumId || !Types.ObjectId.isValid(input.curriculumId)) {
        return null;
    }

    const curriculum = await CurriculumModel.findById(input.curriculumId)
    if(!curriculum) return null;

    console.log("curriculum id " ,input.curriculumId);
    const plan = await lessonPlanModel.create({
        curriculumId: curriculum._id,
        teacherId: new Types.ObjectId(teacherId),

        gradeId: curriculum.gradeId,
        subjectId: curriculum.subjectId,
        semesterId: curriculum.semesterId,
        weekNo: curriculum.weekNo,

        topic: input.topic,
        resource: input.resource,
        assessment: input.assessment,

        status: "DRAFT",
        isActive: true,
        createdBy: new Types.ObjectId(teacherId),
        updatedBy: new Types.ObjectId(teacherId),
    })

    return plan;
}

export async function listLessonPlan(filters: any, user: any) {
    const query: any = { isActive: true };

    if(filters.gradeId) query.gradeId = filters.gradeId;
    if(filters.subjectId) query.subjectId = filters.subjectId;
    if(filters.semesterId) query.semesterId = filters.semesterId;
    if(filters.weekNo) query.weekNo = filters.weekNo;
    if(filters.status) query.status = filters.status;
    if(filters.curriculumId) query.curriculumId = filters.curriculumId;

    if(user.role == "TEACHER") query.teacherId = user.userId;

    // Department filter: resolve to teacher IDs first
    if (filters.department) {
        const deptTeachers = await UserModel.find({ department: filters.department, isActive: true }).select('_id').lean();
        const ids = deptTeachers.map((t: any) => t._id);
        // Intersect with existing teacherId filter if present
        query.teacherId = query.teacherId ? query.teacherId : { $in: ids };
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Number(filters.limit) >= 9999 ? 9999 : Math.min(200, Number(filters.limit) || 50);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        lessonPlanModel.find(query)
            .populate("curriculumId")
            .populate("teacherId", "name email department")
            .populate("gradeId", "label code")
            .populate("subjectId", "label code")
            .populate("semesterId", "label code")
            .sort({ weekNo: 1, createdAt: 1 })
            .skip(skip)
            .limit(limit),
        lessonPlanModel.countDocuments(query),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getLessonPlanById(id: string) {
    return lessonPlanModel.findById(id)
    .populate("curriculumId")
    .populate("teacherId")
    .populate("gradeId")
    .populate("subjectId")
    .populate("semesterId");
}

export async function updateLessonPlan(id: string, teacherId: string, data: any) {
    const plan = await lessonPlanModel.findById(id);

    if(!plan) return null;

    if(plan.teacherId.toString() !== teacherId) return "FORBIDDEN";
    if(plan.status !== "DRAFT" && plan.status !== "REJECTED") return "NOT_ALLOWED";
    
    Object.assign(plan, data);

    plan.updatedBy = new Types.ObjectId(teacherId);
    await plan.save();
    return plan;
}

export async function submitLessonPlan(id: string, teacherId: string) {
    const plan = await lessonPlanModel.findById(id);
    if(!plan) return null;

    if (plan.teacherId.toString() !== teacherId) return "FORBIDDEN";
    if (plan.status !== "DRAFT" && plan.status !== "REJECTED") return "NOT_ALLOWED";

    plan.status = "SUBMITTED";
    plan.submittedAt = new Date();
    await plan.save();

    return plan;
}

export async function approveLessonPlan(id: string, hodId: string, comments?: string) {
    const plan = await lessonPlanModel.findById(id);
    if(!plan) return null;

    if(plan.status !== "SUBMITTED") return "NOT_ALLOWED";

    plan.status = "APPROVED";
    plan.reviewedBy = new Types.ObjectId(hodId);
    plan.reviewedAt = new Date();
    plan.reviewComments = comments;

    await plan.save();
    return plan;
}

export async function rejectLessonPlan(id: string, hodId: string, comments?: string) {
    const plan = await lessonPlanModel.findById(id);
    if(!plan) return null;

    if(plan.status !== "SUBMITTED") return "NOT_ALLOWED";

    plan.status = "REJECTED";
    plan.reviewedBy = new Types.ObjectId(hodId);
    plan.reviewedAt = new Date();
    plan.reviewComments = comments;

    await plan.save();
    return plan;
}

export async function deactivateLessonPlan(id: string) {
    return lessonPlanModel.findByIdAndUpdate(id, {isActive: false }, { new: true })
}

// ─── Bulk import weekly plans from Excel (Master_DB format) ──────────────────

export interface ImportPlanRow {
    gradeLabel: string;
    subjectLabel: string;
    semesterLabel: string;
    weekNo: number;
    day: string;        // "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday"
    topic: string;
    resource: string;
    assessment: string;
}

function normLabel(s: string) {
    return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function bulkImportWeeklyPlans(rows: ImportPlanRow[], importerId: string) {
    // 1. Resolve unique grade/subject/semester labels → lookup IDs
    const gradeLabels    = [...new Set(rows.map(r => r.gradeLabel))];
    const subjectLabels  = [...new Set(rows.map(r => r.subjectLabel))];
    const semesterLabels = [...new Set(rows.map(r => r.semesterLabel))];

    const [gradeList, subjectList, semesterList] = await Promise.all([
        LookupModel.find({ type: 'GRADE',    isActive: true }),
        LookupModel.find({ type: 'SUBJECT',  isActive: true }),
        LookupModel.find({ type: 'SEMESTER', isActive: true }),
    ]);

    const findLookup = (list: any[], label: string) => {
        const norm = normLabel(label);
        return list.find(i => normLabel(i.label) === norm)
            || list.find(i => normLabel(i.label).includes(norm) || norm.includes(normLabel(i.label)));
    };

    const gradeMap   = Object.fromEntries(gradeLabels.map(l   => [l, findLookup(gradeList,   l)?._id]));
    const subjectMap = Object.fromEntries(subjectLabels.map(l  => [l, findLookup(subjectList, l)?._id]));
    const semesterMap = Object.fromEntries(semesterLabels.map(l => {
        const num   = normLabel(l).replace(/^(semester|sem|term|s)\s*0*/i, '').replace(/\D/g, '');
        const found = semesterList.find(s => normLabel(s.label).replace(/\D/g, '') === num) || semesterList[0];
        return [l, found?._id];
    }));

    // 2. For each unique gradeId+subjectId+day, find teachers from roster
    //    Roster has: gradeId + subjectId + day → teacherId(s)
    const uniqueSlots = [...new Set(rows.map(r =>
        `${gradeMap[r.gradeLabel]}::${subjectMap[r.subjectLabel]}::${r.day}`
    ))];

    const teachersBySlot: Record<string, Types.ObjectId[]> = {};
    for (const slot of uniqueSlots) {
        const [gradeId, subjectId, day] = slot.split('::');
        if (!gradeId || !subjectId || gradeId === 'undefined' || subjectId === 'undefined') continue;

        const teacherIds = await RoasterModel.find({
            gradeId:   new Types.ObjectId(gradeId),
            subjectId: new Types.ObjectId(subjectId),
            day,
            isActive: true,
        }).distinct('teacherId');

        teachersBySlot[slot] = teacherIds.map(id => new Types.ObjectId(id));
    }

    // 3. Build upsert ops — one lesson plan per teacher per grade+subject+day+week
    let created = 0, skipped = 0;
    const warnings: string[] = [];
    const bulkOps: any[] = [];
    const importerOid = new Types.ObjectId(importerId);

    for (const row of rows) {
        const gradeId    = gradeMap[row.gradeLabel];
        const subjectId  = subjectMap[row.subjectLabel];
        const semesterId = semesterMap[row.semesterLabel];

        if (!gradeId || !subjectId || !semesterId) {
            const msg = `No lookup for "${row.gradeLabel} / ${row.subjectLabel} / ${row.semesterLabel}" — run aSc XML import first`;
            if (!warnings.includes(msg)) warnings.push(msg);
            skipped++; continue;
        }

        const slot     = `${gradeId}::${subjectId}::${row.day}`;
        const teachers = teachersBySlot[slot] || [];

        if (teachers.length === 0) {
            const msg = `No teacher in roster for ${row.gradeLabel} / ${row.subjectLabel} on ${row.day}`;
            if (!warnings.includes(msg)) warnings.push(msg);
            skipped++; continue;
        }

        // Optional: link to curriculum if it exists
        const curriculum = await CurriculumModel.findOne({
            gradeId, subjectId, semesterId, weekNo: row.weekNo, isActive: true
        });

        for (const teacherId of teachers) {
            // Unique key: grade + subject + teacher + week + day
            const filter = { gradeId, subjectId, teacherId, weekNo: row.weekNo, day: row.day };
            const update: any = {
                $set: {
                    gradeId, subjectId, semesterId, teacherId,
                    weekNo:     row.weekNo,
                    day:        row.day,
                    topic:      row.topic || row.resource || row.assessment || '(imported)',
                    resource:   row.resource   || '',
                    assessment: row.assessment || '',
                    status:     'APPROVED',
                    isActive:   true,
                    updatedBy:  importerOid,
                    ...(curriculum ? { curriculumId: curriculum._id } : {}),
                },
                $setOnInsert: { createdBy: importerOid },
            };
            bulkOps.push({ updateOne: { filter, update, upsert: true } });
            created++;
        }
    }

    if (bulkOps.length > 0) {
        await lessonPlanModel.collection.bulkWrite(bulkOps, { ordered: false });
    }

    return { created, skipped, warnings: [...new Set(warnings)] };
}