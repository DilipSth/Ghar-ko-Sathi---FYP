import express from "express";
import { login, register, uploadUser, verify } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js"

const router = express.Router();

router.post("/login", login);
router.post("/register" ,uploadUser.single("image"), register);
router.get("/verify", authMiddleware, verify);

export default router;
