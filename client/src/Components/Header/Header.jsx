/* eslint-disable react/prop-types */
import { useRef, useState, useEffect } from "react";
import { LuBell } from "react-icons/lu";
import { GiHamburgerMenu } from "react-icons/gi";
import { CiPaperplane } from "react-icons/ci";
import { useAuth } from "../../context/authContext";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../../context/useSocket";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Simplify notifications to just show messages and keep them for 12 hours
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for new messages to update notification
    const handleNewMessage = async (message) => {
      // Only show notification for messages not sent by current user
      if (message.sender !== user._id) {
        let senderName = "";
        console.log("Processing message from sender:", message.sender, "type:", message.senderType);
        
        // Check if senderName is already provided in the message
        if (message.senderName) {
          console.log("Using provided sender name:", message.senderName);
          senderName = message.senderName;
        } else {
          // Otherwise fetch it from the API
          try {
            // First determine what type of user the sender is
            if (message.senderType === 'admin') {
              senderName = 'Admin';
            } else if (message.senderType === 'user') {
              // Try to get name from conversation or fetch it
              console.log("Fetching user data for:", message.sender);
              const response = await axios.get(
                `http://localhost:8000/api/users/gharUsers/${message.sender}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );
              console.log("User API response:", response.data);
              senderName = response.data.user?.name || 'User';
            } else {
              // Service provider
              console.log("Fetching service provider data for:", message.sender);
              const response = await axios.get(
                `http://localhost:8000/api/users/serviceProvider/${message.sender}`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                  },
                }
              );
              console.log("Service provider API response:", response.data);
              senderName = response.data.provider?.name || 'Service Provider';
            }
            console.log("Resolved sender name:", senderName);
          } catch (error) {
            console.error("Error fetching sender name:", error);
            // Fallback to role if we can't fetch the name
            senderName = message.senderType === 'admin' ? 'Admin' : 
                         message.senderType === 'user' ? 'User' : 'Service Provider';
          }
        }
        
        // Add to notifications list
        setNotifications(prev => [{
          id: message._id || Date.now(),
          type: 'message',
          content: `${senderName}: ${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`,
          time: new Date(),
          read: false,
          conversationId: message.conversation
        }, ...prev.slice(0, 9)]); // Keep only 10 most recent notifications
        
        // Increment unread count
        setUnreadCount(prev => prev + 1);

        // Log for debugging
        console.log("New message notification added", { sender: senderName, unreadCount: unreadCount + 1 });
        
        // Show toast notification
        toast.success(`New message from ${senderName}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          icon: '👋',
        });
      }
    };

    // Handle message updates
    const handleMessageUpdated = (data) => {
      // Update notification content if the message is in our notifications
      setNotifications(prev => prev.map(notification => {
        if (notification.type === 'message' && notification.id === data.messageId) {
          // Keep the same sender name part and just update the content part
          const parts = notification.content.split(':');
          const senderNamePart = parts[0]; // This contains the sender's name
          
          return { 
            ...notification, 
            content: `${senderNamePart}: ${data.newContent.substring(0, 30)}${data.newContent.length > 30 ? '...' : ''} (edited)`,
            time: new Date() 
          };
        }
        return notification;
      }));
    };

    // Handle message deletions
    const handleMessageDeleted = (data) => {
      // Remove notification if the message is deleted
      setNotifications(prev => prev.filter(notification => 
        !(notification.type === 'message' && notification.id === data.messageId)
      ));
      
      // Update count if we removed an unread notification
      const removedUnread = notifications.some(n => 
        n.type === 'message' && n.id === data.messageId && !n.read
      );
      
      if (removedUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    };

    // Handle messages being marked as read
    const handleAllMessagesRead = () => {
      // Update notification badge to 0
      setUnreadCount(0);
      
      // Mark all notifications as read
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
    };

    // Register event listeners
    socket.on('newMessage', handleNewMessage);
    socket.on('messageUpdated', handleMessageUpdated);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('allMessagesRead', handleAllMessagesRead);
    
    // Initial check for unread messages on component mount
    const checkUnreadMessages = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8000/api/chat/unread-count",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        
        if (response.data.success) {
          setUnreadCount(response.data.count);
          console.log("Initial unread count:", response.data.count);
        }
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    checkUnreadMessages();

    // Clean up event listeners
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageUpdated', handleMessageUpdated);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('allMessagesRead', handleAllMessagesRead);
    };
  }, [socket, user]);

  // Fetch current user data including profile image
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?._id) return;

      try {
        const response = await axios.get(
          "http://localhost:8000/api/users/currentUser",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.data.success) {
          setUserData(response.data.user);
          setImageError(false);
          setImageLoading(true);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setImageError(true);
      }
    };

    fetchUserData();
  }, [user?._id]);

  const handleLogout = () => {
    // Show logout notification based on user role
    if (user) {
      const role = user.role;
      if (role === "admin") {
        toast.success("Admin logged out successfully", {
          icon: '👋',
          duration: 3000,
        });
      } else if (role === "serviceProvider") {
        toast.success("Service provider logged out successfully", {
          icon: '👋',
          duration: 3000,
        });
      } else {
        toast.success("Logged out successfully", {
          icon: '👋',
          duration: 3000,
        });
      }
    }
    
    // Call the logout function from context
    logout();
    navigate("/");
  };

  // Function to get initials from name
  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(word => word[0]).join("").toUpperCase();
  };

  // Navigate to chat page
  const handleChatClick = () => {
    navigate("/dashboard/contact/chat");
  };

  // Mark notifications as read
  const handleNotificationClick = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
    if (!notificationDropdownOpen && unreadCount > 0) {
      // Mark notifications as read in UI
      setUnreadCount(0);
      setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
      
      // Also update the backend
      try {
        axios.post(
          "http://localhost:8000/api/chat/mark-all-read",
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        console.log("Marked all notifications as read");
      } catch (err) {
        console.error("Error marking notifications as read:", err);
      }

      // If socket connected, emit event for real-time update
      if (socket && socket.connected && user) {
        socket.emit('markAllAsRead', { userId: user._id });
      }
    }
  };

  // Navigate to specific conversation
  const handleNotificationItemClick = (notification) => {
    if (notification.type === 'message' && notification.conversationId) {
      navigate("/dashboard/contact/chat", { state: { conversationId: notification.conversationId } });
      setNotificationDropdownOpen(false);
    }
  };

  // Format timestamp for notifications
  const formatNotificationTime = (time) => {
    const now = new Date();
    const timeDiff = Math.floor((now - new Date(time)) / 1000); // seconds
    
    if (timeDiff < 60) return 'Just now';
    if (timeDiff < 3600) return `${Math.floor(timeDiff / 60)}m ago`;
    if (timeDiff < 86400) return `${Math.floor(timeDiff / 3600)}h ago`;
    return `${Math.floor(timeDiff / 86400)}d ago`;
  };

  // Profile image component
  const ProfileImage = () => {
    const profileImage = userData?.profileImage;

    if (!profileImage || imageError) {
      return (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {getInitials(userData?.name || user?.name)}
          </span>
        </div>
      );
    }

    return (
      <>
        <img
          src={`http://localhost:8000/public/registerImage/${profileImage}`}
          alt={userData?.name || "Profile"}
          className={`w-8 h-8 rounded-full object-cover ${imageLoading ? 'hidden' : ''}`}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
          onLoad={() => setImageLoading(false)}
        />
        {imageLoading && (
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        )}
      </>
    );
  };

  return (
    <header className="bg-white border-b border-gray-300 shadow-xl">
      <nav className="mx-auto flex max-w-[2000px] items-center justify-between py-2 px-6 lg:px-8">
        <div className="text-center text-[#E0E0E0] items-center flex gap-5">
          <button
            onClick={toggleSidebar}
            className="text-[#333333] text-[24px] lg:hidden focus:outline-none"
          >
            <GiHamburgerMenu />
          </button>

          <div className="max-lg:hidden">
            <h1 className="font-semibold text-lg max-sm:text-base max-sm:font-bold text-left text-[#333333]">
              {userData?.name || user?.name || 'Welcome'}
            </h1>
            <p className="text-sm max-sm:text-sm font-light text-[#333333]">
              Where your service needs meet expert hands.
            </p>
          </div>
        </div>

        <div className="flex items-center lg:justify-end gap-10 max-sm:gap-4">
          <div className="flex flex-row gap-5">
            <span onClick={handleChatClick} className="cursor-pointer relative">
              <CiPaperplane className="text-[#333333] text-[24px] transition ease-in-out duration-500 max-sm:text-[18px] hover:text-blue-500" />
            </span>
            <span className="relative" ref={notificationRef}>
              <div 
                onClick={handleNotificationClick}
                className="cursor-pointer relative"
              >
                <LuBell className="text-[#333333] text-[24px] transition ease-in-out duration-500 max-sm:text-[18px] hover:text-blue-500" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              
              {notificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-md py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                    <p className="text-sm font-medium text-gray-900">Notifications</p>
                    {notifications.length > 0 && (
                      <button className="text-xs text-blue-500 hover:text-blue-700">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-500 text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id}
                          onClick={() => handleNotificationItemClick(notification)}
                          className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <p className="text-sm text-gray-800">{notification.content}</p>
                            <span className="text-xs text-gray-500">{formatNotificationTime(notification.time)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="px-4 py-2 border-t border-gray-100 text-center">
                    <button 
                      onClick={() => navigate('/dashboard/contact/chat')}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      View all messages
                    </button>
                  </div>
                </div>
              )}
            </span>
          </div>

          {/* Dropdown for user or service provider */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2 text-[#333333]"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <ProfileImage />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userData?.name || user?.name}</p>
                  <p className="text-xs text-gray-500">{userData?.email || user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
