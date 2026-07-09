import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { getTimetable } from "../services/timetable.service";

/**
 * GET /api/timetable
 * Query: gradeId?, section?, semesterId?, weekNo?
 * Returns assembled timetable grid from roster + lesson plans
 */
export async function getTimetableHandler(req: Request, res: Response) {
    try {
        const { gradeId, section, semesterId, weekNo, teacherId } = req.query;

        const data = await getTimetable({
            gradeId:   gradeId   as string | undefined,
            section:   section   as string | undefined,
            semesterId: semesterId as string | undefined,
            weekNo:    weekNo    ? Number(weekNo) : undefined,
            teacherId: teacherId as string | undefined,
        });

        return sendResponse(res, 200, true, "Timetable fetched", data);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}
