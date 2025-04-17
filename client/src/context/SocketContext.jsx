import React, { createContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './authContext';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';

// Create the context without a default value
export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (user && user._id) {
      // Connect to socket.io server
      const newSocket = io(import.meta.env.VITE_API_URL || "http://localhost:8000");
      
      // Connection events
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
        
        // Register with the server using user ID and role
        newSocket.emit('register', { userId: user._id, role: user.role });
      });
      
      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });
      
      // Handle errors
      newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        toast.error('Connection error. Trying to reconnect...', {
          toastId: 'socket-error',
          autoClose: 3000
        });
      });
      
      // Message notifications
      newSocket.on('newMessage', (message) => {
        // This event will be used by the Header component to show notifications
        // and by the Chat component to update messages
        console.log('New message received:', message);
      });

      // Handle message updates
      newSocket.on('messageUpdated', (data) => {
        console.log('Message updated:', data);
        // The actual UI update will be handled by the Chat component
      });

      // Handle message deletions
      newSocket.on('messageDeleted', (data) => {
        console.log('Message deleted:', data);
        // The actual UI update will be handled by the Chat component
      });

      // Handle messages read
      newSocket.on('messagesRead', (data) => {
        console.log('Messages read in conversation:', data);
        // The actual UI update will be handled by the Chat component
      });

      // Handle all messages read
      newSocket.on('allMessagesRead', (data) => {
        console.log('All messages read by user:', data);
        // This can be used to update notification badges
      });
      
      setSocket(newSocket);
      
      // Cleanup on unmount
      return () => {
        if (newSocket) {
          newSocket.disconnect();
          setSocket(null);
        }
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default SocketContext;
