import { Schema, model, Document } from 'mongoose';

interface Break {
    name: string;
    startDate: Date;
    endDate: Date;
}

interface WeekEntry {
    weekNo: number;
    startDate: Date;   // Sunday (first day of school week)
    endDate: Date;     // Thursday (last day of school week)
}

interface Semester {
    code: string;       // T1, T2
    name: string;       // Term 1, Term 2
    startDate: Date;
    endDate: Date;
    weekCount: number;  // number of teaching weeks
    breaks: Break[];
    weeks: WeekEntry[]; // actual week date ranges parsed from Excel
}

export interface AcademicYearDocument extends Document {
    name: string;       // e.g. "2025-2026"
    startDate: Date;
    endDate: Date;
    semesters: Semester[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const breakSchema = new Schema<Break>({
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
}, { _id: false });

const weekEntrySchema = new Schema<WeekEntry>({
    weekNo:    { type: Number, required: true },
    startDate: { type: Date,   required: true },
    endDate:   { type: Date,   required: true },
}, { _id: false });

const semesterSchema = new Schema<Semester>({
    code: { type: String, required: true },
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    weekCount: { type: Number, required: true, min: 1 },
    breaks: [breakSchema],
    weeks:  [weekEntrySchema],
}, { _id: false });

const academicYearSchema = new Schema<AcademicYearDocument>({
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    semesters: [semesterSchema],
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const AcademicYearModel = model<AcademicYearDocument>('AcademicYear', academicYearSchema);
