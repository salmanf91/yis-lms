import { Schema, model, Document, Types } from "mongoose";

export interface CurriculumDocument extends Document {
    gradeId: Types.ObjectId;
    subjectId: Types.ObjectId;
    semesterId: Types.ObjectId;
    weekNo: number;

    standardCode: string;
    standardDescription: string;
    skills: string;
    input: string;
    process: string;
    outcome: string;

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
} 

const curriculumSchema = new Schema<CurriculumDocument> ( 
    {
        gradeId: { type: Schema.Types.ObjectId, ref: "Lookup", required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: "Lookup", required: true },
        semesterId: { type: Schema.Types.ObjectId , ref: "Lookup", required: true },
        weekNo: { type: Number, required: true},

        standardCode: { type: String, required: true },
        standardDescription: { type: String, required: true },
        skills: { type: String, required: true },
        input: { type: String, required: true },
        process: { type: String, required: true },
        outcome: { type: String, required: true },

        isActive: { type: Boolean, default: true }
    }, 
    {
        timestamps: true
    }
)

export const CurriculumModel = model<CurriculumDocument> (
    "Curriculum",
    curriculumSchema
)