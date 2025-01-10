import mongoose from "mongoose";

const gharUsersSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ["male", "female", "other"], required: true },
  services: { type: [String], required: true },
  question: { type: [String], required: true },
  citizenship: { type: String },
  certification: { type: String },
  profileImage: { type: String },
  createAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const GharUsers = mongoose.model("GharUsers", gharUsersSchema);

export default GharUsers;
