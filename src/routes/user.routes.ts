import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/role.middleware";
import { createUserByAdmin } from "../controllers/user.controller";

const router = Router();

router.post('/', authMiddleware, isAdmin, createUserByAdmin);

export default router;
