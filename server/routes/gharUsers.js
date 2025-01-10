import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { addGharUsers, upload, getGharUsers, getGharUser, updateGharUser } from "../controllers/gharUsersController.js";

const router = express.Router();

router.get("/", authMiddleware, getGharUsers);
router.post("/add", authMiddleware, upload.single("image"), addGharUsers);
router.get("/:id", authMiddleware, getGharUser);
router.put("/:id", authMiddleware, updateGharUser);


export default router;