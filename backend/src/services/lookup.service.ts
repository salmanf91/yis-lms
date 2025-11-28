import { LookupModel, LookupType } from "../models/lookup.model";

interface CreateLookupInput {
    type: LookupType;
    code: string;
    label: string;
    order?: number;
}

export async function createLookup(data: CreateLookupInput) {
    return LookupModel.create({
        ...data,
        isActive: true
    })
}

export async function listLookup(type: LookupType) {
    return LookupModel.find({ type }).sort({ order: 1, label: 1})
}

export async function updateLookUp(
    id: string, 
    data: Partial<Omit<CreateLookupInput, "type" >> & { isActive?: boolean }
) {
    return LookupModel.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteLookup(id: string) {
    return LookupModel.findByIdAndDelete(id);
}