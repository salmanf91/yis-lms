import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { AuthRequest } from "../middleware/auth.middleware";
import {
    createLessonPlan,
    listLessonPlan,
    getLessonPlanById,
    updateLessonPlan,
    submitLessonPlan,
    approveLessonPlan,
    rejectLessonPlan,
    deactivateLessonPlan,
    bulkImportWeeklyPlans
} from "../services/lessonPlan.service";

export async function createLessonPlanHandler(req: AuthRequest, res: Response) {
    try {
        const teacherId = req.user!.userId
        console.log("req body", req.body);
        const plan = await createLessonPlan(teacherId, req.body);
        if(!plan) {
            return sendResponse(res, 400, false, "Invalid Curriculum Id")
        }
        return sendResponse(res, 201, true, "Lesson plan created", plan)
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function listLessonPlanHandler(req: AuthRequest, res: Response) {
    try {
        const data = await listLessonPlan(req.query, req.user);
        return sendResponse(res, 200, true, "Lesson plans fetched", data);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function getlessonPlanHandler(req: AuthRequest, res: Response) {
    try {
        const plan = await getLessonPlanById(req.params.id);
        if(!plan) {
            return sendResponse(res, 404, false, "Lesson plan not found");
        }
        return sendResponse(res, 200, true, "Lesson Plan fetched", plan);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function updateLessonPlanHandler(req: AuthRequest, res: Response) {
    try {
        const teacherId = req.user!.userId;
        const updated = await updateLessonPlan(req.params.id, teacherId, req.body);

        if(updated === null) return sendResponse(res, 404, false, "Not found");
        if(updated === "FORBIDDEN") return sendResponse(res, 403, false, "Not your plan");
        if(updated === "NOT_ALLOWED") return sendResponse(res, 400, false, "Can't edit after submission");

        return sendResponse(res, 200, true, "Lesson plan updated", updated);
    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

export async function submitLessonPlanHandler(req: AuthRequest, res: Response ) {
    try {
        const teacherId = req.user!.userId;
        const result = await submitLessonPlan(req.params.id, teacherId);

        if(result === null) return sendResponse(res, 404, false, "Not found");
        if(result === "FORBIDDEN") return sendResponse(res, 403, false, "Not your plan");
        if(result === "NOT_ALLOWED") return sendResponse(res, 400, false, "Can't submit this plan");

        return sendResponse(res, 200, true, "Lesson plan submitted", result);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

export async function approveLessonHandler(req: AuthRequest, res: Response) {
    try {
        const hodId = req.user!.userId;
        const result = await approveLessonPlan(req.params.id, hodId, req.body.comments)

        if(result === null) return sendResponse(res, 404, false, "Not Found");
        if(result === "NOT_ALLOWED") return sendResponse(res, 400, false, "Only Submitted plan can be approved");
        
        return sendResponse(res, 200, true, "Lesson plan Approved", result);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function rejectLessonPlanHandler(req: AuthRequest, res: Response) {
    try {
        const hodId = req.user!.userId;
        const result = await rejectLessonPlan(req.params.id, hodId, req.body.comments)

        if(result === null) return sendResponse(res, 404, false, "Not Found");
        if(result === "NOT_ALLOWED") return sendResponse(res, 400, false, "Only submitted plans can be rejected");

        return sendResponse(res, 200, true, "Lesson Plan Rejected", result);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

export async function deactivateLessonPlanHandler(req: AuthRequest, res: Response) {
    try {
        const deactivated = await deactivateLessonPlan(req.params.id);
        if(!deactivated) {
            return sendResponse(res, 404, false, "Not Found");
        }
        return sendResponse(res, 200, true, "Lesson plan deactivated", deactivated);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * POST /api/lesson-plans/import
 * Admin: bulk-import weekly plan data from Master_DB Excel
 */
export async function importWeeklyPlansHandler(req: AuthRequest, res: Response) {
    try {
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return sendResponse(res, 400, false, "rows array is required");
        }
        const required = ['gradeLabel','subjectLabel','semesterLabel','weekNo'];
        for (const [i, row] of rows.entries()) {
            for (const field of required) {
                if (!row[field]) return sendResponse(res, 400, false, `Row ${i + 1}: missing field "${field}"`);
            }
            // At least one content field must be present
            if (!row.topic && !row.resource && !row.assessment) {
                return sendResponse(res, 400, false, `Row ${i + 1}: must have at least one of topic, resource, or assessment`);
            }
        }
        const result = await bulkImportWeeklyPlans(rows, req.user!.userId);
        return sendResponse(res, 201, true,
            `Import complete: ${result.created} lesson plan entries created/updated, ${result.skipped} skipped`,
            result
        );
    } catch (err: any) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}