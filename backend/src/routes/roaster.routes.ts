import express from "express";
import {
    createRoasterHandler,
    listRoasterHandler,
    updateRoasterHandler,
    deleteRoasterHandler,
    deactivateRoasterHandler
} from "../controllers/roaster.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/role.middleware";

const router = express.Router();

router.use(authMiddleware, isAdmin);

router.post("/", createRoasterHandler);
router.get("/", listRoasterHandler);
router.put("/:id", updateRoasterHandler);
router.delete("/:id", deleteRoasterHandler);
router.patch("/:id/deactivate", deactivateRoasterHandler);

export default router;