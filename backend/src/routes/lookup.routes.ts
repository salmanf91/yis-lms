import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/role.middleware";
import { createLookupHandler, listLookupHandler, updateLookupHandler, deleteLookupHandler, getAllLookupHandler } from "../controllers/lookup.controller";

const router = Router();

router.use(authMiddleware, isAdmin);

router.post("/", createLookupHandler);
router.get("/all", getAllLookupHandler);
router.get("/:type", listLookupHandler);
router.put("/:id", updateLookupHandler);
router.delete("/:id", deleteLookupHandler);

export default router;