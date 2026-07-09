// import { Request, Response } from 'express';
// import { AuthRequest } from '../middleware/auth.middleware';
// import { sendResponse } from '../utils/sendResponse';
// import {
//     listAcademicYears,
//     getActiveAcademicYear,
//     createAcademicYear,
//     updateAcademicYear,
//     setActiveAcademicYear,
//     calculateAcademicWeek,
// } from '../services/academicYear.service';
// import { AcademicYearModel } from '../models/academicYear.model';
// import { LookupModel } from '../models/lookup.model';
// import * as XLSX from 'xlsx';
// import multer from 'multer';

// const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// export const uploadMiddleware = upload.single('file');

// function parseAcademicCalendarXlsx(buffer: Buffer) {
//     const wb = XLSX.read(buffer, { type: 'buffer' });
//     const ws = wb.Sheets[wb.SheetNames[0]];
//     const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

//     // ── 1. Detect year name & base year from the title rows ───────────────────
//     let yearName = '2025-2026';
//     let baseYear = 2025;
//     for (const row of rows.slice(0, 5)) {
//         const title = (row as any[]).join(' ');
//         const m = title.match(/(\d{4})[\/\-](\d{2,4})/);
//         if (m) {
//             const y1 = parseInt(m[1]);
//             const y2raw = m[2];
//             const y2 = y2raw.length === 2 ? parseInt(m[1].slice(0, 2) + y2raw) : parseInt(y2raw);
//             yearName = `${y1}-${y2}`;
//             baseYear = y1;
//             break;
//         }
//     }

//     // ── 2. Helpers ────────────────────────────────────────────────────────────
//     const MONTH: Record<string, number> = {
//         jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
//         jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
//     };

//     /**
//      * Parse a day-of-month cell.
//      * Plain numbers → "24".  Cross-month → "1(Jan)" or "2 (Oct.)" (period allowed).
//      * Returns { day, month } or null when the cell is empty.
//      */
//     function parseDayCell(val: any, curMonth: number): { day: number; month: number } | null {
//         if (val === null || val === undefined || val === '') return null;
//         const s = String(val).trim();
//         if (!s) return null;
//         // Allow optional trailing period in month abbreviation: (Oct.) (Aug.) (MAY) etc.
//         const cross = s.match(/^(\d+)\s*\(([A-Za-z]+)\.?\)/);
//         if (cross) {
//             const abbr = cross[2].replace('.', '').toLowerCase().slice(0, 3);
//             return { day: parseInt(cross[1]), month: MONTH[abbr] ?? curMonth };
//         }
//         const n = parseInt(s);
//         return isNaN(n) ? null : { day: n, month: curMonth };
//     }

//     /**
//      * Build a JS Date from day + month.
//      * Aug-Dec → baseYear (e.g. 2025), Jan-Jul → baseYear+1 (e.g. 2026).
//      */
//     function toDate(day: number, month: number): Date {
//         const year = month >= 7 ? baseYear : baseYear + 1;
//         return new Date(year, month, day);
//     }

//     // ── 3. Walk every row and classify it ────────────────────────────────────
//     const SKIP = ['month', 'week', 'sun', 'mon', 'الشهر', 'الأسبوع'];

//     interface ParsedWeek  { weekNo: number; startDate: Date; endDate: Date; }
//     interface ParsedBreak { name: string;   startDate: Date; endDate: Date; }

//     const allWeeks:  ParsedWeek[]  = [];
//     const allBreaks: ParsedBreak[] = [];

//     let curMonth = 7; // start tracking from August

//     for (let i = 0; i < rows.length; i++) {
//         const row   = rows[i] as any[];
//         const colA  = String(row[0] || '').trim(); // Month column  (A)
//         const colB  = String(row[1] || '').trim(); // Week column   (B) — "W 1", "W 2", …
//         const colJ  = String(row[9] || '').trim(); // Remarks column (J)

//         // Skip header / label rows and completely empty rows
//         if (SKIP.some(p => colA.toLowerCase().includes(p) || colB.toLowerCase().includes(p))) continue;
//         if (!row.some((c: any) => c !== '')) continue;

//         // Update the running month from column A whenever it names a month
//         const mkey = colA.toLowerCase().slice(0, 3);
//         if (MONTH[mkey] !== undefined) curMonth = MONTH[mkey];

//         const sunCell = parseDayCell(row[2], curMonth); // col C — Sunday
//         const thuCell = parseDayCell(row[6], curMonth); // col G — Thursday

