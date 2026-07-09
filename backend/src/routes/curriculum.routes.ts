import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/role.middleware";
import {
    createCurriculumHandler,
    listCurriculumHandler,
    getCurriculumByIdHandler,
    updateCurriculumHandler,
    deleteCurriculumHandler,
    decactivateCurriculumHandler,
    bulkCreateCurriculumHandler,
    validateBulkCurriculumHandler,
    bulkUpdateStandardHandler,
    bulkDeactivateStandardHandler,
    bulkDeleteStandardHandler,
    reactivateCurriculumHandler,
    bulkReactivateStandardHandler
} from "../controllers/curriculum.controller";

const router = Router();

// Let anyone logged in read the curriculums
router.get('/', authMiddleware, listCurriculumHandler);
router.get('/:id', authMiddleware, getCurriculumByIdHandler);

// New bulk standard endpoints (available to all logged-in roles like Teacher, HOD, Admin)
router.put('/bulk-standard', authMiddleware, bulkUpdateStandardHandler);
router.patch('/bulk-standard/deactivate', authMiddleware, bulkDeactivateStandardHandler);
router.patch('/bulk-standard/reactivate', authMiddleware, bulkReactivateStandardHandler);
router.delete('/bulk-standard/delete', authMiddleware, bulkDeleteStandardHandler);

// Keep modifying routes strictly for Admins
router.post('/validate-bulk', authMiddleware, isAdmin, validateBulkCurriculumHandler);
router.post('/bulk', authMiddleware, isAdmin, bulkCreateCurriculumHandler);

// Allow create, update, delete, and deactivate/reactivate for all authenticated roles (Teachers, HODs, Admins)
router.post('/', authMiddleware, createCurriculumHandler);
router.put('/:id', authMiddleware, updateCurriculumHandler);
router.delete('/:id', authMiddleware, deleteCurriculumHandler);
router.patch('/:id/deactivate', authMiddleware, decactivateCurriculumHandler);
router.patch('/:id/reactivate', authMiddleware, reactivateCurriculumHandler);

export default router;