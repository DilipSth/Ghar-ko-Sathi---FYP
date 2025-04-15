import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './authContext';
import PropTypes from 'prop-types';
import { SocketContext } from './SocketContext';

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(import.meta.env.VITE_BASE_URL || 'http://localhost:8000', {
      auth: { token: localStorage.getItem('token') }
    });

    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('Connected to server with socket ID:', socketInstance.id);
      
      // Register user with socket
      if (user && user._id) {
        socketInstance.emit('register', { 
          userId: user._id, 
          role: user.role 
        });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Save socket instance to state
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default SocketProvider;
