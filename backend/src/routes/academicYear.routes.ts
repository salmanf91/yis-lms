import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/role.middleware';
import {
    listAcademicYearsHandler,
    getActiveAcademicYearHandler,
    createAcademicYearHandler,
    updateAcademicYearHandler,
    setActiveYearHandler,
    getCurrentWeekHandler,
    uploadMiddleware,
    importAcademicYearXlsx,
} from '../controllers/academicYear.controller';

const router = Router();

router.get('/active', authMiddleware, getActiveAcademicYearHandler);
router.get('/current-week', authMiddleware, getCurrentWeekHandler);
router.get('/', authMiddleware, isAdmin, listAcademicYearsHandler);
router.post('/', authMiddleware, isAdmin, createAcademicYearHandler);
router.post('/import-xlsx', authMiddleware, isAdmin, uploadMiddleware, importAcademicYearXlsx);
router.put('/:id', authMiddleware, isAdmin, updateAcademicYearHandler);
router.patch('/:id/set-active', authMiddleware, isAdmin, setActiveYearHandler);

export default router;