//         /**
//          * Build a date pair, auto-correcting when Thursday falls in the next
//          * month but the cell has no month indicator (e.g. week starting May 31
//          * ends Thu June 4, but the cell just says "4" while curMonth = May).
//          * A school week is always Sun-Thu (≤ 4 days apart), so if endDate ends
//          * up BEFORE startDate we know the month rolled over and bump it by 1.
//          */
//         function buildDatePair(
//             start: { day: number; month: number },
//             end:   { day: number; month: number } | null,
//         ): { startDate: Date; endDate: Date } {
//             const startDate = toDate(start.day, start.month);
//             let endDate = end
//                 ? toDate(end.day, end.month)
//                 : new Date(startDate.getTime() + 4 * 24 * 60 * 60 * 1000);
//             // Cross-month wrap: endDate landed before startDate → advance 1 month
//             if (endDate < startDate) endDate.setMonth(endDate.getMonth() + 1);
//             return { startDate, endDate };
//         }

//         if (/^W\s*\d+$/.test(colB) && colB !== 'W 00') {
//             // ── Teaching week row ─────────────────────────────────────────────
//             const weekNo = parseInt(colB.replace(/^W\s*/, ''));
//             if (!sunCell) continue; // can't place week without a start date

//             const { startDate, endDate } = buildDatePair(sunCell, thuCell);
//             allWeeks.push({ weekNo, startDate, endDate });

//         } else if (colB === '' || colB === 'W 00') {
//             // ── Vacation / break row ──────────────────────────────────────────
//             // Only collect rows that have a remark AND a start date
//             if (!colJ || !sunCell) continue;

//             const { startDate, endDate } = buildDatePair(sunCell, thuCell);
//             allBreaks.push({ name: colJ, startDate, endDate });
//         }
//     }

//     // ── 4. Split into Term 1 / Term 2 (week numbers reset at term boundary) ──
//     const t1Weeks: ParsedWeek[] = [];
//     const t2Weeks: ParsedWeek[] = [];
//     let inT2 = false;
//     for (let i = 0; i < allWeeks.length; i++) {
//         if (!inT2 && i > 0 && allWeeks[i].weekNo < allWeeks[i - 1].weekNo) inT2 = true;
//         (inT2 ? t2Weeks : t1Weeks).push(allWeeks[i]);
//     }

//     // ── 5. Semester boundaries come straight from the stored week dates ───────
//     const t1Start = t1Weeks[0]?.startDate ?? new Date(baseYear, 7, 24);
//     const t1End   = t1Weeks[t1Weeks.length - 1]?.endDate ?? new Date(baseYear + 1, 0, 8);
//     const t2Start = t2Weeks[0]?.startDate ?? new Date(baseYear + 1, 0, 19);
//     const t2End   = t2Weeks[t2Weeks.length - 1]?.endDate ?? new Date(baseYear + 1, 5, 30);

//     // Assign breaks to the semester whose date range they fall inside
//     const breaks1 = allBreaks.filter(b => b.startDate >= t1Start && b.startDate <= t1End);
//     const breaks2 = allBreaks.filter(b => b.startDate >= t2Start && b.startDate <= t2End);

//     return {
//         name: yearName,
//         startDate: t1Start,
//         endDate:   t2End,
//         semesters: [
//             {
//                 code: 'T1', name: 'Term 1',
//                 startDate: t1Start, endDate: t1End,
//                 weekCount: t1Weeks.length,
//                 breaks: breaks1,
//                 weeks:  t1Weeks,
//             },
//             {
//                 code: 'T2', name: 'Term 2',
//                 startDate: t2Start, endDate: t2End,
//                 weekCount: t2Weeks.length,
//                 breaks: breaks2,
//                 weeks:  t2Weeks,
//             },
//         ],
//     };
// }


// export async function importAcademicYearXlsx(req: any, res: Response) {
//     try {
//         if (!req.file) return sendResponse(res, 400, false, 'No file uploaded');
//         const parsed = parseAcademicCalendarXlsx(req.file.buffer);

//         await AcademicYearModel.updateMany({}, { isActive: false });
//         const year = await AcademicYearModel.create({ ...parsed, isActive: true });

