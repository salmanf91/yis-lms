import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin, isHod, isTeacher } from "../middleware/role.middleware";
import {
    createLessonPlanHandler, submitLessonPlanHandler, approveLessonHandler,
    deactivateLessonPlanHandler,
    updateLessonPlanHandler,
    rejectLessonPlanHandler,
    listLessonPlanHandler,
    getlessonPlanHandler,
    importWeeklyPlansHandler
} from "../controllers/lessonPlan.controller";

const router = Router();

router.post("/import", authMiddleware, isAdmin, importWeeklyPlansHandler);
router.post("/", authMiddleware, isTeacher, createLessonPlanHandler);
router.put("/:id", authMiddleware, isTeacher, updateLessonPlanHandler);
router.patch("/:id/submit", authMiddleware, isTeacher, submitLessonPlanHandler);

router.patch("/:id/approve", authMiddleware, isHod, approveLessonHandler);
router.patch("/:id/reject", authMiddleware, isHod, rejectLessonPlanHandler);

router.patch("/:id/deactivate", authMiddleware, isAdmin, deactivateLessonPlanHandler);

router.get("/", authMiddleware, listLessonPlanHandler);
router.get("/:id", authMiddleware, getlessonPlanHandler);

export default router;