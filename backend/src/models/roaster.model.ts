import { Schema, model, Document, Types } from "mongoose";

export interface RoasterDocumnet extends Document {
    teacherId: Types.ObjectId;
    gradeId: Types.ObjectId;
    subjectId: Types.ObjectId;
    section: string;
    day: string;
    period: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const roasterSchema = new Schema<RoasterDocumnet> (
    {
        teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        gradeId: { type: Schema.Types.ObjectId, ref: "Lookup", required: true },
        subjectId: { type: Schema.Types.ObjectId, ref: "Lookup", required: true },
        section: { type: String, required: true},
        day: { type: String, required: true },
        period: { type: Number, required: true },
        startTime: { type: String, required: true},
        endTime: { type: String, required: true },
        isActive: { type: Boolean, default: true }
    },
    {
        timestamps: true
    }
)

// Compound indexes for common query patterns
roasterSchema.index({ isActive: 1, gradeId: 1, section: 1 });
roasterSchema.index({ isActive: 1, teacherId: 1 });
roasterSchema.index({ isActive: 1, gradeId: 1, subjectId: 1 });

export const RoasterModel = model<RoasterDocumnet>("Roaster", roasterSchema);