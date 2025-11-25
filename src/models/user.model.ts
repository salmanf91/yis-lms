import { Schema, model, Document } from 'mongoose';

export type UserRole = "ADMIN" | "HOD" | "TEACHER";

export interface UserDocument extends Document {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    isActive: boolean;
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
    },
    {
        timestamps: true
    }
);

export const UserModel = model<UserDocument>("User", userSchema);