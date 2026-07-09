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
    weekNo?: number;
    isActive?: boolean | string;
    page?: number;
    limit?: number;
}) {
    const query: any = {}

    if (filters.isActive === 'all') {
        // Do not restrict by isActive
    } else if (filters.isActive !== undefined) {
        query.isActive = filters.isActive === 'true' || filters.isActive === true;
    } else {
        query.isActive = true;
    }

    if (filters.gradeId) query.gradeId = filters.gradeId;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    if (filters.semesterId) query.semesterId = filters.semesterId;
    if (filters.weekNo) query.weekNo = filters.weekNo;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(200, filters.limit || 50);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        CurriculumModel.find(query)
            .populate("gradeId")
            .populate("subjectId")
            .populate("semesterId")
            .sort({ weekNo: 1, createdAt: 1 })
            .skip(skip)
            .limit(limit),
        CurriculumModel.countDocuments(query),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

export async function bulkCreateCurriculum(rows: CreateCurriculumInput[]) {
    const bulkOps = rows.map(r => ({
        updateOne: {
            filter: { 
                gradeId: r.gradeId, 
                subjectId: r.subjectId, 
                semesterId: r.semesterId, 
                weekNo: r.weekNo, 
                standardCode: r.standardCode 
            },
            update: { $set: { ...r, isActive: true } },
            upsert: true
        }
    }));

    await CurriculumModel.bulkWrite(bulkOps, { ordered: false });
    return rows;
}

export async function validateBulkCurriculum(rows: CreateCurriculumInput[]) {
    const existing = await CurriculumModel.find({
        $or: rows.map(r => ({
            gradeId: r.gradeId,
            subjectId: r.subjectId,
            semesterId: r.semesterId,
            weekNo: r.weekNo,
            standardCode: r.standardCode
        }))
    }).select('gradeId subjectId semesterId weekNo standardCode').lean();

    const existingSet = new Set(
        existing.map(e => `${e.gradeId}_${e.subjectId}_${e.semesterId}_${e.weekNo}_${e.standardCode}`)
    );

    const duplicates: number[] = [];
    const valid: number[] = [];

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const key = `${r.gradeId}_${r.subjectId}_${r.semesterId}_${r.weekNo}_${r.standardCode}`;
        if (existingSet.has(key)) {
            duplicates.push(i);
        } else {
            valid.push(i);
        }
    }

    return { duplicates, valid };
}

export async function bulkUpdateStandard(
    filter: { gradeId: string; subjectId: string; semesterId: string; standardCode: string },
    data: { standardCode: string; standardDescription: string }
) {
    return CurriculumModel.updateMany(
        {
            gradeId: filter.gradeId,
            subjectId: filter.subjectId,
            semesterId: filter.semesterId,
            standardCode: filter.standardCode
        },
        {
            $set: {
                standardCode: data.standardCode,
                standardDescription: data.standardDescription
            }
        }
    );
}

export async function bulkDeactivateStandard(
    filter: { gradeId: string; subjectId: string; semesterId: string; standardCode: string }
) {
    return CurriculumModel.updateMany(
        {
            gradeId: filter.gradeId,
            subjectId: filter.subjectId,
            semesterId: filter.semesterId,
            standardCode: filter.standardCode,
            isActive: true
        },
        {
            $set: { isActive: false }
        }
    );
}

export async function bulkDeleteStandard(
    filter: { gradeId: string; subjectId: string; semesterId: string; standardCode: string }
) {
    return CurriculumModel.deleteMany({
        gradeId: filter.gradeId,
        subjectId: filter.subjectId,
        semesterId: filter.semesterId,
        standardCode: filter.standardCode
    });
}

export async function reactivateCurriculum(id: string) {
    return CurriculumModel.findByIdAndUpdate(id, { isActive: true }, { new: true });
}

export async function bulkReactivateStandard(
    filter: { gradeId: string; subjectId: string; semesterId: string; standardCode: string }
) {
    return CurriculumModel.updateMany(
        {
            gradeId: filter.gradeId,
            subjectId: filter.subjectId,
            semesterId: filter.semesterId,
            standardCode: filter.standardCode,
            isActive: false
        },
        {
            $set: { isActive: true }
        }
    );
}