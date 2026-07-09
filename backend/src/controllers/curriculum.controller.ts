import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { createCurriculum, listCurriculum, updateCurriculum, getCurriculumById, decactivateCurriculum, deleteCurriculum, bulkCreateCurriculum, validateBulkCurriculum, bulkUpdateStandard, bulkDeactivateStandard, bulkDeleteStandard, reactivateCurriculum, bulkReactivateStandard } from "../services/curriculum.service";

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
        const { gradeId, subjectId, semesterId, weekNo, isActive, page, limit } = req.query;

        const data = await listCurriculum({
            gradeId: gradeId as string | undefined,
            subjectId: subjectId as string | undefined,
            semesterId: semesterId as string | undefined,
            weekNo: weekNo ? Number(weekNo) : undefined,
            isActive: isActive as string | undefined,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
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

/**
 * POST /api/curriculum/bulk
 * Admin: bulk-create curriculum rows from parsed Excel
 */
export async function bulkCreateCurriculumHandler(req: Request, res: Response) {
    try {
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return sendResponse(res, 400, false, "rows array is required");
        }
        const required = ['gradeId','subjectId','semesterId','weekNo','standardCode','standardDescription','skills','input','process','outcome'];
        for (const [i, row] of rows.entries()) {
            for (const field of required) {
                if (!row[field]) return sendResponse(res, 400, false, `Row ${i + 1}: missing field "${field}"`);
            }
        }
        const result = await bulkCreateCurriculum(rows);
        return sendResponse(res, 201, true, `${result.length} curriculum entries imported`, { count: result.length });
    } catch (err: any) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function validateBulkCurriculumHandler(req: Request, res: Response) {
    try {
        const { rows } = req.body;
        if (!Array.isArray(rows)) {
            return sendResponse(res, 400, false, "rows array is required");
        }
        if (rows.length === 0) {
            return sendResponse(res, 200, true, "Validation complete", { duplicates: [], valid: [] });
        }
        const required = ['gradeId','subjectId','semesterId','weekNo','standardCode'];
        for (const [i, row] of rows.entries()) {
            for (const field of required) {
                if (!row[field]) return sendResponse(res, 400, false, `Row ${i + 1}: missing field "${field}"`);
            }
        }
        const result = await validateBulkCurriculum(rows);
        return sendResponse(res, 200, true, "Validation complete", result);
    } catch (err: any) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
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

export async function bulkUpdateStandardHandler(req: Request, res: Response) {
    try {
        const { gradeId, subjectId, semesterId, oldCode, newCode, newDescription } = req.body;
        if (!gradeId || !subjectId || !semesterId || !oldCode || !newCode || !newDescription) {
            return sendResponse(res, 400, false, "All fields are required");
        }

        const result = await bulkUpdateStandard(
            { gradeId, subjectId, semesterId, standardCode: oldCode },
            { standardCode: newCode, standardDescription: newDescription }
        );

        return sendResponse(res, 200, true, "Standard updated successfully in bulk", result);
    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function bulkDeactivateStandardHandler(req: Request, res: Response) {
    try {
        const { gradeId, subjectId, semesterId, standardCode } = req.body;
        if (!gradeId || !subjectId || !semesterId || !standardCode) {
            return sendResponse(res, 400, false, "All fields are required");
        }

        const result = await bulkDeactivateStandard({ gradeId, subjectId, semesterId, standardCode });
        return sendResponse(res, 200, true, "Standard deactivated successfully in bulk", result);
    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function bulkDeleteStandardHandler(req: Request, res: Response) {
    try {
        const { gradeId, subjectId, semesterId, standardCode } = req.body;
        if (!gradeId || !subjectId || !semesterId || !standardCode) {
            return sendResponse(res, 400, false, "All fields are required");
        }

        const result = await bulkDeleteStandard({ gradeId, subjectId, semesterId, standardCode });
        return sendResponse(res, 200, true, "Standard deleted successfully in bulk", result);
    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function reactivateCurriculumHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const reactivate = await reactivateCurriculum(id);
        if (!reactivate) {
            return sendResponse(res, 404, false, "Curriculum not found");
        }
        return sendResponse(res, 200, true, "Curriculum reactivated", reactivate);
    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function bulkReactivateStandardHandler(req: Request, res: Response) {
    try {
        const { gradeId, subjectId, semesterId, standardCode } = req.body;
        if (!gradeId || !subjectId || !semesterId || !standardCode) {
            return sendResponse(res, 400, false, "All fields are required");
        }

        const result = await bulkReactivateStandard({ gradeId, subjectId, semesterId, standardCode });
        return sendResponse(res, 200, true, "Standard reactivated successfully in bulk", result);
    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}
    