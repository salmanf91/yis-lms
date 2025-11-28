import { CurriculumModel } from "../models/curriculum.model";

interface CreateCurriculumInput {
    gradeId: string;
    subjectId: string;
    semesterId: string;
    weekNo: number;

    standardCode: string;
    standardDescription: string;
    skills: string;
    input: string;
    process: string;
    outcome: string;
}

export async function createCurriculum(data:CreateCurriculumInput) {
    return CurriculumModel.create({
        ...data,
        isActive: true
    })
}

export async function listCurriculum(filters: {
    gradeId?: string;
    subjectId?: string;
    semesterId?: string;
    weekNo?: Number;
}) {
    const query: any = { isActive: true }

    if (filters.gradeId) query.gradeId = filters.gradeId;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    if (filters.semesterId) query.semesterId = filters.semesterId;
    if (filters.weekNo) query.weekNo = filters.weekNo;

    return CurriculumModel.find(query)
    .populate("gradeId")
    .populate("subjectId")
    .populate("semesterId")
    .sort({ weekNo: 1, createdAt: 1})
}

export async function getCurriculumById(id: string) {
    return CurriculumModel.findById(id)
    .populate("gradeId")
    .populate("subjectId")
    .populate("semesterId");
}

export async function updateCurriculum(
    id: string,
    data: Partial<CreateCurriculumInput> & { isActive?: boolean }
) {
    return CurriculumModel.findByIdAndUpdate(id, data, { new: true })
}

export async function decactivateCurriculum(id: string) {
    return CurriculumModel.findByIdAndUpdate(id, { isActive: false }, { new: true })
}

export async function deleteCurriculum(id: string) {
    return CurriculumModel.findByIdAndDelete(id);
}