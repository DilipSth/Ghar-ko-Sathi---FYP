import express from "express";
import { getServiceProvider, getUsers } from "../controllers/usersController.js";


const router = express.Router();

router.get('/gharUsers', getUsers)
router.get('/serviceProvider', getServiceProvider) 

export default router;