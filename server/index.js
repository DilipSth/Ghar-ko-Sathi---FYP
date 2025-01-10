import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
// import serviceProvidersRouter from "./routes/serviceProviders.js";
import connectToDatabase from "./db/db.js";

dotenv.config();
connectToDatabase();

const app = express();
const PORT = process.env.PORT || 8000;

app.use("/public", express.static("public"));
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/services", servicesRouter);
// app.use("/api/serviceProviders", serviceProvidersRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
