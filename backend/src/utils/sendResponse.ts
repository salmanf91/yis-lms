import { Response } from "express";

export function sendResponse (
    res: Response,
    status: number,
    success: boolean,
    message: string,
    data: unknown = null
) {
    return res.status(status).json({ success, message, data })
}