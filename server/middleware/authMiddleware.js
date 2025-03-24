import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ServiceProvider from "../models/ServiceProvider.js";

const verifyUser = async (req, res, next) => {
  try {
    // Extract token from the Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: "Token Not Provided" });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    if (!decoded) {
      return res.status(401).json({ success: false, error: "Invalid Token" });
    }

    // Find the user in the User model
    let user = await User.findById(decoded._id).select("-password");
    if (!user) {
      // If not found in User model, check the ServiceProvider model
      user = await ServiceProvider.findById(decoded._id).select("-password");
      if (!user) {
        return res.status(404).json({ success: false, error: "User Not Found" });
      }
    }

    // Attach the user to the request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in verifyUser middleware:", error);
    return res.status(500).json({ success: false, error: "Server Error" });
  }
};

export default verifyUser;