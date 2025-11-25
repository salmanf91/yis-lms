import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";
import { getUserCount, createUser, findActiveUserByEmail, findUserByEmail } from "../services/user.service";
import { sendResponse } from "../utils/sendResponse";

/**
 * POST /api/auth/register
 * Registers a new user.
 *
 * Behavior:
 * - If no users exist, creates the first user as ADMIN.
 * - For later users, only HOD/TEACHER roles are allowed.
 *
 * Body:
 * - name: string (required)
 * - email: string (required)
 * - password: string (required)
 * - role: "HOD" | "TEACHER" (ignored for first user, required after)
 *
 * Responses:
 * - 200: First ADMIN registered
 * - 201: User (HOD/Teacher) registered
 * - 400/403/500: Error with message
 */
export async function register( req: Request, res: Response) {
    try {

        const { name, email, password, role } = req.body;

        if(!name || !email || !password) {
            return sendResponse(res, 400, false, "Name, email and password are required")
        }

        const userCount = await getUserCount();

        if(userCount === 0) {
            const user = await createUser({
                name,
                email,
                password,
                role: "ADMIN"           
            });

            return sendResponse(res, 200, true, "Admin Registered Successfully", {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            })
        }

        if(role === "ADMIN") {
            return sendResponse(res, 403, false, "Admin Signup is not allowed")
        }

        if(role !== "HOD" && role !== "TEACHER") {
            return sendResponse(res, 400, false, "Invalid Role")
        }

        const existing = await findUserByEmail(email)
        if(existing) {
            return sendResponse(res, 400, false, "User exists")
        }

        const user = await createUser({
            name,
            email,
            password,
            role
        });

        return sendResponse(res, 201, true, "User registered succesfully", {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        });
        
    } catch (err:any) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error")
    }
}

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 *
 * Body:
 * - email: string (required)
 * - password: string (required)
 *
 * Response (200):
 * - token: string (JWT, expires in 8h)
 * - user: { id, name, email, role }
 *
 * Errors:
 * - 400/401/500 with error message
 */
export async function login(req: Request, res:Response) {
    try {
        const { email, password } = req.body;

        if(!email || !password) {
            return sendResponse(res, 400, false, "Email and Password are required");
        }

        const user = await findActiveUserByEmail(email)
        if(!user) {
            return sendResponse(res, 401, false, "Invalid Credentials");
        }

        const match = await bcrypt.compare(password, user.passwordHash)
        if(!match) {
            return sendResponse(res, 400, false, "Invalid Credentials");
        }

        const token = jwt.sign(
            {userID: user._id, role:user.role },
            JWT_SECRET,
            {expiresIn: "8h"}
        );

        return sendResponse(res, 200, true, "Login Successfull", {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err:any) {
        console.error(err);
        return sendResponse(res, 500, false, "Internal Server Error")
    }

}