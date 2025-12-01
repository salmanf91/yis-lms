import { Schema, model, Document, Types } from "mongoose";

export type lessonPlanStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface lessonPlanDocument extends Document {
    curriculumId: Types.ObjectId;
    teacherId: Types.ObjectId;

    gradeId: Types.ObjectId;
    subjectId: Types.ObjectId;
    semesterId: Types.ObjectId;
    weekNo: number;

    topic: string;
    resource: string;
    assessment: string;

    status: lessonPlanStatus;
    submittedAt?: Date;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    reviewComments?: string;

    isActive: boolean;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
} 

const lessonPlanSchema = new Schema<lessonPlanDocument> (
    {
        curriculumId: { type: Schema.Types.ObjectId, ref: "Curriculum", required: true },
        teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },

        gradeId: { type: Schema.Types.ObjectId, ref: "Lookup", required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: "Lookup", required: true },
        semesterId: { type: Schema.Types.ObjectId, ref: "Lookup", required: true },
        weekNo: { type: Number, required: true },

        topic: { type: String, required: true },
        resource: { type: String },
        assessment: { type: String },

        status: { type: String, enum: ["DRAFT" , "SUBMITTED", "APPROVED", "REJECTED"], default: "DRAFT" },
        submittedAt: Date,
        reviewedBy: { type: Schema.Types.ObjectId, ref:"User" },
        reviewedAt: Date,
        reviewComments: String,

        isActive: { type: Boolean, default: true },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    {
        timestamps: true
    }
);

export const lessonPlanModel = model<lessonPlanDocument>("LessonPlan", lessonPlanSchema); 