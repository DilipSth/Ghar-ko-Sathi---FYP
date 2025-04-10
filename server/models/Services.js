import mongoose from "mongoose";

const servicesSchema = new mongoose.Schema({
  ser_name: { type: String, required: true },
  serviceImage: { type: String },
  createAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Services = mongoose.model("Services", servicesSchema);

export default Services;
