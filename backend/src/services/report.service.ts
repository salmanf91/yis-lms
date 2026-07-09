import { lessonPlanModel } from "../models/lessonPlan.model";
import { CurriculumModel } from "../models/curriculum.model";
import { RoasterModel } from "../models/roaster.model";
import { UserModel } from "../models/user.model";

function getCurrentWeekNo(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Admin summary dashboard stats
 */
export async function getAdminSummary() {
    const currentWeek = getCurrentWeekNo();

    const [
        totalUsers,
        totalCurriculum,
        totalRoster,
        plansByStatus,
        weekPlans,
    ] = await Promise.all([
        UserModel.countDocuments({ isActive: true }),
        CurriculumModel.countDocuments({ isActive: true }),
        RoasterModel.countDocuments({ isActive: true }),
        lessonPlanModel.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        lessonPlanModel.countDocuments({ isActive: true, weekNo: currentWeek }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const s of plansByStatus) statusCounts[s._id] = s.count;

    return {
        totalUsers,
        totalCurriculum,
        totalRoster,
        currentWeek,
        weekPlans,
        plansByStatus: statusCounts,
    };
}

/**
 * Curriculum coverage: each curriculum entry matched with its lesson plan status
 */
export async function getCoverageReport(filters: {
    gradeId?: string;
    subjectId?: string;
    semesterId?: string;
    weekFrom?: number;
    weekTo?: number;
}) {
    const cQuery: any = { isActive: true };
    if (filters.gradeId) cQuery.gradeId = filters.gradeId;
    if (filters.subjectId) cQuery.subjectId = filters.subjectId;
    if (filters.semesterId) cQuery.semesterId = filters.semesterId;
    if (filters.weekFrom || filters.weekTo) {
        cQuery.weekNo = {};
        if (filters.weekFrom) cQuery.weekNo.$gte = Number(filters.weekFrom);
        if (filters.weekTo) cQuery.weekNo.$lte = Number(filters.weekTo);
    }

    const curriculum = await CurriculumModel.find(cQuery)
        .populate('gradeId', 'label code')
        .populate('subjectId', 'label code')
        .populate('semesterId', 'label code')
        .sort({ weekNo: 1 });

    const currentWeek = getCurrentWeekNo();

    // Batch-fetch all relevant lesson plans in one query (eliminates N+1)
    const planMatchQuery: any = { isActive: true };
    if (filters.gradeId) planMatchQuery.gradeId = filters.gradeId;
    if (filters.subjectId) planMatchQuery.subjectId = filters.subjectId;
    if (filters.semesterId) planMatchQuery.semesterId = filters.semesterId;
    if (filters.weekFrom || filters.weekTo) {
        planMatchQuery.weekNo = {};
        if (filters.weekFrom) planMatchQuery.weekNo.$gte = Number(filters.weekFrom);
        if (filters.weekTo) planMatchQuery.weekNo.$lte = Number(filters.weekTo);
    }

    const allPlans = await lessonPlanModel.find(planMatchQuery)
        .populate('teacherId', 'name')
        .lean();

    // Build a lookup Map keyed by "gradeId|subjectId|semesterId|weekNo"
    const planMap = new Map<string, any>();
    for (const p of allPlans) {
        const key = `${p.gradeId}|${p.subjectId}|${p.semesterId}|${p.weekNo}`;
        // Keep the first (or APPROVED one) if duplicates exist
        if (!planMap.has(key) || p.status === 'APPROVED') {
            planMap.set(key, p);
        }
    }

    const rows = curriculum.map((c) => {
        const ca = c as any;
        const key = `${ca.gradeId?._id}|${ca.subjectId?._id}|${ca.semesterId?._id}|${ca.weekNo}`;
        const plan = planMap.get(key) || null;

        const planStatus = plan
            ? plan.status
            : ca.weekNo < currentWeek ? 'MISSING' : 'NO_PLAN';

        return {
            curriculumId: ca._id,
            weekNo: ca.weekNo,
            standardCode: ca.standardCode,
            grade: ca.gradeId,
            subject: ca.subjectId,
            semester: ca.semesterId,
            planStatus,
            planId: plan ? plan._id : null,
            planTopic: plan ? plan.topic : null,
            teacher: plan ? plan.teacherId : null,
        };
    });

    return rows;
}

/**
 * Per-teacher compliance: how many of their roster slots have an approved plan this week/semester
 */
export async function getComplianceReport(filters: {
    semesterId?: string;
    gradeId?: string;
    weekNo?: number;
    department?: string;
}) {
    const currentWeek = filters.weekNo || getCurrentWeekNo();

    const rosterQuery: any = { isActive: true };
    if (filters.gradeId) rosterQuery.gradeId = filters.gradeId;

    // Department filter: resolve to teacher IDs first
    if (filters.department) {
        const deptTeachers = await (await import('../models/user.model')).UserModel
            .find({ department: filters.department, isActive: true }).select('_id').lean();
        rosterQuery.teacherId = { $in: deptTeachers.map((t: any) => t._id) };
    }

    const roster = await RoasterModel.find(rosterQuery)
        .populate('teacherId', 'name email department')
        .populate('gradeId', 'label')
        .populate('subjectId', 'label');

    // Group by teacher
    const teacherMap: Record<string, {
        teacher: any;
        slots: any[];
        approvedThisWeek: number;
        totalSlots: number;
    }> = {};

    // Collect all unique teacher + grade + subject combos from roster
    const rosterTeacherIds = [...new Set(
        roster.map((s: any) => s.teacherId?._id?.toString()).filter(Boolean)
    )];

    // Batch-fetch all approved plans for this week (eliminates N+1)
    const approvedPlanQuery: any = {
        teacherId: { $in: rosterTeacherIds },
        weekNo: currentWeek,
        status: 'APPROVED',
        isActive: true,
    };
    if (filters.semesterId) approvedPlanQuery.semesterId = filters.semesterId;
    if (filters.gradeId) approvedPlanQuery.gradeId = filters.gradeId;

    const approvedPlans = await lessonPlanModel.find(approvedPlanQuery).lean();

    // Build a Set of "teacherId|gradeId|subjectId" for O(1) lookup
    const approvedSet = new Set<string>(
        approvedPlans.map(p => `${p.teacherId}|${p.gradeId}|${p.subjectId}`)
    );

    for (const slot of roster) {
        const s = slot as any;
        const tid = s.teacherId?._id?.toString();
        if (!tid) continue;

        if (!teacherMap[tid]) {
            teacherMap[tid] = {
                teacher: s.teacherId,
                slots: [],
                approvedThisWeek: 0,
                totalSlots: 0,
            };
        }
        teacherMap[tid].slots.push(s);
        teacherMap[tid].totalSlots += 1;

        const lookupKey = `${s.teacherId?._id}|${s.gradeId?._id}|${s.subjectId?._id}`;
        if (approvedSet.has(lookupKey)) teacherMap[tid].approvedThisWeek += 1;
    }

    return Object.values(teacherMap).map(t => ({
        teacher: t.teacher,
        totalSlots: t.totalSlots,
        approvedThisWeek: t.approvedThisWeek,
        complianceRate: t.totalSlots > 0
            ? Math.round((t.approvedThisWeek / t.totalSlots) * 100)
            : 0,
        weekNo: currentWeek,
    }));
}

/**
 * HOD summary
 */
export async function getHodSummary(hodId: string) {
    const currentWeek = getCurrentWeekNo();

    const [submitted, approved, rejected, totalPlans] = await Promise.all([
        lessonPlanModel.countDocuments({ status: 'SUBMITTED', isActive: true }),
        lessonPlanModel.countDocuments({ status: 'APPROVED', reviewedBy: hodId, isActive: true }),
        lessonPlanModel.countDocuments({ status: 'REJECTED', reviewedBy: hodId, isActive: true }),
        lessonPlanModel.countDocuments({ isActive: true }),
    ]);

    return { submitted, approved, rejected, totalPlans, currentWeek };
}
