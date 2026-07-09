import { Schema, model, Document } from 'mongoose';

export type UserRole = "ADMIN" | "HOD" | "TEACHER";

export interface UserDocument extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
    mustResetPassword: boolean;
    department: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<UserDocument> (
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        passwordHash: { type: String, required: true },
        role: { type: String, enum: ["ADMIN", "HOD", "TEACHER"], required: true },
        isActive: { type: Boolean, default: true },
        mustResetPassword: { type: Boolean, default: false },
        department: { type: String, default: '' },
    },
    {
        timestamps: true
    }
);

// Compound indexes for filtered user list queries
userSchema.index({ isActive: 1, role: 1 });
userSchema.index({ isActive: 1, department: 1 });

export const UserModel = model<UserDocument>("User", userSchema);
