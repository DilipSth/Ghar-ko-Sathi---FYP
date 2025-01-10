import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    dob: "",
    gender: "",
    phoneNo: "",
    password: "",
    image: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
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
        "http://localhost:8000/api/auth/register",
        data,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (response.status === 201) {
        toast.success("Registration successful!");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(
        error.response?.data?.error || "An error occurred during registration."
      );
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="text"
          name="phoneNo"
          onChange={handleChange}
          placeholder="Type Your Number"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

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

export default Signup;
