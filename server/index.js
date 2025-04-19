import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
import usersRouter from "./routes/users.js";
import chatRouter from "./routes/chat.js";
import paymentsRouter from "./routes/payments.js";
import bookingsRouter from "./routes/bookings.js";
import connectToDatabase from "./db/db.js";
import http from "http";
import initializeSocket from "./components/socket/index.js";

dotenv.config();
connectToDatabase();

const app = express();
const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

// Initialize socket.io with modular components
initializeSocket(server);

app.use("/public", express.static("public"));
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/services", servicesRouter);
app.use("/api/users", usersRouter);
app.use("/api/chat", chatRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/bookings", bookingsRouter);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
