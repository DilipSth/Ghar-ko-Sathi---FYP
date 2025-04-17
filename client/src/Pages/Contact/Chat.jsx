import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/authContext";
import { useSocket } from "../../context/useSocket";
import axios from "axios";
import { toast } from "react-toastify";

// Create a dedicated API client instance with the base URL
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000"
});

// Add auth token to all requests
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

const Chat = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const messageEndRef = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for new messages
    socket.on('newMessage', (message) => {
      // Update messages if the conversation is currently selected
      if (selectedConversation && message.conversation === selectedConversation._id) {
        setMessages(prevMessages => [...prevMessages, message]);
        
        // Mark as read if the user is looking at this conversation
        socket.emit('markAsRead', { 
          conversationId: selectedConversation._id,
          userId: user._id
        });
      } else {
        // Update unread counts for other conversations
        setUnreadCounts(prev => ({
          ...prev,
          [message.conversation]: (prev[message.conversation] || 0) + 1
        }));
        
        // Show toast notification
        if (message.sender !== user._id) {
          const senderName = message.senderType === 'admin' ? 'Admin' : 
                            message.senderType === 'user' ? 'User' : 'Service Provider';
          
          toast.info(`New message from ${senderName}: ${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      }
    });

    // Listen for new conversations
    socket.on('newConversation', (conversation) => {
      setConversations(prev => [conversation, ...prev]);
      
      // If this is a new conversation for a non-admin user, select it
      if (user.role !== 'admin' && 
          ((user.role === 'user' && conversation.user === user._id) || 
           (user.role === 'serviceProvider' && conversation.serviceProvider === user._id))) {
        setSelectedConversation(conversation);
      }
      
      toast.info('New conversation started', {
        position: "top-right",
        autoClose: 3000,
      });
    });

    // Clean up on unmount
    return () => {
      socket.off('newMessage');
      socket.off('newConversation');
    };
  }, [socket, selectedConversation, user]);

  // Register user with socket when component mounts
  useEffect(() => {
    if (socket && user) {
      socket.emit('register', { userId: user._id, role: user.role });
    }
  }, [socket, user]);

  // Fetch conversations based on user role
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        console.log("Fetching conversations from:", `${apiClient.defaults.baseURL}/api/chat/conversations`);
        
        const response = await apiClient.get("/api/chat/conversations");
        
        // Ensure response.data is an array
        const conversationsData = Array.isArray(response.data) ? response.data : [];
        setConversations(conversationsData);
        
        // For non-admin users, automatically select their conversation or create one if none exists
        if (user?.role !== "admin" && conversationsData.length === 0) {
          handleCreateConversation();
        } else if (user?.role !== "admin" && conversationsData.length > 0) {
          setSelectedConversation(conversationsData[0]);
        }
        
        // Initialize unread counts
        const counts = {};
        conversationsData.forEach(conv => {
          counts[conv._id] = conv.unreadCount || 0;
        });
        setUnreadCounts(counts);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations");
        setLoading(false);
        // Set conversations to empty array in case of error
        setConversations([]);
      }
    };

    if (user) {
      fetchConversations();
      
      // Set up polling to refresh conversations every 30 seconds
      const intervalId = setInterval(fetchConversations, 30000);
      return () => clearInterval(intervalId);
    }
  }, [user]);

  // Fetch messages for the selected conversation
  useEffect(() => {
    if (selectedConversation) {
      const fetchMessages = async () => {
        try {
          setLoading(true);
          const response = await apiClient.get(`/api/chat/messages/${selectedConversation._id}`);
          setMessages(Array.isArray(response.data) ? response.data : []);
          
          // Reset unread count for selected conversation
          setUnreadCounts(prev => ({
            ...prev,
            [selectedConversation._id]: 0
          }));
          
          // Inform server that messages are read
          if (socket) {
            socket.emit('markAsRead', { 
              conversationId: selectedConversation._id,
              userId: user._id
            });
          }
          
          setLoading(false);
        } catch (error) {
          console.error("Error fetching messages:", error);
          toast.error("Failed to load messages");
          setLoading(false);
          setMessages([]);
        }
      };

      fetchMessages();
      
      // Poll for new messages every 10 seconds as a fallback if socket fails
      const intervalId = setInterval(fetchMessages, 10000);
      return () => clearInterval(intervalId);
    }
  }, [selectedConversation, socket, user]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter conversations based on search term (for admin)
  const filteredConversations = Array.isArray(conversations) 
    ? conversations.filter((conversation) => {
        if (!conversation) return false;
        
        const searchableText = 
          user?.role === "admin" 
            ? `${conversation.user?.name || ""} ${conversation.serviceProvider?.name || ""}`
            : conversation.user?.name || conversation.serviceProvider?.name || "";
        
        return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : [];

  // Handle sending a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const messageData = {
        conversationId: selectedConversation._id,
        content: newMessage,
      };
      
      // Optimistically add message to UI
      const optimisticMessage = {
        _id: Date.now().toString(),
        conversation: selectedConversation._id,
        sender: user._id,
        senderType: user.role,
        content: newMessage,
        createdAt: new Date().toISOString(),
        isRead: false,
        isOptimistic: true // Flag to identify optimistic messages
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");
      
      // If socket is available and connected, send through socket
      if (socket && socket.connected) {
        socket.emit('sendMessage', messageData, (ackData) => {
          if (ackData && ackData.error) {
            console.error("Socket message error:", ackData.error);
            toast.error("Failed to send message via socket");
            // Fallback to API
            sendMessageViaAPI(messageData, optimisticMessage);
          }
        });
      } else {
        // Fallback to REST API
        sendMessageViaAPI(messageData, optimisticMessage);
      }
    } catch (error) {
      console.error("Error preparing message:", error);
      toast.error("Failed to prepare message");
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.isOptimistic));
    }
  };
  
  // Helper function to send message via API
  const sendMessageViaAPI = async (messageData, optimisticMessage) => {
    try {
      const response = await apiClient.post("/api/chat/messages", messageData);
      
      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg._id === optimisticMessage._id ? response.data : msg
      ));
    } catch (error) {
      console.error("Error sending message via API:", error);
      toast.error("Failed to send message");
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
    }
  };

  // Create a new conversation (for users and service providers)
  const handleCreateConversation = async () => {
    try {
      console.log("Creating conversation with API URL:", `${apiClient.defaults.baseURL}/api/chat/conversations`);
      const response = await apiClient.post("/api/chat/conversations", {});
      
      // If no socket, update state directly
      if (!socket) {
        setConversations(prev => [response.data, ...prev]);
        setSelectedConversation(response.data);
      }
      
      // With socket, the newConversation event will handle state updates
      
      return response.data;
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
      return null;
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Get conversation name based on user role
  const getConversationName = (conversation) => {
    if (!conversation) return "Unnamed";
    
    if (user?.role === "admin") {
      return conversation.user?.name || conversation.serviceProvider?.name || "Unnamed";
    } else if (user?.role === "user" || user?.role === "serviceProvider") {
      return "Chat with Admin Support";
    }
    return "Unnamed";
  };

  // Ensure user object exists to prevent potential errors
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <div>Loading user information...</div>
      </div>
    );
  }

  // Simplified view for users and service providers
  if (user.role === "user" || user.role === "serviceProvider") {
    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] bg-gray-100">
        {/* Chat Header */}
        <div className="p-4 border-b bg-white">
          <h3 className="text-lg font-semibold">Chat with Admin Support</h3>
          <p className="text-sm text-gray-500">
            Need help? Our admin team is here to assist you.
          </p>
        </div>

        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
          {loading && !messages.length ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : !selectedConversation ? (
            <div className="flex flex-col justify-center items-center h-full">
              <p className="text-gray-500 mb-4">Start a conversation with admin support</p>
              <button
                onClick={handleCreateConversation}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Start New Conversation
              </button>
            </div>
          ) : messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${
                    message.sender === user._id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender === user._id
                        ? "bg-blue-500 text-white"
                        : "bg-white border"
                    } ${message.isOptimistic ? "opacity-70" : ""}`}
                  >
                    <div>{message.content}</div>
                    <div
                      className={`text-xs mt-1 flex items-center justify-between ${
                        message.sender === user._id ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      {message.isOptimistic && (
                        <span className="ml-2">Sending...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-500">
              No messages yet. Start the conversation with our admin team!
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedConversation && (
          <div className="p-4 border-t bg-white">
            <form onSubmit={handleSendMessage} className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message to admin support..."
                className="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 rounded-r hover:bg-blue-600"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // Admin view with conversation list
  return (
    <div className="flex h-[calc(100vh-6rem)] bg-gray-100">
      {/* Conversation List */}
      <div className="w-1/4 bg-white border-r overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-xl font-semibold">Support Conversations</h2>
          <div className="mt-2">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-y-auto flex-grow">
          {loading && filteredConversations.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation._id}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-100 transition ${
                    selectedConversation?._id === conversation._id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="font-semibold flex justify-between">
                    <span>{getConversationName(conversation)}</span>
                    {unreadCounts[conversation._id] > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-500 rounded-full">
                        {unreadCounts[conversation._id]}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 flex justify-between">
                    <span className="truncate">
                      {conversation.lastMessage || "No messages yet"}
                    </span>
                    <span>{conversation.updatedAt ? formatDate(conversation.updatedAt) : ""}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No support conversations found
              </div>
            )
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-3/4 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-white">
              <h3 className="text-lg font-semibold">
                {getConversationName(selectedConversation)}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedConversation.user ? "User Support" : "Service Provider Support"}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-grow p-4 overflow-y-auto bg-gray-50">
              {loading && !messages.length ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message._id}
                      className={`flex ${
                        message.sender === user._id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.sender === user._id
                            ? "bg-blue-500 text-white"
                            : "bg-white border"
                        } ${message.isOptimistic ? "opacity-70" : ""}`}
                      >
                        <div>{message.content}</div>
                        <div
                          className={`text-xs mt-1 flex items-center justify-between ${
                            message.sender === user._id ? "text-blue-100" : "text-gray-500"
                          }`}
                        >
                          <span>{formatTime(message.createdAt)}</span>
                          {message.isOptimistic && (
                            <span className="ml-2">Sending...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>
              ) : (
                <div className="flex justify-center items-center h-full text-gray-500">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 rounded-r hover:bg-blue-600"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center h-full text-gray-500">
            Select a conversation to provide support
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat; 