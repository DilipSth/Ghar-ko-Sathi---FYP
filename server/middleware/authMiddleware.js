import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ServiceProvider from "../models/ServiceProvider.js";

const verifyUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(404).json({ success: false, error: "Token Not Provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if (!decoded) {
      return res.status(404).json({ success: false, error: "Token Not Valid" });
    }

    let user = await User.findById(decoded._id).select("-password");
    if (!user) {
      user = await ServiceProvider.findById(decoded._id).select("-password");
      if (!user) {
        return res.status(404).json({ success: false, error: "User Not Found" });
      }
      
      // Ensure the approved status is included in the user object
      // No need to modify it, as it's already included in the ServiceProvider model
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("verify user ma problem");
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

export default verifyUser;