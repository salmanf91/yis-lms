import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { sendResponse } from "../utils/sendResponse";
import { rolePriority, UserRole } from "../utils/roles";

export function requireMinRole(requiredRole: UserRole) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return sendResponse(res, 401, false, "Not Authenticated");
        }
        const userRole = req.user.role;

        const userPriority = rolePriority[userRole];
        const requiredPriority = rolePriority[requiredRole];

        if (userPriority < requiredPriority) {
            return sendResponse(res, 403, false, "Insufficient Permissions")
        }

        next();
    }
}

export const isTeacher = requireMinRole("TEACHER");
export const isHod = requireMinRole("HOD");
export const isAdmin = requireMinRole("ADMIN");