//         // Sync semesters to LookupModel so curriculum/lesson-plan dropdowns work
//         const maxSemesterDoc = await LookupModel.findOne({ type: 'SEMESTER' }).sort({ order: -1 }).select('order');
//         let semOrder = (maxSemesterDoc?.order || 0) + 1;
//         for (const [idx, sem] of parsed.semesters.entries()) {
//             const existing = await LookupModel.findOne({ type: 'SEMESTER', code: sem.code });
//             if (!existing) {
//                 await LookupModel.create({ type: 'SEMESTER', code: sem.code, label: sem.name, order: semOrder + idx, isActive: true });
//             } else {
//                 await LookupModel.updateOne({ _id: existing._id }, { label: sem.name, isActive: true });
//             }
//         }

//         return sendResponse(res, 201, true, 'Academic year imported successfully', year);
//     } catch (err: any) {
//         console.error('XLSX import error:', err);
//         return sendResponse(res, 500, false, err.message || 'Import failed');
//     }
// }

// export async function listAcademicYearsHandler(req: Request, res: Response) {
//     try {
//         const years = await listAcademicYears();
//         return sendResponse(res, 200, true, 'Academic years fetched', years);
//     } catch (err) {
//         console.error(err);
//         return sendResponse(res, 500, false, 'Internal Server Error');
//     }
// }

// export async function getActiveAcademicYearHandler(req: Request, res: Response) {
//     try {
//         const year = await getActiveAcademicYear();
//         if (!year) return sendResponse(res, 404, false, 'No active academic year configured');
//         return sendResponse(res, 200, true, 'Active academic year', year);
//     } catch (err) {
//         console.error(err);
//         return sendResponse(res, 500, false, 'Internal Server Error');
//     }
// }

// export async function createAcademicYearHandler(req: AuthRequest, res: Response) {
//     try {
//         const { name, startDate, endDate, semesters } = req.body;
//         if (!name || !startDate || !endDate || !Array.isArray(semesters) || semesters.length === 0) {
//             return sendResponse(res, 400, false, 'name, startDate, endDate, and semesters are required');
//         }
//         const year = await createAcademicYear({ name, startDate, endDate, semesters });
//         return sendResponse(res, 201, true, 'Academic year created', year);
//     } catch (err) {
//         console.error(err);
//         return sendResponse(res, 500, false, 'Internal Server Error');
//     }
// }

// export async function updateAcademicYearHandler(req: AuthRequest, res: Response) {
//     try {
//         const { id } = req.params;
//         const year = await updateAcademicYear(id, req.body);
//         if (!year) return sendResponse(res, 404, false, 'Academic year not found');
//         return sendResponse(res, 200, true, 'Academic year updated', year);
//     } catch (err) {
//         console.error(err);
//         return sendResponse(res, 500, false, 'Internal Server Error');
//     }
// }

// export async function setActiveYearHandler(req: AuthRequest, res: Response) {
//     try {
//         const { id } = req.params;
//         const year = await setActiveAcademicYear(id);
//         if (!year) return sendResponse(res, 404, false, 'Academic year not found');
//         return sendResponse(res, 200, true, 'Active academic year updated', year);
//     } catch (err) {
//         console.error(err);
//         return sendResponse(res, 500, false, 'Internal Server Error');
//     }
// }

// export async function getCurrentWeekHandler(req: Request, res: Response) {
//     try {
//         const year = await getActiveAcademicYear();
//         if (!year) return sendResponse(res, 404, false, 'No active academic year configured');
//         const result = calculateAcademicWeek(new Date(), year);
//         if (!result) return sendResponse(res, 200, true, 'Outside academic year', { weekNo: null, inSession: false });
//         return sendResponse(res, 200, true, 'Current academic week', { ...result, inSession: true });
//     } catch (err) {
//         console.error(err);
//         return sendResponse(res, 500, false, 'Internal Server Error');
//     }
// }


import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendResponse } from '../utils/sendResponse';
import {
    listAcademicYears,
    getActiveAcademicYear,
    createAcademicYear,
    updateAcademicYear,
    setActiveAcademicYear,
    calculateAcademicWeek,
} from '../services/academicYear.service';
import { AcademicYearModel } from '../models/academicYear.model';
import { LookupModel } from '../models/lookup.model';
import * as XLSX from 'xlsx';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadMiddleware = upload.single('file');

