import { RoasterModel } from "../models/roaster.model";
import { Types } from "mongoose";

export async function createRoasterEntry (data: any) {
    return RoasterModel.create(data);
}

export async function listRoaster(filters: any) {
    return RoasterModel
        .find({isActive: true, ...filters})
        .populate("teacherId")
        .populate("gradeId")
        .populate("subjectId");
} 

export async function updateRoaster(id:string, data: any) {
    return RoasterModel.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteRoaster(id: string) {
    return RoasterModel.findByIdAndDelete(id);
}

export async function deactivateRoaster(id: string) {
    return RoasterModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
}
