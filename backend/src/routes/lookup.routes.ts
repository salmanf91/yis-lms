import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/role.middleware";
import { createLookupHandler, listLookupHandler, updateLookupHandler, deleteLookupHandler, getAllLookupHandler } from "../controllers/lookup.controller";

const router = Router();

// Let anyone logged in read the lookups
router.get("/all", authMiddleware, getAllLookupHandler);
router.get("/:type", authMiddleware, listLookupHandler);

// Keep modifying routes strictly for Admins
router.post("/", authMiddleware, isAdmin, createLookupHandler);
router.put("/:id", authMiddleware, isAdmin, updateLookupHandler);
router.delete("/:id", authMiddleware, isAdmin, deleteLookupHandler);

export default router;