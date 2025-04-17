import { useContext } from 'react';
import { SocketContext } from './SocketContext';

// Custom hook to access the socket context
export const useSocket = () => {
  const { socket } = useContext(SocketContext);
  return socket;
}; 