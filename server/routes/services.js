import express from "express";
import { upload, addServices, getServices } from "../controllers/servicesController.js";

const router = express.Router();

// Use multer's upload middleware for handling file uploads
router.get('/', getServices)
router.post("/add", upload.single('image'), addServices);

export default router;