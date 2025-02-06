import User from "../models/User.js";
import ServiceProvider from "../models/ServiceProvider.js";

const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Get Users Server Error" });
  }
};

const getServiceProvider = async (req, res) => {
  try {
    const serviceProviders = await ServiceProvider.find();
    return res.status(200).json({ success: true, serviceProviders });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Get Service Providers Server Error" });
  }
};

const getServiceProviderById = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.status(200).json({ success: true, provider });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

const updateServiceProvider = async (req, res) => {
  try {
    const { name, email, phoneNo, role, dob, gender, services, question} = req.body;
    const provider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNo, role, dob, gender, services, question},
      { new: true }
    );
    if (!provider) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.status(200).json({ success: true, provider });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

const deleteServiceProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findByIdAndDelete(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

export {
  getUsers,
  getServiceProvider,
  getServiceProviderById,
  updateServiceProvider,
  deleteServiceProvider,
};