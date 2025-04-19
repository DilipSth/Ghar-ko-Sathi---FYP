/**
 * Find the socket ID for a specific user
 * @param {Map} connectedUsers - Map of connected users (socketId -> {userId, role})
 * @param {String} userId - User ID to find
 * @param {String} role - Optional role to match (if specified)
 * @returns {String|null} Socket ID or null if not found
 */
const findSocketId = (connectedUsers, userId, role = null) => {
  for (const [socketId, info] of connectedUsers) {
    if (
      info.userId === userId && 
      (role === null || info.role === role)
    ) {
      return socketId;
    }
  }
  return null;
};

/**
 * Find socket IDs for multiple users
 * @param {Map} connectedUsers - Map of connected users (socketId -> {userId, role})
 * @param {Array} userIds - Array of user IDs to find
 * @returns {Array} Array of socket IDs
 */
const findSocketIdsForUsers = (connectedUsers, userIds) => {
  const socketIds = [];
  for (const [socketId, info] of connectedUsers) {
    if (userIds.includes(info.userId)) {
      socketIds.push(socketId);
    }
  }
  return socketIds;
};

export { findSocketId, findSocketIdsForUsers }; 