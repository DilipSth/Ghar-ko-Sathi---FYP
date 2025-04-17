import express from 'express';
import { getConversations, createConversation, getMessages, sendMessage } from '../controllers/chatController.js';
import verifyUser from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyUser);

// Get all conversations (filtered by role)
router.get('/conversations', getConversations);

// Create a new conversation
router.post('/conversations', createConversation);

// Get messages for a specific conversation
router.get('/messages/:conversationId', getMessages);

// Send a new message
router.post('/messages', sendMessage);

export default router; 