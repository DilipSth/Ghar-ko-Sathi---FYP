import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import User from "../models/User.js";
import bcrypt from "bcrypt";


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/userCitizenship");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const uploadUser = multer({ storage });

const register = async (req, res) => {
  try {
    const { name, email, password, dob, gender, phoneNo, role = "user" } =
      req.body;
    const image = req.file ? path.join("uploads", req.file.filename) : null;

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
      image,
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
  return res.status(200).json({ success: true, user: req.user });
};

export { login, register, verify, uploadUser };


