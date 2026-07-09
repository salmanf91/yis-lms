import express from "express";
import {
    createRoasterHandler,
    listRoasterHandler,
    updateRoasterHandler,
    deleteRoasterHandler,
    deactivateRoasterHandler,
    importAscXml,
    ascUploadMiddleware,
    syncSectionsHandler,
} from "../controllers/roaster.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/role.middleware";

const router = express.Router();

// All authenticated users can read the roster (teachers need it for their timetable / weekly plan)
router.get("/", authMiddleware, listRoasterHandler);

// Write operations remain admin-only
router.post("/sync-sections", authMiddleware, isAdmin, syncSectionsHandler);
router.post("/import-asc",    authMiddleware, isAdmin, ascUploadMiddleware, importAscXml);
router.post("/",           authMiddleware, isAdmin, createRoasterHandler);
router.put("/:id",         authMiddleware, isAdmin, updateRoasterHandler);
router.delete("/:id",      authMiddleware, isAdmin, deleteRoasterHandler);
router.patch("/:id/deactivate", authMiddleware, isAdmin, deactivateRoasterHandler);

export default router;