import { RoasterModel } from "../models/roaster.model";
import { lessonPlanModel } from "../models/lessonPlan.model";

// Saudi school week runs Sun → Thu
const DAY_ORDER: Record<string, number> = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5,
};

export async function getTimetable(filters: {
    gradeId?: string;
    section?: string;
    semesterId?: string;
    weekNo?: number;
    teacherId?: string;
}) {
    const rosterQuery: any = { isActive: true };
    if (filters.gradeId)   rosterQuery.gradeId   = filters.gradeId;
    if (filters.section)   rosterQuery.section   = filters.section;
    if (filters.teacherId) rosterQuery.teacherId = filters.teacherId;

    const roster = await RoasterModel.find(rosterQuery)
        .populate('teacherId', 'name email')
        .populate('gradeId', 'label code')
        .populate('subjectId', 'label code')
        .sort({ day: 1, period: 1 });

    if (!roster.length) return { slots: [], grid: {} };

    // Fetch lesson plans for these roster slots for the given week
    const planQuery: any = { isActive: true };
    if (filters.gradeId) planQuery.gradeId = filters.gradeId;
    if (filters.semesterId) planQuery.semesterId = filters.semesterId;
    if (filters.weekNo) planQuery.weekNo = filters.weekNo;

    const plans = await lessonPlanModel.find(planQuery)
        .populate('teacherId', 'name')
        .populate('curriculumId', 'standardCode standardDescription');

    // Build grid: { day: { period: cell[] } }  — array per slot to support multiple sections
    const grid: Record<string, Record<number, any[]>> = {};

    // Pre-build a Map for O(1) plan lookups instead of O(N) Array.find per slot
    const planMap = new Map<string, any>();
    for (const p of plans) {
        const pa = p as any;
        const key = `${pa.gradeId}|${pa.subjectId}|${pa.teacherId?._id ?? pa.teacherId}`;
        if (!planMap.has(key)) planMap.set(key, p);
    }

    for (const slot of roster) {
        const s = slot as any;
        const day = s.day as string;
        const period = s.period as number;

        if (!grid[day]) grid[day] = {};
        if (!grid[day][period]) grid[day][period] = [];

        // O(1) plan lookup via Map
        const planKey = `${s.gradeId?._id}|${s.subjectId?._id}|${s.teacherId?._id}`;
        const plan = planMap.get(planKey) || null;

        grid[day][period].push({
            slotId: s._id,
            teacher: s.teacherId,
            grade: s.gradeId,
            subject: s.subjectId,
            section: s.section,
            startTime: s.startTime,
            endTime: s.endTime,
            plan: plan ? {
                _id: (plan as any)._id,
                topic: (plan as any).topic,
                status: (plan as any).status,
                curriculum: (plan as any).curriculumId,
            } : null,
            complianceStatus: deriveCellStatus(plan, filters.weekNo),
        });
    }

    // Get sorted unique periods and days
    const periods = [...new Set(roster.map((r: any) => r.period as number))].sort((a, b) => a - b);
    const days = Object.keys(grid).sort((a, b) => (DAY_ORDER[a] || 9) - (DAY_ORDER[b] || 9));

    return { grid, periods, days, roster, plans };
}

function deriveCellStatus(plan: any, weekNo?: number): string {
    if (!plan) {
        if (!weekNo) return 'NO_PLAN';
        const currentWeek = getCurrentWeekNo();
        return weekNo < currentWeek ? 'BEHIND' : 'NO_PLAN';
    }
    return plan.status;
}

function getCurrentWeekNo(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}
