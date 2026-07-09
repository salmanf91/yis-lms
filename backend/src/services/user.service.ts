import bcrypt from "bcrypt";
import { UserModel } from "../models/user.model";

const SALT_ROUNDS = 10;

type UserRole = "ADMIN" | "HOD" | "TEACHER";

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
}

export async function createUser(
    {
        name,
        email,
        password,
        role,
        department,
    } : CreateUserInput
) {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    const user = await UserModel.create({
        name,
        email,
        passwordHash,
        role,
        department: department || '',
        isActive: true
    })

    return user;
}

export async function getUserCount () {
    return UserModel.countDocuments();
}

export async function findActiveUserByEmail(email: string) {
    return UserModel.findOne({email, isActive: true })
}

export async function findUserByEmail(email: string) {
    return UserModel.findOne({email})
}

interface ListUsersFilter {
    role?: string;
    isActive?: boolean;
    search?: string;
    department?: string;
    page?: number;
    limit?: number;
}

export async function listUsers(filters: ListUsersFilter = {}) {
    const query: any = {};
    if (filters.role) query.role = filters.role;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.department) query.department = filters.department;
    if (filters.search?.trim()) {
        // Escape special regex characters to prevent ReDoS
        const escaped = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(escaped, 'i');
        query.$or = [{ name: rx }, { email: rx }];
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, filters.limit || 50);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        UserModel.find(query).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
        UserModel.countDocuments(query),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getDistinctDepartments(): Promise<string[]> {
    const depts = await UserModel.distinct('department', { department: { $exists: true, $ne: '' } });
    return (depts as string[]).filter(Boolean).sort();
}

export async function deactivateUser(id: string) {
    return UserModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).select('-passwordHash');
}

export async function activateUser(id: string) {
    return UserModel.findByIdAndUpdate(id, { isActive: true }, { new: true }).select('-passwordHash');
}

/**
 * Transfer all lesson plans and roster slots from one teacher to another,
 * then deactivate the leaving teacher — all in parallel where safe.
 */
export async function transferAndDeactivateTeacher(fromId: string, toId: string) {
    const { lessonPlanModel } = await import('../models/lessonPlan.model');
    const { RoasterModel }    = await import('../models/roaster.model');

    const [lessonPlans, rosterSlots] = await Promise.all([
        lessonPlanModel.updateMany({ teacherId: fromId }, { teacherId: toId }),
        RoasterModel.updateMany(   { teacherId: fromId }, { teacherId: toId }),
    ]);

    const user = await UserModel.findByIdAndUpdate(
        fromId, { isActive: false }, { new: true }
    ).select('-passwordHash');

    return {
        user,
        lessonPlansTransferred: lessonPlans.modifiedCount,
        rosterSlotsTransferred: rosterSlots.modifiedCount,
    };
}

export async function bulkCreateUsers(users: CreateUserInput[]) {
    const errors: string[] = [];

    // Check which emails already exist in one query
    const emails = users.map(u => u.email.toLowerCase());
    const existingDocs = await UserModel.find({ email: { $in: emails } }).select('email').lean();
    const existingEmails = new Set(existingDocs.map((d: any) => d.email));

    const toCreate = users.filter(u => {
        if (existingEmails.has(u.email.toLowerCase())) {
            errors.push(`${u.email} already exists`);
            return false;
        }
        return true;
    });

    if (toCreate.length === 0) {
        return { created: 0, skipped: errors.length, errors };
    }

    // Hash passwords in parallel, then insertMany in one round-trip
    const docs = await Promise.all(
        toCreate.map(async (u: any) => ({
            name: u.name,
            email: u.email.toLowerCase(),
            passwordHash: await bcrypt.hash(u.password, SALT_ROUNDS),
            role: u.role,
            department: u.department || '',
            isActive: true,
            mustResetPassword: u.mustResetPassword ?? false,
        }))
    );

    const inserted = await UserModel.insertMany(docs, { ordered: false });
    return { created: inserted.length, skipped: errors.length, errors };
}
