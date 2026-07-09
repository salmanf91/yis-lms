import bcrypt from "bcrypt";
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { createUser, findUserByEmail, listUsers, deactivateUser, activateUser, bulkCreateUsers, transferAndDeactivateTeacher, getDistinctDepartments } from "../services/user.service";
import { sendResponse } from "../utils/sendResponse";
import { UserModel } from "../models/user.model";
import { CurriculumModel } from "../models/curriculum.model";
import { RoasterModel } from "../models/roaster.model";
import { lessonPlanModel } from "../models/lessonPlan.model";
import { LookupModel } from "../models/lookup.model";
import { AcademicYearModel } from "../models/academicYear.model";

/**
 * GET /api/users
 * List all users. Admin only.
 */
export async function listUsersHandler(req: AuthRequest, res: Response) {
    try {
        const { role, isActive, search, department, page, limit } = req.query;
        const result = await listUsers({
            role: role as string | undefined,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            search: search as string | undefined,
            department: department as string | undefined,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 50,
        });
        return sendResponse(res, 200, true, "Users fetched", result);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * POST /api/users
 * Creates a new HOD or Teacher. Admin only.
 */
export async function createUserByAdmin(req: AuthRequest, res: Response) {
    try {
        const { name, email, password, role, department } = req.body;

        if (!name || !email || !password || !role) {
            return sendResponse(res, 400, false, "name, email, password and role are required");
        }

        if (role !== "HOD" && role !== "TEACHER") {
            return sendResponse(res, 400, false, "Role must be HOD or TEACHER");
        }

        const existing = await findUserByEmail(email);
        if (existing) {
            return sendResponse(res, 400, false, "User with this email already exists");
        }

        const user = await createUser({ name, email, password, role, department });

        return sendResponse(res, 201, true, "User created successfully", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
        });
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * PATCH /api/users/:id/deactivate
 * Admin: deactivate a user (cannot deactivate yourself).
 * If body contains replacementTeacherId, all lesson plans and roster slots
 * are transferred to the replacement before deactivation.
 */
export async function deactivateUserHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const { replacementTeacherId } = req.body;

        if (id === req.user!.userId) {
            return sendResponse(res, 400, false, "You cannot deactivate your own account");
        }

        // Replacement-based transfer path
        if (replacementTeacherId) {
            if (replacementTeacherId === id) {
                return sendResponse(res, 400, false, "Replacement cannot be the same teacher");
            }
            const replacement = await UserModel.findById(replacementTeacherId);
            if (!replacement || !replacement.isActive) {
                return sendResponse(res, 400, false, "Replacement teacher not found or is inactive");
            }

            const result = await transferAndDeactivateTeacher(id, replacementTeacherId);
            if (!result.user) return sendResponse(res, 404, false, "User not found");

            return sendResponse(res, 200, true,
                `Teacher deactivated. Transferred ${result.lessonPlansTransferred} lesson plan(s) and ${result.rosterSlotsTransferred} roster slot(s) to ${replacement.name}.`,
                result
            );
        }

        // Plain deactivate (no transfer)
        const user = await deactivateUser(id);
        if (!user) return sendResponse(res, 404, false, "User not found");
        return sendResponse(res, 200, true, "User deactivated", { user, lessonPlansTransferred: 0, rosterSlotsTransferred: 0 });
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * PATCH /api/users/:id/activate
 * Admin: reactivate a deactivated user
 */
export async function activateUserHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const user = await activateUser(id);
        if (!user) return sendResponse(res, 404, false, "User not found");
        return sendResponse(res, 200, true, "User activated", user);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * POST /api/users/bulk
 * Admin: bulk-create users from CSV template
 */
export async function bulkCreateUsersHandler(req: AuthRequest, res: Response) {
    try {
        const { users } = req.body;
        if (!Array.isArray(users) || users.length === 0) {
            return sendResponse(res, 400, false, "users array is required");
        }
        for (const [i, u] of users.entries()) {
            if (!u.name || !u.email || !u.password || !u.role) {
                return sendResponse(res, 400, false, `Row ${i + 1}: name, email, password and role are required`);
            }
            if (!['HOD','TEACHER'].includes(u.role)) {
                return sendResponse(res, 400, false, `Row ${i + 1}: role must be HOD or TEACHER`);
            }
        }
        const result = await bulkCreateUsers(users);
        return sendResponse(res, 201, true, `${result.created} users created, ${result.skipped} skipped`, result);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * PATCH /api/users/:id/reset-password
 * Admin: reset a user's password
 */
export async function resetPasswordHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return sendResponse(res, 400, false, "New password must be at least 8 characters");
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        const user = await UserModel.findByIdAndUpdate(
            id,
            { passwordHash, mustResetPassword: false },
            { new: true }
        ).select('-passwordHash');
        if (!user) return sendResponse(res, 404, false, "User not found");
        return sendResponse(res, 200, true, "Password reset successfully", { id: user._id, name: user.name });
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * PATCH /api/users/:id/role
 * Admin: change a user's role between TEACHER and HOD
 */
export async function changeRoleHandler(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['HOD', 'TEACHER'].includes(role)) {
            return sendResponse(res, 400, false, "Role must be HOD or TEACHER");
        }
        if (id === req.user!.userId) {
            return sendResponse(res, 400, false, "Cannot change your own role");
        }
        const user = await UserModel.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash');
        if (!user) return sendResponse(res, 404, false, "User not found");
        return sendResponse(res, 200, true, "Role updated", user);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * DELETE /api/users/clear-all-data
 * Admin: wipe all non-admin data for a fresh start
 */
export async function clearAllDataHandler(req: AuthRequest, res: Response) {
    try {
        const [users, curriculum, roster, plans, lookups, years] = await Promise.all([
            UserModel.deleteMany({ role: { $ne: 'ADMIN' } }),
            CurriculumModel.deleteMany({}),
            RoasterModel.deleteMany({}),
            lessonPlanModel.deleteMany({}),
            LookupModel.deleteMany({}),
            AcademicYearModel.deleteMany({}),
        ]);

        return sendResponse(res, 200, true, "All non-admin data cleared", {
            usersDeleted: users.deletedCount,
            curriculumDeleted: curriculum.deletedCount,
            rosterDeleted: roster.deletedCount,
            plansDeleted: plans.deletedCount,
            lookupsDeleted: lookups.deletedCount,
            yearsDeleted: years.deletedCount,
        });
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}

/**
 * GET /api/users/departments
 * Return distinct non-empty department values across all users
 */
export async function getDepartmentsHandler(req: AuthRequest, res: Response) {
    try {
        const departments = await getDistinctDepartments();
        return sendResponse(res, 200, true, "Departments fetched", departments);
    } catch (err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}
