import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import { sendResponse } from "../utils/sendResponse";

export function isAdmin( req: AuthRequest, res: Response, next: NextFunction ) {
    if(!req.user) {
        return sendResponse(res, 401, false, "Not Authenticated" );
    }

    if(req.user.role !== "ADMIN") {
        return sendResponse(res, 403, false, "Admin access required");
    }

    next();
}