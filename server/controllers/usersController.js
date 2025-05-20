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

// Get the current logged-in user
const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    return res.status(200).json({ success: true, user: req.user });
  } catch (error) {
    console.error("Error fetching current user:", error);
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
    const serviceProviders = await ServiceProvider.find().populate("services");
    return res.status(200).json({ success: true, serviceProviders });
  } catch (error) {
    console.error("Error fetching service providers:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

// Get a service provider by ID
const getServiceProviderById = async (req, res) => {
  try {
    const provider = await ServiceProvider.findById(req.params.id).populate(
      "services"
    );
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

// Update a user
const updateUser = async (req, res) => {
  try {
    const { name, email, phoneNo, role, dob, gender, password } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNo, role, dob },
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

// Update a service provider
const updateServiceProvider = async (req, res) => {
  try {
    const { name, email, phoneNo, role, dob, gender, services, question } =
      req.body;
    const provider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { name, email, phoneNo, role, dob, gender, services, question },
      { new: true }
    ).populate("services");
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

// Approve or reject a service provider
const approveServiceProvider = async (req, res) => {
  try {
    const { approved } = req.body;

    if (typeof approved !== "boolean") {
      return res
        .status(400)
        .json({ success: false, error: "Approved status must be a boolean" });
    }

    const provider = await ServiceProvider.findByIdAndUpdate(
      req.params.id,
      { approved },
      { new: true }
    ).populate("services");

    if (!provider) {
      return res
        .status(404)
        .json({ success: false, error: "Provider not found" });
    }

    return res.status(200).json({
      success: true,
      provider,
      message: approved
        ? "Provider approved successfully"
        : "Provider approval revoked",
    });
  } catch (error) {
    console.error("Error approving/rejecting service provider:", error);
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

// Get the counts of users and service providers
const getUsersAndProvidersCount = async (req, res) => {
  try {
    const userCount = await User.countDocuments({ role: 'user' });
    const serviceProviderCount = await ServiceProvider.countDocuments({});
    const totalCount = userCount + serviceProviderCount;
    return res.status(200).json({ success: true, userCount, serviceProviderCount, totalCount });
  } catch (error) {
    console.error("Error fetching user and service provider counts:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

export {
  getUsers,
  getCurrentUser,
  getUserById,
  updateUser,
  deleteUser,
  getServiceProvider,
  getServiceProviderById,
  updateServiceProvider,
  approveServiceProvider,
  deleteServiceProvider,
  getUsersAndProvidersCount,
};
