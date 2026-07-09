import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getTimetableHandler } from "../controllers/timetable.controller";

const router = Router();

router.get('/', authMiddleware, getTimetableHandler);

export default router;
