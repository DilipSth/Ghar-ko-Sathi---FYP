import Message from "../../models/Message.js";
import Conversation from "../../models/Conversation.js";
import User from "../../models/User.js";
import ServiceProvider from "../../models/ServiceProvider.js";

const handleChatEvents = (socket, io, connectedUsers) => {
  // Mark specific conversation's messages as read
  socket.on("markAsRead", async (data) => {
    try {
      const { conversationId, userId } = data;
      if (!conversationId || !userId) return;

      // Mark messages as read
      await Message.updateMany(
        { 
          conversation: conversationId, 
          sender: { $ne: userId },
          isRead: false 
        },
        { isRead: true }
      );

      // Reset unread count for this conversation
      await Conversation.findByIdAndUpdate(conversationId, { unreadCount: 0 });

      // Get the updated conversation
      const conversation = await Conversation.findById(conversationId);
      
      // Notify other participants that messages have been read
      if (conversation) {
        // Find the other participant's socket ID
        let otherParticipantSocketId = null;
        const otherParticipantId = conversation.user && conversation.user.toString() !== userId 
          ? conversation.user.toString() 
          : conversation.serviceProvider ? conversation.serviceProvider.toString() : null;
        
        if (otherParticipantId) {
          for (const [socketId, info] of connectedUsers) {
            if (info.userId === otherParticipantId) {
              otherParticipantSocketId = socketId;
              break;
            }
          }
        }

        if (otherParticipantSocketId) {
          io.to(otherParticipantSocketId).emit("messagesRead", { conversationId });
        }
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Mark all messages as read
  socket.on("markAllAsRead", async (data) => {
    try {
      const { userId } = data;
      const socketUser = connectedUsers.get(socket.id);
      
      if (!socketUser || !userId) return;
      
      const { role } = socketUser;
      
      // Find all conversations this user has access to
      let conversationQuery = {};
      if (role === 'user') {
        conversationQuery = { user: userId };
      } else if (role === 'serviceProvider') {
        conversationQuery = { serviceProvider: userId };
      }
      // Admin has access to all conversations
      
      // Get all relevant conversation IDs
      const conversations = await Conversation.find(conversationQuery).select('_id');
      const conversationIds = conversations.map(c => c._id);
      
      // Mark all relevant messages as read
      await Message.updateMany(
        { 
          conversation: { $in: conversationIds }, 
          sender: { $ne: userId },
          isRead: false 
        },
        { isRead: true }
      );
      
      // Reset unread counts
      await Conversation.updateMany(
        conversationQuery,
        { unreadCount: 0 }
      );
      
      // Notify other users that messages have been read
      const updatedConversations = await Conversation.find(conversationQuery)
        .populate('user', '_id')
        .populate('serviceProvider', '_id');
      
      for (const conversation of updatedConversations) {
        const otherUserId = conversation.user && conversation.user._id.toString() !== userId 
          ? conversation.user._id.toString() 
          : conversation.serviceProvider ? conversation.serviceProvider._id.toString() : null;
        
        if (otherUserId) {
          for (const [socketId, info] of connectedUsers) {
            if (info.userId === otherUserId) {
              io.to(socketId).emit("allMessagesRead", { userId });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error marking all messages as read via socket:", error);
    }
  });

  // Handle sending a new message
  socket.on("sendMessage", async (messageData) => {
    try {
      const { conversationId, content } = messageData;
      const socketUser = connectedUsers.get(socket.id);
      
      if (!socketUser || !conversationId || !content) return;
      
      const { userId, role } = socketUser;

      // Get sender name based on role
      let senderName = '';
      if (role === 'admin') {
        senderName = 'Admin';
      } else if (role === 'user') {
        const user = await User.findById(userId).select('name');
        senderName = user?.name || 'User';
      } else {
        const provider = await ServiceProvider.findById(userId).select('name');
        senderName = provider?.name || 'Service Provider';
      }

      // Create the new message
      const newMessage = new Message({
        conversation: conversationId,
        sender: userId,
        senderType: role,
        content: content,
        isRead: false
      });

      await newMessage.save();

      // Update conversation with last message and increment unread count
      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          $inc: { unreadCount: 1 }
        },
        { new: true }
      );

      // Populate the message before broadcasting
      const populatedMessage = await Message.findById(newMessage._id);
      
      // Add sender name to the message object for convenience
      const messageWithName = {
        ...populatedMessage.toObject(),
        senderName: senderName
      };

      // Broadcast the message to all participants in the conversation
      if (conversation) {
        // Determine recipients
        const recipientIds = [];
        if (conversation.user) recipientIds.push(conversation.user.toString());
        if (conversation.serviceProvider) recipientIds.push(conversation.serviceProvider.toString());
        
        // Add admin users if needed
        const adminUsers = await User.find({ role: "admin" }).select("_id");
        adminUsers.forEach(admin => recipientIds.push(admin._id.toString()));
        
        // Filter out duplicates and the sender
        const uniqueRecipients = [...new Set(recipientIds)].filter(id => id !== userId);
        
        // Find socket IDs for all recipients
        for (const recipientId of uniqueRecipients) {
          for (const [socketId, info] of connectedUsers) {
            if (info.userId === recipientId) {
              io.to(socketId).emit("newMessage", messageWithName);
            }
          }
        }
        
        // Also send back to sender for confirmation
        socket.emit("messageSent", messageWithName);
      }
    } catch (error) {
      console.error("Error sending message via socket:", error);
      socket.emit("messageError", { error: "Failed to send message" });
    }
  });
};

export default handleChatEvents; 