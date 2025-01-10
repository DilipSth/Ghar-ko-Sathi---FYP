import { useEffect, useState } from "react";
import { fetchServices } from "../../../utils/GharUserHelper";
import axios from "axios";
import { useNavigate } from "react-router";

const AddGharUsers = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    role: "", // Initialize role as empty
    services: [], // Initialize services as empty array
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
    if (name === "image") {
      setFormData((prevData) => ({ ...prevData, [name]: files[0] }));
    } else if (name === "role" && value !== "serviceProvider") {
      setFormData((prevData) => ({ ...prevData, [name]: value, services: [] }));
    } else {
      setFormData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataObj = new FormData();
    Object.keys(formData).forEach((key) => {
      formDataObj.append(key, formData[key]);
    });

    try {
      const response = await axios.post(
        "http://localhost:8000/api/gharUsers/add",
        formDataObj,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        navigate("/dashboard/menu/users");
      } else {
        alert(response.data.error || "Failed to add user.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error.response?.data?.message || "An unexpected error occurred.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      {/* Name Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          name="name"
          onChange={handleChange}
          placeholder="Type Your name"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Email Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          name="email"
          onChange={handleChange}
          placeholder="Type Your Email"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Date of Birth Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date of Birth
        </label>
        <input
          type="date"
          name="dob"
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Gender Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Gender
        </label>
        <select
          name="gender"
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

      {/* Role Select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Role
        </label>
        <select
          name="role"
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="serviceProvider">Service Provider</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Conditionally Render Services Select */}
      {formData.role === "serviceProvider" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Services
          </label>
          <select
            name="services"
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
      )}

      {/* Password Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <input
          type="password"
          name="password"
          placeholder="**********"
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Upload Image Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upload Image
        </label>
        <input
          type="file"
          name="image"
          onChange={handleChange}
          accept="image/*"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Add User
      </button>
    </form>
  );
};

export default AddGharUsers;
