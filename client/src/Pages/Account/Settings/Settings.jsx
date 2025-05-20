import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../../../context/authContext";
import { toast } from "react-toastify";

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [activeTab, setActiveTab] = useState("general");
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phoneNo: "",
    dob: "",
    gender: "",
    role: "",
    services: [],
    question: "",
    profileImage: "",
  });

  // Fetch all available services
  const fetchServices = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/services",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        setAvailableServices(response.data.services);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  };

  useEffect(() => {
    fetchUserData();
    if (user?.role === "serviceProvider") {
      fetchServices();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user || !user._id) return;

    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost:8000/api/users/currentUser",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        const fetchedUser = response.data.user;
        
        // For service providers, handle services as IDs
        let serviceIds = [];
        if (fetchedUser.services && Array.isArray(fetchedUser.services)) {
          serviceIds = fetchedUser.services.map(service => 
            typeof service === 'object' ? service._id : service
          );
          setSelectedServices(serviceIds);
        }

        setUserData({
          name: fetchedUser.name || "",
          email: fetchedUser.email || "",
          phoneNo: fetchedUser.phoneNo || "",
          dob: fetchedUser.dob
            ? new Date(fetchedUser.dob).toISOString().split("T")[0]
            : "",
          gender: fetchedUser.gender || "",
          role: fetchedUser.role || "",
          services: serviceIds,
          question: fetchedUser.question || "",
          profileImage: fetchedUser.profileImage || "",
        });
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to load user data. Please try again.");
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleServiceChange = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleProfileImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      setSubmitting(true);
      const endpoint = user.role === 'serviceProvider' 
        ? `http://localhost:8000/api/users/serviceProvider/upload/${user._id}`
        : `http://localhost:8000/api/users/upload/${user._id}`;

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        setUserData(prev => ({
          ...prev,
          profileImage: response.data.filename
        }));
        setImageError(false);
        toast.success("Profile image updated successfully");
      }
    } catch (err) {
      console.error("Error uploading profile image:", err);
      toast.error("Failed to upload profile image");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage("");

    try {
      // Create payload with only the required fields
      const payload = {
        name: userData.name,
        email: userData.email,
        phoneNo: userData.phoneNo,
        dob: userData.dob,
        gender: userData.gender,
        role: userData.role,
      };

      // Add service provider fields if applicable
      if (userData.role === "serviceProvider") {
        payload.services = selectedServices;
        payload.question = userData.question;
      }

      // Determine endpoint based on user role
      const endpoint =
        userData.role === "serviceProvider"
          ? `http://localhost:8000/api/users/serviceProvider/${user._id}`
          : `http://localhost:8000/api/users/gharUsers/${user._id}`;

      const response = await axios.put(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data.success) {
        setSuccessMessage("Profile updated successfully!");
        toast.success("Profile updated successfully!");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(
        err.response?.data?.error ||
          "Failed to update profile. Please try again."
      );
      toast.error("Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !userData.name) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Profile & Basic Settings Section */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 border-b pb-2">
              Account Settings
            </h2>

            {/* Tabs */}
            <div className="flex border-b mb-6">
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === "general"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("general")}
              >
                General
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === "professional"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("professional")}
                disabled={userData.role !== "serviceProvider"}
              >
                Professional
              </button>
              <button
                className={`py-2 px-4 font-medium ${
                  activeTab === "security"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab("security")}
              >
                Security
              </button>
            </div>

            {/* Profile Image */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div 
                  className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={handleProfileImageClick}
                >
                  {userData.profileImage && !imageError ? (
                    <>
                      <img
                        src={`http://localhost:8000/public/registerImage/${userData.profileImage}`}
                        alt={userData.name || "Profile"}
                        className={`w-full h-full object-cover ${imageLoading ? 'hidden' : ''}`}
                        onError={() => {
                          setImageError(true);
                          setImageLoading(false);
                        }}
                        onLoad={() => setImageLoading(false)}
                      />
                      {imageLoading && (
                        <div className="w-full h-full bg-gray-200 animate-pulse" />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg
                        className="w-16 h-16"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity text-white">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <p className="text-center text-sm text-gray-500 mt-2">Click to change profile photo</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {activeTab === "general" && (
                <div>
                  {/* Personal Information Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={userData.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={userData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phoneNo"
                          value={userData.phoneNo}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          name="dob"
                          value={userData.dob}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender
                        </label>
                        <select
                          name="gender"
                          value={userData.gender}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="" disabled>Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <input
                          type="text"
                          value={userData.role === "serviceProvider" ? "Service Provider" : userData.role}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "professional" && userData.role === "serviceProvider" && (
                <div>
                  {/* Service Provider Information */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-700 mb-4">
                      Professional Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Services Offered
                        </label>
                        <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto bg-gray-50">
                          {availableServices.length > 0 ? (
                            availableServices
                              .filter(service => selectedServices.includes(service._id))
                              .map(service => (
                                <div key={service._id} className="py-1 px-2">
                                  {service.ser_name}
                                </div>
                            ))
                          ) : (
                            <p className="text-gray-500">No services available</p>
                          )}
                          {selectedServices.length === 0 && (
                            <div className="text-gray-400">No services selected</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Experience / Qualifications
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 min-h-[48px]">
                          {userData.question || <span className="text-gray-400">No experience/qualifications provided</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">
                    Security Settings
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Change Password
                      </label>
                      <button
                        type="button"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        onClick={() => toast.info("Password change functionality coming soon")}
                      >
                        Change Password
                      </button>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-md font-medium text-gray-700 mb-2">Account Actions</h4>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                          onClick={() => toast.error("Account deletion is not available at this time")}
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 mr-2 hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    fetchUserData();
                    setError(null);
                    setSuccessMessage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
