import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  role: {
    type: String,
    enum: ["admin", "serviceProvider", "user"],
    required: true,
    default: "user",
  },
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  image: { type: String },
  createAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

export default User;
