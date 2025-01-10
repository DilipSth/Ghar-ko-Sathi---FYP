import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import GharUsers from "../models/GharUsers.js";
import User from "../models/User.js";
import services from "../models/Services.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/servicesPhotoUpload");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const addGharUsers = async (req, res) => {
  try {
    const { name, email, dob, gender, services, password, role, phoneNo } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phoneNo,
      profileImage: req.file ? req.file.filename : "",

    });
    const savedUser = await newUser.save();

    // Add services only if the role is serviceProvider
    const newGharUser = new GharUsers({
      userId: savedUser._id,
      dob,
      gender,
      services: role === "serviceProvider" ? services : [],
      citizenship: req.file ? req.file.filename : "",
      certification: req.file ? req.file.filename : "",
      question,
    });
    await newGharUser.save();

    res.status(200).json({ success: true, message: "User created." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error adding user." });
  }
};

const getGharUsers = async (req, res) => {
  try {
    const gharUsers = await GharUsers.find()
      .populate("userId", { password: 0 })
      .populate("services");
    res.status(200).json({ success: true, gharUsers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching users." });
  }
};

const getGharUser = async (req, res) => {
  const { id } = req.params;
  try {
    const gharUser = await GharUsers.findById(id)
      .populate("userId", { password: 0 })
      .populate("services");
    if (!gharUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, gharUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching user." });
  }
};

const updateGharUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, services } = req.body; // Removed role from here

    const gharUser = await GharUsers.findById(id);
    
    if (!gharUser) {
      return res.status(404).json({ success: false, message: "Ghar User Not Found" });
    }

    const user = await User.findById(gharUser.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User Not Found" });
    }

    // Update User details
    user.name = name; // Update name
    // Update role only if it's being changed
    if (req.body.role && req.body.role !== user.role) {
      user.role = req.body.role; // Update role
    }

    // Save updated user
    await user.save();

    // Update Ghar User details
    gharUser.gender = gender;
    
    if (user.role === "serviceProvider") { // Only update services if role is serviceProvider
      gharUser.services = services; 
    }

    const updatedGharUser = await gharUser.save();

    res.status(200).json({
      success: true,
      message: "Ghar User Updated",
      gharUser: updatedGharUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error Updating User" });
  }
};



export { addGharUsers, upload, getGharUsers, getGharUser, updateGharUser };
