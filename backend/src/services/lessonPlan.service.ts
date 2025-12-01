import { Schema, Types } from "mongoose";
import { lessonPlanModel } from "../models/lessonPlan.model";
import { CurriculumModel } from "../models/curriculum.model";

export interface createLessonPlanInput {
    curriculumId: string;
    topic: string;
    resource?: string;
    assessment?: string;
}

export async function createLessonPlan(teacherId: string, input: createLessonPlanInput) {
    console.log("teacher id : ", teacherId)
    const curriculum = await CurriculumModel.findById(input.curriculumId)
    if(!curriculum) return null;

    console.log("curriculum id " ,input.curriculumId);
    const plan = await lessonPlanModel.create({
        curriculumId: curriculum._id,
        teacherId: new Types.ObjectId(teacherId),

        gradeId: curriculum.gradeId,
        subjectId: curriculum.subjectId,
        semesterId: curriculum.semesterId,
        weekNo: curriculum.weekNo,

        topic: input.topic,
        resource: input.resource,
        assessment: input.assessment,

        status: "DRAFT",
        isActive: true,
        createdBy: new Types.ObjectId(teacherId),
        updatedBy: new Types.ObjectId(teacherId),
    })

    return plan;
}

export async function listLessonPlan(filters: any, user: any) {
    const query: any = { isActive: true };

    if(filters.gradeId) query.gradeId = filters.gradeId;
    if(filters.subjectId) query.subjectId = filters.subjectId;
    if(filters.semesterId) query.semesterId = filters.semesterId;
    if(filters.weekNo) query.weekNo = filters.weekNo;
    if(filters.status) query.status = filters.status;

    if(user.role == "TEACHER") query.teacherId = user.userId;

    return lessonPlanModel.find(query)
    .populate("curriculumId")
    .populate("teacherId")
    .populate("gradeId")
    .populate("subjectId")
    .populate("semesterId")
    .sort({ weekNo: 1, createdAt: 1});
}

export async function getLessonPlanById(id: string) {
    return lessonPlanModel.findById(id)
    .populate("curriculumId")
    .populate("teacherId")
    .populate("gradeId")
    .populate("subjectId")
    .populate("semesterId");
}

export async function updateLessonPlan(id: string, teacherId: string, data: any) {
    const plan = await lessonPlanModel.findById(id);

    if(!plan) return null;

    if(plan.teacherId.toString() !== teacherId) return "FORBIDDEN";
    if(plan.status !== "DRAFT" && plan.status !== "REJECTED") return "NOT_ALLOWED";
    
    Object.assign(plan, data);

    plan.updatedBy = new Types.ObjectId(teacherId);
    await plan.save();
    return plan;
}

export async function submitLessonPlan(id: string, teacherId: string) {
    const plan = await lessonPlanModel.findById(id);
    if(!plan) return null;

    if (plan.teacherId.toString() !== teacherId) return "FORBIDDEN";
    if (plan.status !== "DRAFT" && plan.status !== "REJECTED") return "NOT_ALLOWED";

    plan.status = "SUBMITTED";
    plan.submittedAt = new Date();
    await plan.save();

    return plan;
}

export async function approveLessonPlan(id: string, hodId: string, comments?: string) {
    const plan = await lessonPlanModel.findById(id);
    if(!plan) return null;

    if(plan.status !== "SUBMITTED") return "NOT_ALLOWED";

    plan.status = "APPROVED";
    plan.reviewedBy = new Types.ObjectId(hodId);
    plan.reviewedAt = new Date();
    plan.reviewComments = comments;

    await plan.save();
    return plan;
}

export async function rejectLessonPlan(id: string, hodId: string, comments?: string) {
    const plan = await lessonPlanModel.findById(id);
    if(!plan) return null;

    if(plan.status !== "SUBMITTED") return "NOT_ALLOWED";

    plan.status = "REJECTED";
    plan.reviewedBy = new Types.ObjectId(hodId);
    plan.reviewedAt = new Date();
    plan.reviewComments = comments;

    await plan.save();
    return plan;
}

export async function deactivateLessonPlan(id: string) {
    return lessonPlanModel.findByIdAndUpdate(id, {isActive: false }, { new: true })
}