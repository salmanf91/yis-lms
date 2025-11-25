import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { createUser, findUserByEmail } from "../services/user.service";
import { sendResponse } from "../utils/sendResponse";

/**
 * POST /api/users
 * Creates a new HOD or Teacher.
 *
 * Auth:
 * - Requires JWT in `Authorization: Bearer <token>`
 * - Caller must have role ADMIN
 *
 * Body:
 * - name: string
 * - email: string
 * - password: string
 * - role: "HOD" | "TEACHER"
 *
 * Response:
 * - 201 on success with created user details
 *
 * Usage:
 * 1. Login with admin credentials to get a token.
 * 2. Send the token in: Authorization: Bearer <token>
 */
export async function createUserByAdmin(req: AuthRequest, res: Response) {
    try{
        const { name, email, password, role } = req.body;

        if( !name || !email || !password || !role) {
            return sendResponse(res, 400, false, "name, email, password and role are required");
        }

        if(role !== "HOD" && role !=="TEACHER") {
            return sendResponse(res, 400, false, "Role must be HOD or Teacher");
        }

        const existing = await findUserByEmail(email);
        if(existing) {
            return sendResponse(res, 400, false, "User with this email id exists");
        }

        const user = await createUser({
            name,
            email,
            password,
            role
        })

        return sendResponse(res, 200, true, "User Created Successfully", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        });
    } catch(err) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error");
    }
}