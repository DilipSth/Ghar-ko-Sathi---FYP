import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../../context/authContext";

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phoneNo: "",
    dob: "",
    gender: "",
    role: "",
    services: "",
    question: "",
  });

  useEffect(() => {
    fetchUserData();
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

        setUserData({
          name: fetchedUser.name || "",
          email: fetchedUser.email || "",
          phoneNo: fetchedUser.phoneNo || "",
          dob: fetchedUser.dob
            ? new Date(fetchedUser.dob).toISOString().split("T")[0]
            : "",
          gender: fetchedUser.gender || "",
          role: fetchedUser.role || "",
          services: fetchedUser.services || "",
          question: fetchedUser.question || "",
        });
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to load user data. Please try again.");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

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
        payload.services = userData.services;
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
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(
        err.response?.data?.error ||
          "Failed to update profile. Please try again."
      );
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
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Type
                    </label>
                    <input
                      type="text"
                      name="role"
                      value={
                        userData.role === "serviceProvider"
                          ? "Service Provider"
                          : "User"
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Service Provider Fields */}
              {userData.role === "serviceProvider" && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">
                    Service Provider Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Services Offered
                      </label>
                      <select
                        name="services"
                        value={userData.services}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Service Type</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Cleaning">Cleaning</option>
                        <option value="Painting">Painting</option>
                        <option value="Carpentry">Carpentry</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Experience/Qualifications
                      </label>
                      <textarea
                        name="question"
                        value={userData.question}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows="3"
                      ></textarea>
                    </div>
                  </div>
                </div>
              )}

            

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => fetchUserData()}
                  className="px-4 py-2 mr-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-75"
                >
                  {submitting ? "Saving..." : "Save Changes"}
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
