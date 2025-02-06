import express from "express";
import {
  getUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  deleteUser,
  getServiceProvider,
  getServiceProviderById,
  updateServiceProvider,
  deleteServiceProvider,
} from "../controllers/usersController.js";

const router = express.Router();

router.get("/gharUsers", getUsers);
router.get("/currentUser", getCurrentUser);
router.get("/gharUsers/:id", getUserById);
router.put("/gharUsers/:id", updateUser);
router.delete("/gharUsers/:id", deleteUser);
router.get("/serviceProvider", getServiceProvider);
router.get("/serviceProvider/:id", getServiceProviderById);
router.put("/serviceProvider/:id", updateServiceProvider);
router.delete("/serviceProvider/:id", deleteServiceProvider);

export default router;
