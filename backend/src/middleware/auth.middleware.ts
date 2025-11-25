import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";
import { sendResponse } from "../utils/sendResponse";

export interface AuthRequest extends Request {
    user?: {
        userId: string,
        role: "ADMIN" | "HOD" | "TEACHER"
    };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if(!authHeader?.startsWith("Bearer")) {
        return sendResponse(res, 401, false, "Missing or Invalid Token" );
    }

    const token = authHeader.substring(7);
    try{
        const decoded = jwt.verify(token, JWT_SECRET) as {
            userId: string;
            role: "ADMIN" | "HOD" | "TEACHER";
        };
        req.user = decoded;
        next();
    } catch(err) {
        return sendResponse(res, 401, false, "Invalid Token");
    }
}