const handleConnection = (socket, connectedUsers) => {
  console.log("New client connected:", socket.id);

  // Handle user registration when they connect
  socket.on("register", (data) => {
    const { userId, role } = data;
    connectedUsers.set(socket.id, { userId, role });
    console.log(`Registered: ${userId} as ${role}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    connectedUsers.delete(socket.id);
    console.log("Client disconnected:", socket.id);
  });
};

export default handleConnection; 