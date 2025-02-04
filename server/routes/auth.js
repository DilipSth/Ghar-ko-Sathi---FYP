import express from "express";
import { login, registerUser, registerServiceProvider, registerImage, verify } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);

router.post(
  "/registerUser",
  registerImage.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "citizenshipImage", maxCount: 1 },
  ]),
  registerUser
);

router.post(
  "/registerServiceProvider",
  registerImage.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "citizenshipImage", maxCount: 1 },
    { name: "certificationImage", maxCount: 1 },
  ]),
  registerServiceProvider
);

router.get("/verify", authMiddleware, verify);

export default router;