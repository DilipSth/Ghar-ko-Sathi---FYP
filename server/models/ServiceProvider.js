import mongoose from "mongoose";

const ServiceProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phoneNo: { type: Number, required: true },
  role: {
    type: String,
    enum: ["admin", "serviceProvider", "user"],
    required: true,
    default: "serviceProvider",
  },
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  image: { type: String },
  name: { type: String, required: true },


  createAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ServiceProvider = mongoose.model("ServiceProvider", ServiceProviderSchema);

export default ServiceProvider;
