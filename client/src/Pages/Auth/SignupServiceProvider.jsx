import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { NavLink, useNavigate } from "react-router-dom";
import { fetchServices } from "../../utils/servicesHelper";

const SignupServiceProvider = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [currentSection, setCurrentSection] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    dob: "",
    gender: "",
    phoneNo: "",
    password: "",
    services: "",
    role: "serviceProvider",
    profileImage: null,
    citizenshipImage: null,
    certificationImage: null,
    question: "",
  });

  useEffect(() => {
    const getServices = async () => {
      try {
        const services = await fetchServices();
        setServices(services || []); // Ensure services is always an array
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    getServices();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    for (const key in formData) {
      data.append(key, formData[key]);
    }

    try {
      const response = await axios.post(
        "http://localhost:8000/api/auth/registerServiceProvider",
        data,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (response.status === 201) {
        toast.success("Registration successful admin will notify you soon!");
        navigate("/");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.error || "An error occurred during registration."
      );
    }
  };

  const nextSection = () => {
    setCurrentSection(2);
  };

  const prevSection = () => {
    setCurrentSection(1);
  };

  return (
    <div className="relative flex flex-col md:flex-row h-screen bg-gradient-to-r from-sky-500 to-blue-600 overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-300 opacity-30 rounded-full transform -translate-x-1/4"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-full bg-blue-300 opacity-30 rounded-full transform translate-x-1/4"></div>

      {/* SignupServiceProvider Form Section */}
      <div className="relative z-10 flex-1 flex justify-center items-center p-5">
        <form
          className="w-full max-w-lg p-8 bg-white border border-gray-300 rounded-lg shadow-lg transform transition-transform"
          onSubmit={handleSubmit}
        >
          <h2 className="text-3xl font-bold text-center mb-6 text-blue-700">
            Sign Up as Service Provider
          </h2>
          
          {/* Progress indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentSection === 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>1</div>
              <div className="w-16 h-1 bg-gray-300"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentSection === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>2</div>
            </div>
          </div>

          {/* Section 1: Personal Information */}
          {currentSection === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Personal Information</h3>
              
              {/* Name Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Type Your Name"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Email Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Type Your Email"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Date of Birth Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Gender Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Phone Number Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phoneNo"
                  value={formData.phoneNo}
                  onChange={handleChange}
                  placeholder="Type Your Number"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="**********"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Next Button */}
              <button
                type="button"
                onClick={nextSection}
                className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Next
              </button>
            </div>
          )}

          {/* Section 2: Service Information */}
          {currentSection === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Service Information</h3>
              
              {/* Profile Image */}
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Profile Image
                </label>
                <input
                  type="file"
                  name="profileImage"
                  onChange={handleChange}
                  accept="image/*"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              {/* Citizenship Image */}
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Citizenship Image
                </label>
                <input
                  type="file"
                  name="citizenshipImage"
                  onChange={handleChange}
                  accept="image/*"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              {/* Services Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Services
                </label>
                <select
                  name="services"
                  value={formData.services}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  multiple={false}
                >
                  <option value="">Select Services</option>
                  {services.length > 0 ? (
                    services.map((ser) => (
                      <option key={ser._id} value={ser._id}>
                        {ser.ser_name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No services available
                    </option>
                  )}
                </select>
              </div>

              {/* Certification Image */}
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Certification Image
                </label>
                <input
                  type="file"
                  name="certificationImage"
                  onChange={handleChange}
                  accept="image/*"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              {/* Service Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Describe about the Service you provide....
                </label>
                <textarea
                  name="question"
                  value={formData.question}
                  onChange={handleChange}
                  placeholder="Type Your Answer"
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={prevSection}
                  className="w-1/2 bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm">
            Have an account?{" "}
            <NavLink to="/" className="text-blue-600 hover:underline">
              Login
            </NavLink>
          </p>
        </form>
      </div>

      {/* Welcome Section */}
      <div className="relative z-10 flex-1 flex justify-center items-center text-white p-10">
        <div>
          <h1 className="text-5xl font-extrabold mb-4">
            Join Ghar Ko Sathi Today!
          </h1>
          <p className="text-lg mb-2">
            Sign up to access reliable home repair services.
          </p>
          <p className="text-lg">Your trusted partner for home maintenance!</p>
        </div>
      </div>
    </div>
  );
};

export default SignupServiceProvider;
