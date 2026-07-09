import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { sendResponse } from "../utils/sendResponse";
import {
    getAdminSummary,
    getCoverageReport,
    getComplianceReport,
    getHodSummary,
} from "../services/report.service";

/**
 * GET /api/reports/summary
 * Admin: overall system stats
 */
export async function summaryHandler(req: Request, res: Response) {
    try {
        const data = await getAdminSummary();
        return sendResponse(res, 200, true, "Summary fetched", data);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * GET /api/reports/coverage
 * Query: gradeId?, subjectId?, semesterId?, weekFrom?, weekTo?
 */
export async function coverageHandler(req: Request, res: Response) {
    try {
        const { gradeId, subjectId, semesterId, weekFrom, weekTo } = req.query;
        const data = await getCoverageReport({
            gradeId: gradeId as string | undefined,
            subjectId: subjectId as string | undefined,
            semesterId: semesterId as string | undefined,
            weekFrom: weekFrom ? Number(weekFrom) : undefined,
            weekTo: weekTo ? Number(weekTo) : undefined,
        });
        return sendResponse(res, 200, true, "Coverage report fetched", data);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * GET /api/reports/compliance
 * Query: semesterId?, gradeId?, weekNo?
 */
export async function complianceHandler(req: Request, res: Response) {
    try {
        const { semesterId, gradeId, weekNo } = req.query;
        const data = await getComplianceReport({
            semesterId: semesterId as string | undefined,
            gradeId: gradeId as string | undefined,
            weekNo: weekNo ? Number(weekNo) : undefined,
        });
        return sendResponse(res, 200, true, "Compliance report fetched", data);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * GET /api/reports/hod-summary
 * HOD: their review stats
 */
export async function hodSummaryHandler(req: AuthRequest, res: Response) {
    try {
        const hodId = req.user!.userId;
        const data = await getHodSummary(hodId);
        return sendResponse(res, 200, true, "HOD summary fetched", data);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}
