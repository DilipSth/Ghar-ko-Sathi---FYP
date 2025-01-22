import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import User from "../models/User.js";
import ServiceProvider from "../models/ServiceProvider.js";
import bcrypt from "bcrypt";

// Multer Configuration of User Register
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/registerImage"); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to filenames
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

    // Validate inputs
    if (!name || !email || !password || !dob || !gender || !phoneNo) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Image paths
    const profileImage = req.files?.profileImage?.[0]?.filename || null;
    const citizenshipImage = req.files?.citizenshipImage?.[0]?.filename || null;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
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
    res.status(500).json({ error: error.message });
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
    if (!name || !email || !password || !dob || !gender || !phoneNo || !services) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Image paths
    const profileImage = req.files?.profileImage?.[0]?.filename || null;
    const citizenshipImage = req.files?.citizenshipImage?.[0]?.filename || null;
    const certificationImage =
      req.files?.certificationImage?.[0]?.filename || null;

    // Check for existing ServiceProvider
    const existingServiceProvider = await ServiceProvider.findOne({ email });
    if (existingServiceProvider) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save ServiceProvider
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
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ success: false, error: "User not Found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(404).json({ success: false, error: "Wrong Password" });
    }

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: "10d" }
    );
    // console.log("hello world",token);
    res.status(200).json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, role: user.role },
    });
  } catch (error) {
    // console.log("yeta tira login authcontroooler");
    res.status(500).json({ success: false, error: error.message });
  }
};

const verify = (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// const getUsers = async (req, res) => {
//   try {
//     const users = await User.find();
//     return res.status(200).json({ success: true, users });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: "Get Users Server Error" });
//   }
// };


// const getServiceProvider = async (req, res) => {
//   try {
//     const serviceProviders = await ServiceProvider.find();
//     return res.status(200).json({ success: true, serviceProviders });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: "Get Service Providers Server Error" });
//   }
// };

export { login, registerUser, registerServiceProvider, registerImage, verify};
