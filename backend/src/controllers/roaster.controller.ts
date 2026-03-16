import { Request, Response } from "express";
import { sendResponse } from "../utils/sendResponse";
import { createRoasterEntry, listRoaster, updateRoaster, deleteRoaster, deactivateRoaster } from "../services/roaster.service";
import { isValidObjectId } from "mongoose";
import { UserModel } from "../models/user.model";
import { LookupModel } from "../models/lookup.model";

export async function createRoasterHandler(req: Request, res: Response) {
    try{
        const { teacherId, gradeId, subjectId, section, day, period, startTime, endTime } = req.body;
        if(!teacherId || !gradeId || !subjectId || !section || !day || !period || !startTime || !endTime ){
            return sendResponse(res, 400, false, "All fields are required");
        }

        if(!isValidObjectId(teacherId) || !isValidObjectId(gradeId) || !isValidObjectId(subjectId)) {
            return sendResponse(res, 400, false, "Invalid teacherId/gradeIs/subjectId")
        }

        const teacher = await UserModel.findOne({_id: teacherId, isActive: true});
        if(!teacher) {
            return sendResponse(res, 400, false, "Teacher Not found");
        }

        const grade = await LookupModel.findOne({_id: gradeId, isActive: true })
        if(!grade) {
            return sendResponse(res, 400, false, "Invalid gradeId")
        }

        const subject = await LookupModel.findOne({_id: subjectId, isActive: true })
        if(!subject) {
            return sendResponse(res, 400, false, "Invalid subjectId")
        }
        const entry = await createRoasterEntry(req.body);
        return sendResponse(res, 200, true, "roaster entry created", entry);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function listRoasterHandler(req: Request, res: Response) {
    try {
        const data = await listRoaster(req.query);
        return sendResponse(res, 200, true, "Roaster List", data);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function updateRoasterHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const updated = await updateRoaster(id, req.body);
        return sendResponse(res, 200, true, "Roaster Updated", updated);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function deleteRoasterHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        await deleteRoaster(id);
        return sendResponse(res, 200, true, "Roaster Deleted");
    } catch(error){
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

export async function deactivateRoasterHandler(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const deactivated = await deactivateRoaster(id);
        return sendResponse(res, 200, true, "Roaster entry deactivated", deactivated);
    } catch(error) {
        console.error(error);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}