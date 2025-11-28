import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/role.middleware";
import {
    createCurriculumHandler,
    listCurriculumHandler,
    getCurriculumByIdHandler,
    updateCurriculumHandler,
    deleteCurriculumHandler,
    decactivateCurriculumHandler
} from "../controllers/curriculum.controller";

const router = Router();

router.use(authMiddleware, isAdmin)

router.post('/', createCurriculumHandler);
router.get('/', listCurriculumHandler);
router.get('/:id', getCurriculumByIdHandler);
router.put('/:id', updateCurriculumHandler);
router.delete('/:id', deleteCurriculumHandler);
router.patch('/:id/deactivate', decactivateCurriculumHandler);

export default router;