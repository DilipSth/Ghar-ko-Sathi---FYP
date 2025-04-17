import express from 'express';
import { 
  getConversations, 
  createConversation, 
  getMessages, 
  sendMessage,
  getUnreadCount,
  markAllAsRead,
  editMessage,
  deleteMessage
} from '../controllers/chatController.js';
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

// Get total unread message count
router.get('/unread-count', getUnreadCount);

// Mark all messages as read
router.post('/mark-all-read', markAllAsRead);

// Edit a message
router.put('/messages/:messageId', editMessage);

// Delete a message
router.delete('/messages/:messageId', deleteMessage);

export default router; 