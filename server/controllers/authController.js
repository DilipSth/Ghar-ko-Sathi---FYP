import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import User from "../models/User.js";
import ServiceProvider from "../models/ServiceProvider.js";
import bcrypt from "bcrypt";

// Multer Configuration of User Register
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/registerImage");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const registerImage = multer({ storage });

// Register User Controller
const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      dob,
      gender,
      phoneNo,
      role = "user",
    } = req.body;

    if (!name || !email || !password || !dob || !gender || !phoneNo) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const profileImage = req.files?.profileImage?.[0]?.filename || null;
    const citizenshipImage = req.files?.citizenshipImage?.[0]?.filename || null;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      dob,
      gender,
      phoneNo,
      role,
      profileImage,
      citizenshipImage,
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    console.error("User registration error:", error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Registration failed. Please try again." });
  }
};

// Register Service Provider Controller
const registerServiceProvider = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      dob,
      gender,
      services,
      phoneNo,
      role = "serviceProvider",
      question,
    } = req.body;

    // Validate inputs
    if (
      !name ||
      !email ||
      !password ||
      !dob ||
      !gender ||
      !phoneNo ||
      !services ||
      !Array.isArray(services)
    ) {
      return res
        .status(400)
        .json({
          error: "All fields are required, and services must be an array",
        });
    }

    const profileImage = req.files?.profileImage?.[0]?.filename || null;
    const citizenshipImage = req.files?.citizenshipImage?.[0]?.filename || null;
    const certificationImage =
      req.files?.certificationImage?.[0]?.filename || null;

    const existingServiceProvider = await ServiceProvider.findOne({ email });
    if (existingServiceProvider) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newServiceProvider = new ServiceProvider({
      name,
      email,
      password: hashedPassword,
      dob,
      gender,
      phoneNo,
      role,
      profileImage,
      citizenshipImage,
      certificationImage,
      question,
      services,
    });

    const savedServiceProvider = await newServiceProvider.save();
    res.status(201).json(savedServiceProvider);
  } catch (error) {
    console.error("Service provider registration error:", error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: validationErrors.join(', ') });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }

    res.status(500).json({ error: "Registration failed. Please try again." });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    let userType = "user";

    if (!user) {
      user = await ServiceProvider.findOne({ email });
      userType = "serviceProvider";

      if (user && user.role === "serviceProvider" && !user.approved) {
        const token = jwt.sign(
          { _id: user._id, role: user.role },
          process.env.JWT_KEY,
          { expiresIn: "10d" }
        );

        return res.status(200).json({
          success: true,
          token,
          user: {
            _id: user._id,
            name: user.name,
            role: user.role,
            approved: false,
          },
          message: "Your account is pending approval from an administrator.",
        });
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Wrong password" });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: "10d" }
    );

    const userData = {
      _id: user._id,
      name: user.name,
      role: user.role,
    };

    if (userType === "serviceProvider") {
      userData.approved = user.approved;
    }

    res.status(200).json({
      success: true,
      token,
      user: userData,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const verify = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ success: false, error: "User Not Found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export {
  login,
  registerUser,
  registerServiceProvider,
  registerImage,
  verify,
}; /*  */
