import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/role.middleware";
import { createUserByAdmin, listUsersHandler, deactivateUserHandler, activateUserHandler, resetPasswordHandler, bulkCreateUsersHandler, changeRoleHandler, clearAllDataHandler, getDepartmentsHandler } from "../controllers/user.controller";

const router = Router();

router.get('/', authMiddleware, isAdmin, listUsersHandler);
router.get('/departments', authMiddleware, getDepartmentsHandler);
router.post('/bulk', authMiddleware, isAdmin, bulkCreateUsersHandler);
router.post('/', authMiddleware, isAdmin, createUserByAdmin);
// clear-all-data must come before /:id routes
router.delete('/clear-all-data', authMiddleware, isAdmin, clearAllDataHandler);
router.patch('/:id/deactivate', authMiddleware, isAdmin, deactivateUserHandler);
router.patch('/:id/activate', authMiddleware, isAdmin, activateUserHandler);
router.patch('/:id/reset-password', authMiddleware, isAdmin, resetPasswordHandler);
router.patch('/:id/role', authMiddleware, isAdmin, changeRoleHandler);

export default router;
