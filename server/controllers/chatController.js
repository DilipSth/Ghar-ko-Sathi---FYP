import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import ServiceProvider from '../models/ServiceProvider.js';

// Get all conversations based on user role
export const getConversations = async (req, res) => {
  try {
    const { _id, role } = req.user;
    let conversations = [];

    // Admin can see all conversations
    if (role === 'admin') {
      conversations = await Conversation.find()
        .populate('user', 'name email')
        .populate('serviceProvider', 'name email')
        .sort({ updatedAt: -1 });
    } 
    // User can only see their own conversations
    else if (role === 'user') {
      conversations = await Conversation.find({ user: _id })
        .populate('serviceProvider', 'name email')
        .sort({ updatedAt: -1 });
    } 
    // Service provider can only see their own conversations
    else if (role === 'serviceProvider') {
      conversations = await Conversation.find({ serviceProvider: _id })
        .populate('user', 'name email')
        .sort({ updatedAt: -1 });
    }

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new conversation
export const createConversation = async (req, res) => {
  try {
    const { _id, role } = req.user;

    // Check if user already has a conversation
    let existingConversation;
    
    if (role === 'user') {
      existingConversation = await Conversation.findOne({ user: _id });
    } else if (role === 'serviceProvider') {
      existingConversation = await Conversation.findOne({ serviceProvider: _id });
    }

    if (existingConversation) {
      return res.status(200).json(existingConversation);
    }

    // Create new conversation
    const newConversation = new Conversation({
      user: role === 'user' ? _id : null,
      serviceProvider: role === 'serviceProvider' ? _id : null
    });

    await newConversation.save();

    // Populate the relevant fields
    if (role === 'user') {
      await newConversation.populate('user', 'name email');
    } else if (role === 'serviceProvider') {
      await newConversation.populate('serviceProvider', 'name email');
    }

    res.status(201).json(newConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get messages for a specific conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { _id, role } = req.user;

    // Verify that the user has access to this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user has permission to access this conversation
    if (role !== 'admin' && 
        (role === 'user' && !conversation.user.equals(_id)) ||
        (role === 'serviceProvider' && !conversation.serviceProvider.equals(_id))) {
      return res.status(403).json({ message: 'Not authorized to access this conversation' });
    }

    // Get messages for this conversation
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 });

    // Mark messages as read if they weren't sent by the current user
    await Message.updateMany(
      { 
        conversation: conversationId, 
        sender: { $ne: _id },
        isRead: false 
      },
      { isRead: true }
    );

    // Reset unread count for this conversation
    await Conversation.findByIdAndUpdate(conversationId, { unreadCount: 0 });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const { _id, role } = req.user;

    if (!content || !conversationId) {
      return res.status(400).json({ message: 'Conversation ID and message content are required' });
    }

    // Verify that the conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user has permission to send message to this conversation
    if (role !== 'admin' && 
        (role === 'user' && !conversation.user.equals(_id)) ||
        (role === 'serviceProvider' && !conversation.serviceProvider.equals(_id))) {
      return res.status(403).json({ message: 'Not authorized to send message to this conversation' });
    }

    // Create the new message
    const newMessage = new Message({
      conversation: conversationId,
      sender: _id,
      senderType: role,
      content: content
    });

    await newMessage.save();

    // Update conversation with last message and increment unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      $inc: { unreadCount: 1 }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get total unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const { _id, role } = req.user;
    let totalUnreadCount = 0;
    
    // For admins - sum unread counts across all conversations
    if (role === 'admin') {
      const result = await Conversation.aggregate([
        { $group: { _id: null, total: { $sum: "$unreadCount" } } }
      ]);
      totalUnreadCount = result.length > 0 ? result[0].total : 0;
    } 
    // For users - sum unread counts for their conversations only
    else if (role === 'user') {
      const result = await Conversation.aggregate([
        { $match: { user: _id } },
        { $group: { _id: null, total: { $sum: "$unreadCount" } } }
      ]);
      totalUnreadCount = result.length > 0 ? result[0].total : 0;
    } 
    // For service providers - sum unread counts for their conversations only
    else if (role === 'serviceProvider') {
      const result = await Conversation.aggregate([
        { $match: { serviceProvider: _id } },
        { $group: { _id: null, total: { $sum: "$unreadCount" } } }
      ]);
      totalUnreadCount = result.length > 0 ? result[0].total : 0;
    }
    
    res.status(200).json({ success: true, count: totalUnreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Mark all messages as read
export const markAllAsRead = async (req, res) => {
  try {
    const { _id, role } = req.user;
    
    // Find all conversations this user has access to
    let conversationQuery = {};
    if (role === 'user') {
      conversationQuery = { user: _id };
    } else if (role === 'serviceProvider') {
      conversationQuery = { serviceProvider: _id };
    }
    // Admin has access to all conversations
    
    // Get all relevant conversation IDs
    const conversations = await Conversation.find(conversationQuery).select('_id');
    const conversationIds = conversations.map(c => c._id);
    
    // Mark all relevant messages as read
    await Message.updateMany(
      { 
        conversation: { $in: conversationIds }, 
        sender: { $ne: _id },
        isRead: false 
      },
      { isRead: true }
    );
    
    // Reset unread counts
    await Conversation.updateMany(
      conversationQuery,
      { unreadCount: 0 }
    );
    
    res.status(200).json({ success: true, message: 'All messages marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Edit a message
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const { _id, role } = req.user;
    
    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user has permission to edit this message
    // Admins can edit any message, otherwise users can only edit their own
    if (role !== 'admin' && !message.sender.equals(_id)) {
      return res.status(403).json({ message: 'Not authorized to edit this message' });
    }
    
    // Update the message
    message.content = content;
    message.edited = true;
    await message.save();
    
    // Update the conversation's last message if it was the last one
    const conversation = await Conversation.findById(message.conversation);
    if (conversation.lastMessage === message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')) {
      conversation.lastMessage = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await conversation.save();
    }
    
    res.status(200).json(message);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { _id, role } = req.user;
    
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    // Check if user has permission to delete this message
    // Admins can delete any message, otherwise users can only delete their own
    if (role !== 'admin' && !message.sender.equals(_id)) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }
    
    // Get the conversation to potentially update last message
    const conversation = await Conversation.findById(message.conversation);
    const conversationId = message.conversation;
    
    // Delete the message
    await Message.findByIdAndDelete(messageId);
    
    // If deleted message was the last message in conversation, update lastMessage
    if (conversation.lastMessage === message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '')) {
      // Find the new last message
      const newLastMessage = await Message.findOne({ conversation: conversationId })
        .sort({ createdAt: -1 })
        .limit(1);
      
      // Update the conversation
      if (newLastMessage) {
        conversation.lastMessage = newLastMessage.content.substring(0, 50) + 
          (newLastMessage.content.length > 50 ? '...' : '');
      } else {
        conversation.lastMessage = null;
      }
      
      await conversation.save();
    }
    
    res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 