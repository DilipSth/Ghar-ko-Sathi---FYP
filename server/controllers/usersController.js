import User from "../models/User.js";
import ServiceProvider from "../models/ServiceProvider.js";


const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Get Users Server Error" });
  }
};


const getServiceProvider = async (req, res) => {
  try {
    const serviceProviders = await ServiceProvider.find();
    return res.status(200).json({ success: true, serviceProviders });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Get Service Providers Server Error" });
  }
};

export { getUsers, getServiceProvider };
