import { Schema, model, Document } from "mongoose";

export type LookupType = "GRADE" | "SUBJECT" | "SEMESTER" | "SECTION"

export interface LookupDocument extends Document {
    type: LookupType;
    code: string;
    label: string;
    order?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const lookupSchema = new Schema<LookupDocument> (
    {
        type: { type: String, enum: ["GRADE", "SUBJECT", "SEMESTER", "SECTION"], required: true},
        code: { type: String, required: true, unique: true},
        label: { type: String, required: true},
        order: { type: Number, required: true},
        isActive: { type: Boolean, default: true}
    },
    {
        timestamps: true
    }
)

export const LookupModel = model<LookupDocument>("Lookup", lookupSchema);