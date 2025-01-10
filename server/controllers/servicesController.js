import multer from "multer";
import path from "path";
import Services from "../models/Services.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => { // Fixed key to "destination"
    cb(null, "public/servicesPhotoUpload");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Fixed typo from Data.now() to Date.now()
  },
});

const upload = multer({ storage });

const addServices = async (req, res) => {
  try {
    const { ser_name } = req.body;

    const newService = new Services({
      ser_name,
      serviceImage: req.file ? req.file.filename : "", // Correctly handling file upload
    });

    const savedService = await newService.save();

    return res.status(200).json({ success: true, service: savedService }); // Return single service object instead of array
  } catch (error) {
    console.error("Error adding service:", error);
    return res.status(500).json({ success: false, error: "Add Services Server Error" });
  }
};

const getServices = async (req, res) => {
  try {
    const services = await Services.find();
    return res.status(200).json({ success: true, services });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Get Services Server Error" });
  }
};


export { upload, addServices, getServices };