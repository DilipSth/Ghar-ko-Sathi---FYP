import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { NavLink, useNavigate } from "react-router-dom";
import { fetchServices } from "../../utils/servicesHelper";

const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

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
    services: [],
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
    const { name, value, files, type } = e.target;
    
    if (files) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else if (name === 'services') {
      // Handle services selection
      const selectedServices = Array.from(e.target.selectedOptions).map(option => option.value);
      setFormData(prev => ({ ...prev, services: selectedServices }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate second section fields
      if (!formData.services.length) {
        throw new Error("Please select at least one service");
      }
      if (!formData.question.trim()) {
        throw new Error("Service description is required");
      }
      if (!formData.profileImage) {
        throw new Error("Profile image is required");
      }
      if (!formData.citizenshipImage) {
        throw new Error("Citizenship image is required");
      }
      
      const data = new FormData();
      
      // Handle regular fields
      Object.keys(formData).forEach(key => {
        if (key === 'services') {
          // Append each service ID separately
          formData.services.forEach(serviceId => {
            data.append('services[]', serviceId);
          });
        } else if (key.includes('Image')) {
          // Handle file fields only if they exist
          if (formData[key]) {
            data.append(key, formData[key]);
          }
        } else {
          data.append(key, formData[key]);
        }
      });

      const response = await axios.post(
        "http://localhost:8000/api/auth/registerServiceProvider",
        data,
        {
          headers: { 
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      if (response.status === 201) {
        toast.success("Registration successful! Admin will notify you soon!");
        navigate("/");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      toast.error(errorMessage);
      console.error("Registration error:", error);
    }
  };

  const nextSection = () => {
    try {
      // Validate first section fields
      if (!formData.name.trim()) {
        throw new Error("Name is required");
      }
      if (!formData.email.trim()) {
        throw new Error("Email is required");
      }
      if (!formData.dob) {
        throw new Error("Date of Birth is required");
      }
      if (!formData.gender) {
        throw new Error("Please select your gender");
      }
      if (!formData.phoneNo.trim()) {
        throw new Error("Phone number is required");
      }
      
      // Enhanced password validation - prioritize this check
      if (!formData.password || formData.password.trim() === '') {
        throw new Error("Password is required");
      }
      if (formData.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }
      
      // If validation passes, move to next section
      setCurrentSection(2);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const prevSection = () => {
    setCurrentSection(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-sky-500 to-blue-600 py-8 px-4 sm:px-6 lg:px-8 overflow-y-auto">
      {/* Decorative shapes with fixed positioning */}
      <div className="fixed top-0 left-0 w-1/2 h-full bg-blue-300 opacity-30 rounded-full transform -translate-x-1/4 -z-10"></div>
      <div className="fixed bottom-0 right-0 w-1/2 h-full bg-blue-300 opacity-30 rounded-full transform translate-x-1/4 -z-10"></div>

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 items-start">
        {/* Form Section */}
        <div className="w-full max-w-lg mx-auto">
          <form
            className="bg-white shadow-xl rounded-xl p-8 mb-8 overflow-y-auto"
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

            {/* Form Sections */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto px-2 custom-scrollbar">
              {currentSection === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 sticky top-0 bg-white py-2">
                    Personal Information
                  </h3>
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
                </div>
              )}

              {currentSection === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4 sticky top-0 bg-white py-2">
                    Service Information
                  </h3>
                  {/* Services Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Services
                    </label>
                    <div className="relative">
                      <select
                        name="services"
                        value={formData.services}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        multiple={true}
                        size={5}
                      >
                        {services.length > 0 ? (
                          services.map((ser) => (
                            <option 
                              key={ser._id} 
                              value={ser._id}
                              className="py-2 px-4 hover:bg-blue-50"
                            >
                              {ser.ser_name}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No services available
                          </option>
                        )}
                      </select>
                      <p className="mt-2 text-sm text-gray-500 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                        </svg>
                        Hold Ctrl (Windows) or Command (Mac) to select multiple services
                      </p>
                    </div>
                  </div>

                  {/* File Upload Fields with Preview */}
                  <div className="space-y-6">
                    {['profile', 'citizenship', 'certification'].map((type) => (
                      <div key={type} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 capitalize mb-2">
                          {type} Image {type !== 'certification' && '*'}
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                          <div className="space-y-1 text-center">
                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div className="flex text-sm text-gray-600">
                              <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                <span>Upload a file</span>
                                <input
                                  type="file"
                                  name={`${type}Image`}
                                  onChange={handleChange}
                                  accept="image/*"
                                  className="sr-only"
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                          </div>
                        </div>
                        {formData[`${type}Image`] && (
                          <p className="mt-2 text-sm text-green-600">
                            ✓ File selected: {formData[`${type}Image`].name}
                          </p>
                        )}
                      </div>
                    ))}
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
                </div>
              )}
            </div>

            {/* Navigation Buttons - Sticky at bottom */}
            <div className="sticky bottom-0 bg-white pt-4 mt-6 border-t">
              {currentSection === 2 ? (
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={prevSection}
                    className="w-1/2 bg-gray-300 text-gray-800 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={nextSection}
                  className="w-full bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-white">
            Have an account?{" "}
            <NavLink to="/" className="font-semibold hover:text-blue-200 transition-colors">
              Login
            </NavLink>
          </p>
        </div>

        {/* Welcome Section */}
        <div className="hidden md:block text-white p-10">
          <div className="sticky top-10">
            <h1 className="text-5xl font-extrabold mb-4">
              Join Ghar Ko Sathi Today!
            </h1>
            <p className="text-lg mb-2">
              Sign up to access reliable home repair services.
            </p>
            <p className="text-lg">
              Your trusted partner for home maintenance!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupServiceProvider;
