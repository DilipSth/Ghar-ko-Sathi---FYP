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
  approveServiceProvider,
  deleteServiceProvider,
  getUsersAndProvidersCount,
} from "../controllers/usersController.js";
import verifyUser from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/gharUsers", getUsers);
router.get("/currentUser", verifyUser, getCurrentUser);
router.get("/gharUsers/:id", getUserById);
router.put("/gharUsers/:id", verifyUser, updateUser);
router.delete("/gharUsers/:id", deleteUser);
router.get("/serviceProvider", getServiceProvider);
router.get("/serviceProvider/:id", getServiceProviderById);
router.put("/serviceProvider/:id", verifyUser, updateServiceProvider);
router.put("/serviceProvider/approve/:id", approveServiceProvider);
router.delete("/serviceProvider/:id", deleteServiceProvider);
router.get("/counts", getUsersAndProvidersCount);

export default router;