import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin, isHod } from "../middleware/role.middleware";
import { summaryHandler, coverageHandler, complianceHandler, hodSummaryHandler } from "../controllers/report.controller";

const router = Router();

router.get('/summary', authMiddleware, isAdmin, summaryHandler);
router.get('/coverage', authMiddleware, isAdmin, coverageHandler);
router.get('/compliance', authMiddleware, isAdmin, complianceHandler);
router.get('/hod-summary', authMiddleware, hodSummaryHandler);

export default router;
