import { RoasterModel } from "../models/roaster.model";

export async function createRoasterEntry (data: any) {
    return RoasterModel.create(data);
}

export async function listRoaster(filters: any, page = 1, limit = 50) {
    const { page: _p, limit: _l, ...query } = filters;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        RoasterModel
            .find({ isActive: true, ...query })
            .populate("teacherId", "name email role department")
            .populate("gradeId", "label code")
            .populate("subjectId", "label code")
            .sort({ day: 1, period: 1 })
            .skip(skip)
            .limit(limit),
        RoasterModel.countDocuments({ isActive: true, ...query }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function updateRoaster(id: string, data: any) {
    return RoasterModel.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteRoaster(id: string) {
    return RoasterModel.findByIdAndDelete(id);
}

export async function deactivateRoaster(id: string) {
    return RoasterModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
}
