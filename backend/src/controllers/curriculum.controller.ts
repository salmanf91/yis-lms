import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { createCurriculum, listCurriculum, updateCurriculum, getCurriculumById, decactivateCurriculum, deleteCurriculum } from "../services/curriculum.service";

/**
 * POST /api/curriculum
 * Admin: create curriculum row
 */
export async function createCurriculumHandler( req: Request, res: Response) {
    try {
        const {
            gradeId, 
            subjectId, 
            semesterId, 
            weekNo, 
            standardCode, 
            standardDescription,
            skills,
            input,
            process,
            outcome
        } = req.body ;

        if (!gradeId || 
            !subjectId || 
            !semesterId || 
            !weekNo || 
            !standardCode || 
            !standardDescription || 
            !skills || 
            !input ||
            !process ||
            !outcome 
        ) {
            return sendResponse(res, 400, false, "All fields are required")
        }

        const curriculum = await createCurriculum({
            gradeId, 
            subjectId,
            semesterId,
            weekNo,
            standardCode,
            standardDescription,
            skills,
            input,
            process,
            outcome
        });

        return sendResponse(res, 201, true, "Curriculum created successfully", curriculum)
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

/**
 * GET /api/curriculum
 * Query: gradeId?, subjectId?, semesterId?, weekNo?
 */
export async function listCurriculumHandler(req: Request, res: Response) {
    try {
        const { gradeId, subjectId, semesterId, weekNo } = req.query;

        const data = await listCurriculum({
            gradeId: gradeId as string | undefined,
            subjectId: subjectId as string | undefined,
            semesterId: semesterId as string | undefined,
            weekNo: weekNo ? Number(weekNo) : undefined
        });

        return sendResponse(res, 200, true, "Curriculum list", data)
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * GET /api/curriculum/:id
 */
export async function getCurriculumByIdHandler(req: Request, res: Response) {
    try {
         const { id } = req. params;
         const data = await getCurriculumById(id);
         if(!data) {
            return sendResponse(res, 404, false, "Curriculum not found");
         }
         return sendResponse(res, 200, true, "Curriculum details", data)
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * PUT /api/curriculum/:id
 */
export async function updateCurriculumHandler(req: Request, res: Response){
    try {
        const { id } = req.params;
        const updated = await updateCurriculum(id, req.body);
        if(!updated) {
            return sendResponse(res, 404, false, "Curriculum not found")
        }
        return sendResponse(res, 200, true, "Curriculum Updated", updated)
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * DELETE /api/curriculum/:id
 */
export async function deleteCurriculumHandler(req: Request, res: Response) {
    try{
        const { id } = req.params;
        const deleted = await deleteCurriculum(id);
        if(!deleted) {
            return sendResponse(res, 404, false, "Curriculum not found");
        }
        return sendResponse(res, 200, true, "Curriculum deleted Successfully", deleted)
    }catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

export async function decactivateCurriculumHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const deactivate = await decactivateCurriculum(id);
        if(!deactivate) {
            return sendResponse(res, 404, false, "Curriculum not found");
        }
        return sendResponse(res, 200, true, "Curriculum deactivated", deactivate);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}
    