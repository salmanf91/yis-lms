import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { createLookup, listLookup, updateLookUp, deleteLookup } from "../services/lookup.service";
import { LookupModel, LookupType } from "../models/lookup.model";

/**
 * POST /api/lookup
 * Body: { type: "GRADE" | "SUBJECT" | "SEMESTER", code, label, order? }
 */
export async function createLookupHandler(req: Request, res: Response) {
    try {
        const { type, code, label, order } = req.body;

        if( !type || !code || !label ) {
            return sendResponse(res, 400, false, "Type, code and label fields are required")
        }

        if(!["GRADE", "SUBJECT", "SEMESTER"].includes(type)) {
            return sendResponse(res, 400, false, "Invalid Type")
        }

        const item = await createLookup({ type, code, label, order});
        return sendResponse(res, 201, true, "Lookup item created successfully", item);

    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

/**
 * GET /api/master-config/:type
 * :type = GRADE | SUBJECT | SEMESTER
 */
export async function listLookupHandler(req: Request, res: Response) {
    try {
        const type = req.params.type as LookupType

        if(!["GRADE", "SUBJECT", "SEMESTER"].includes(type)) {
            return sendResponse(res, 400, false, "Invalid Type")
        }

        const items = await listLookup(type);
        return sendResponse(res, 200, true, "Lookup List", items)

    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * PUT /api/master-config/:id
 */
export async function updateLookupHandler(req: Request, res:Response) {
    try{
        const { id } = req.params;

        const updated = await updateLookUp(id, req.body);
        if(!updated) {
            return sendResponse(res, 404, false, "Lookup item not found")
        }
        return sendResponse(res, 200, true, "Lookup item updated", updated )
    }catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

/**
 * DELETE /api/master-config/:id
 */
export async function deleteLookupHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const deleted =  await deleteLookup(id);
        if(!deleted) {
            return sendResponse(res, 404, false, "Lookup item not found")
        }
        return sendResponse(res, 200, true, "Lookup item deleted")
    }catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

export async function getAllLookupHandler(req: Request, res: Response) {
    try {
        const [grades, subjects, semesters] = await Promise.all([
            LookupModel.find({type: "GRADE"}).sort({ order: 1, label: 1}),
            LookupModel.find({type: "SUBJECT"}).sort({label: 1}),
            LookupModel.find({type: "SEMESTER"}).sort({ order: 1, label: 1}),
        ])

        return sendResponse(res, 200, true, "All lookup data", {
            grades, subjects, semesters
        });
    } catch (error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}