import express from "express";
import { getServiceProvider, getUsers, getServiceProviderById, updateServiceProvider, deleteServiceProvider } from "../controllers/usersController.js";


const router = express.Router();

router.get('/gharUsers', getUsers)
router.get("/serviceProvider", getServiceProvider);
router.get("/serviceProvider/:id", getServiceProviderById);
router.put("/serviceProvider/:id", updateServiceProvider);
router.delete("/serviceProvider/:id", deleteServiceProvider);

export default router;