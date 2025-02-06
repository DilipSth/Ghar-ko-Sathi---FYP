import User from "../models/User.js";
import ServiceProvider from "../models/ServiceProvider.js";

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Get a user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Update a user
const updateUser = async (req, res) => {
  try {
    const { name, email, phoneNo, role, dob, gender, profileImage, citizenshipImage } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNo, role, dob, gender, profileImage, citizenshipImage },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Get all service providers
const getServiceProvider = async (req, res) => {
  try {
    const serviceProviders = await ServiceProvider.find();
    return res.status(200).json({ success: true, serviceProviders });
  } catch (error) {
    console.error("Error fetching service providers:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Get a service provider by ID
const getServiceProviderById = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id);
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, error: "Provider not found" });
    }
    return res.status(200).json({ success: true, provider });
  } catch (error) {
    console.error("Error fetching service provider by ID:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Update a service provider
const updateServiceProvider = async (req, res) => {
  try {
    const { name, email, phoneNo, role, dob, gender, services, question } =
      req.body;
    const provider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNo, role, dob, gender, services, question },
      { new: true }
    );
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, error: "Provider not found" });
    }
    return res.status(200).json({ success: true, provider });
  } catch (error) {
    console.error("Error updating service provider:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Delete a service provider
const deleteServiceProvider = async (req, res) => {
  try {
    const provider = await ServiceProvider.findByIdAndDelete(req.params.id);
    if (!provider) {
      return res
        .status(404)
        .json({ success: false, error: "Provider not found" });
    }
    return res.status(200).json({ success: true, message: "Provider deleted" });
  } catch (error) {
    console.error("Error deleting service provider:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};
export {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getServiceProvider,
  getServiceProviderById,
  updateServiceProvider,
  deleteServiceProvider,
};