function parseAcademicCalendarXlsx(buffer: Buffer) {
    const wb = XLSX.read(buffer, { type: 'buffer' });

    // 1. Target the tabular sheet
    const ws = wb.Sheets['Key Dates & Events'];
    if (!ws) throw new Error("Could not find the 'Key Dates & Events' sheet in the uploaded file.");

    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // 2. Dynamically find the header row
    let headerRowIdx = -1;
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i] as any[];
        if (row.includes('Date') && row.includes('Event') && row.includes('Category')) {
            headerRowIdx = i;
            break;
        }
    }

    if (headerRowIdx === -1) throw new Error("Could not find headers (Date, Event, Category) in the sheet.");

    const headers = rawData[headerRowIdx] as string[];
    const dateIdx = headers.indexOf('Date');
    const eventIdx = headers.indexOf('Event');
    const catIdx = headers.indexOf('Category');
    const termIdx = headers.indexOf('Term');

    const events: any[] = [];

    // 3. Helper: Smart parser for date ranges
    function parseDateRange(dateStr: string): { startDate: Date, endDate: Date } {
        const parts = dateStr.replace(/–/g, '-').split('-');
        if (parts.length === 1) {
            const d = new Date(parts[0].trim());
            return { startDate: d, endDate: d };
        }

        const startPart = parts[0].trim();
        const endPart = parts[1].trim();
        const endDate = new Date(endPart);
        let startDate: Date;

        if (/^\d+$/.test(startPart)) {
            const monthYearMatch = endPart.match(/[a-zA-Z]+\s+\d{4}$/);
            if (monthYearMatch) {
                startDate = new Date(`${startPart} ${monthYearMatch[0]}`);
            } else {
                startDate = new Date(endPart);
                startDate.setDate(parseInt(startPart, 10));
            }
        } else if (/^\d+\s+[a-zA-Z]+$/.test(startPart) || /^[a-zA-Z]+\s+\d+$/.test(startPart)) {
            const yearMatch = endPart.match(/\d{4}$/);
            const year = yearMatch ? yearMatch[0] : new Date().getFullYear();
            startDate = new Date(`${startPart} ${year}`);
        } else {
            startDate = new Date(startPart);
        }

        return { startDate, endDate };
    }

    // 4. Read all events from the table
    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const row = rawData[i] as any[];
        if (!row || row.length === 0) continue;

        const dateStr = String(row[dateIdx] || '').trim();
        const eventName = String(row[eventIdx] || '').trim();
        const category = String(row[catIdx] || '').trim();
        const term = String(row[termIdx] || '').trim();

        if (!dateStr || !eventName || dateStr === 'Date') continue;

        try {
            const { startDate, endDate } = parseDateRange(dateStr);
            if (!isNaN(startDate.getTime())) {
                events.push({ startDate, endDate, name: eventName, category, term });
            }
        } catch (e) {
            console.warn(`Could not parse date row: ${dateStr}`);
        }
    }

    // 5. Separate by Term and calculate boundaries
    const term1Events = events.filter(e => e.term === 'Term 1');
    const term2Events = events.filter(e => e.term === 'Term 2');

    const t1Start = new Date(Math.min(...term1Events.map(e => e.startDate.getTime())));
    const t1End = new Date(Math.max(...term1Events.map(e => e.endDate.getTime())));
    const t2Start = new Date(Math.min(...term2Events.map(e => e.startDate.getTime())));
    const t2End = new Date(Math.max(...term2Events.map(e => e.endDate.getTime())));

    // 6. Gather ALL Events (Holidays, Breaks, and Academic)
    // By including Academic events, "Exam Weeks" will correctly be treated as 
    // non-teaching blocks, bringing the week count down to exactly 17.
    const allBreaks = events.map(e => ({
        name: e.name,
        startDate: e.startDate,
        endDate: e.endDate
    }));

    const breaks1 = allBreaks.filter(b => b.startDate <= t1End);
    const breaks2 = allBreaks.filter(b => b.startDate >= t2Start);

    // 7. Helper: Algorithmically generate weeks (skipping full-week events)
    function generateWeeks(termStart: Date, termEnd: Date, breaks: any[]) {
        const weeks = [];
        let current = new Date(termStart);

        current.setDate(current.getDate() - current.getDay()); // Start on Sunday

        let weekNo = 1;
        while (current <= termEnd) {
            let weekEnd = new Date(current);
            weekEnd.setDate(weekEnd.getDate() + 4); // Thursday

            // Check if this entire Sun-Thu week is completely swallowed by an event
            let isBreakWeek = false;
            for (const b of breaks) {
                if (current >= b.startDate && weekEnd <= b.endDate) {
                    isBreakWeek = true;
                    break;
                }
            }

            if (!isBreakWeek) {
                weeks.push({
                    weekNo: weekNo++,
                    startDate: new Date(current),
                    endDate: new Date(weekEnd)
                });
            }
            current.setDate(current.getDate() + 7);
        }
        return weeks;
    }

    const t1Weeks = generateWeeks(t1Start, t1End, breaks1);
    const t2Weeks = generateWeeks(t2Start, t2End, breaks2);

    return {
        name: `${t1Start.getFullYear()}-${t2End.getFullYear()}`,
        startDate: t1Start,
        endDate: t2End,
        semesters: [
            {
                code: 'T1', name: 'Term 1',
                startDate: t1Start, endDate: t1End,
                weekCount: t1Weeks.length,
                breaks: breaks1,
                weeks: t1Weeks,
            },
            {
                code: 'T2', name: 'Term 2',
                startDate: t2Start, endDate: t2End,
                weekCount: t2Weeks.length,
                breaks: breaks2,
                weeks: t2Weeks,
            },
        ],
    };
}

