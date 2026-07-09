import { AcademicYearModel } from '../models/academicYear.model';

export async function getActiveAcademicYear() {
    return AcademicYearModel.findOne({ isActive: true }).sort({ createdAt: -1 });
}

export async function listAcademicYears() {
    return AcademicYearModel.find().sort({ createdAt: -1 });
}

export async function createAcademicYear(data: any) {
    await AcademicYearModel.updateMany({}, { isActive: false });
    return AcademicYearModel.create({ ...data, isActive: true });
}

export async function updateAcademicYear(id: string, data: any) {
    return AcademicYearModel.findByIdAndUpdate(id, data, { new: true });
}

export async function setActiveAcademicYear(id: string) {
    await AcademicYearModel.updateMany({}, { isActive: false });
    return AcademicYearModel.findByIdAndUpdate(id, { isActive: true }, { new: true });
}

/**
 * Find the academic week that contains `date`.
 *
 * Week date ranges are stored directly from the Excel (col C = Sunday start,
 * col G = Thursday end), so this is a plain lookup — no Monday counting,
 * no break arithmetic.
 *
 * If `date` falls in a break or a weekend between two weeks, we return the
 * most recently completed week so dashboards always show a meaningful number.
 */
export function calculateAcademicWeek(
    date: Date,
    academicYear: any,
): { weekNo: number; semesterCode: string; semesterName: string } | null {

    // Use noon to avoid any DST / midnight UTC-offset edge cases
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);

    for (const sem of academicYear.semesters) {
        const weeks: any[] = [...(sem.weeks || [])].sort((a, b) => a.weekNo - b.weekNo);
        if (!weeks.length) continue;

        const semStart = new Date(weeks[0].startDate);           semStart.setHours(0, 0, 0, 0);
        const semEnd   = new Date(weeks[weeks.length - 1].endDate); semEnd.setHours(23, 59, 59, 999);

        if (d < semStart || d > semEnd) continue;

        // 1. Exact match — today is inside a teaching week
        for (const w of weeks) {
            const ws = new Date(w.startDate); ws.setHours(0, 0, 0, 0);
            const we = new Date(w.endDate);   we.setHours(23, 59, 59, 999);
            if (d >= ws && d <= we) {
                return { weekNo: w.weekNo, semesterCode: sem.code, semesterName: sem.name };
            }
        }

        // 2. Today is between weeks (break / Friday-Saturday gap)
        //    Return the most recently completed week
        let last = weeks[0];
        for (const w of weeks) {
            const we = new Date(w.endDate); we.setHours(23, 59, 59, 999);
            if (we <= d) last = w;
        }
        return { weekNo: last.weekNo, semesterCode: sem.code, semesterName: sem.name };
    }

    return null; // outside all semesters
}