export async function importAcademicYearXlsx(req: any, res: Response) {
    try {
        if (!req.file) return sendResponse(res, 400, false, 'No file uploaded');
        const parsed = parseAcademicCalendarXlsx(req.file.buffer);

        // 1. Deactivate all currently active academic years
        await AcademicYearModel.updateMany({}, { isActive: false });

        // 2. OVERWRITE if it exists, CREATE if it doesn't (upsert)
        const year = await AcademicYearModel.findOneAndUpdate(
            { name: parsed.name }, // Search criteria (e.g., "2025-2026")
            { ...parsed, isActive: true }, // The new data to save
            { new: true, upsert: true } // 'upsert: true' is the magic that handles the overwrite/create
        );

        // 3. Sync semesters to LookupModel so curriculum/lesson-plan dropdowns work
        const maxSemesterDoc = await LookupModel.findOne({ type: 'SEMESTER' }).sort({ order: -1 }).select('order');
        let semOrder = (maxSemesterDoc?.order || 0) + 1;

        for (const [idx, sem] of parsed.semesters.entries()) {
            const existing = await LookupModel.findOne({ type: 'SEMESTER', code: sem.code });
            if (!existing) {
                await LookupModel.create({ type: 'SEMESTER', code: sem.code, label: sem.name, order: semOrder + idx, isActive: true });
            } else {
                await LookupModel.updateOne({ _id: existing._id }, { label: sem.name, isActive: true });
            }
        }

        return sendResponse(res, 201, true, 'Academic year imported successfully', year);
    } catch (err: any) {
        console.error('XLSX import error:', err);
        return sendResponse(res, 500, false, err.message || 'Import failed');
    }
}

export async function listAcademicYearsHandler(req: Request, res: Response) {
    try {
        const years = await listAcademicYears();
        return sendResponse(res, 200, true, 'Academic years fetched', years);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, 'Internal Server Error');
    }
}

export async function getActiveAcademicYearHandler(req: Request, res: Response) {
    try {
        const year = await getActiveAcademicYear();
        if (!year) return sendResponse(res, 404, false, 'No active academic year configured');
        return sendResponse(res, 200, true, 'Active academic year', year);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, 'Internal Server Error');
    }
}

export async function createAcademicYearHandler(req: AuthRequest, res: Response) {
    try {
        const { name, startDate, endDate, semesters } = req.body;
        if (!name || !startDate || !endDate || !Array.isArray(semesters) || semesters.length === 0) {
            return sendResponse(res, 400, false, 'name, startDate, endDate, and semesters are required');
        }
        const year = await createAcademicYear({ name, startDate, endDate, semesters });
        return sendResponse(res, 201, true, 'Academic year created', year);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, 'Internal Server Error');
    }
}

export async function updateAcademicYearHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const year = await updateAcademicYear(id, req.body);
        if (!year) return sendResponse(res, 404, false, 'Academic year not found');
        return sendResponse(res, 200, true, 'Academic year updated', year);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, 'Internal Server Error');
    }
}

export async function setActiveYearHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const year = await setActiveAcademicYear(id);
        if (!year) return sendResponse(res, 404, false, 'Academic year not found');
        return sendResponse(res, 200, true, 'Active academic year updated', year);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, 'Internal Server Error');
    }
}

export async function getCurrentWeekHandler(req: Request, res: Response) {
    try {
        const year = await getActiveAcademicYear();
        if (!year) return sendResponse(res, 404, false, 'No active academic year configured');
        const result = calculateAcademicWeek(new Date(), year);
        if (!result) return sendResponse(res, 200, true, 'Outside academic year', { weekNo: null, inSession: false });
        return sendResponse(res, 200, true, 'Current academic week', { ...result, inSession: true });
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, 'Internal Server Error');
    }
}