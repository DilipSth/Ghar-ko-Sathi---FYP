import axios from "axios";
import { useState } from "react";
import { FaEnvelope, FaLock, FaGoogle, FaFacebook } from "react-icons/fa";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/authContext";
import { NavLink } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:8000/api/auth/login",
        { email, password }
      );
      if (response.data.success) {
        login(response.data.user);
        localStorage.setItem("token", response.data.token);
        if (response.data.user.role === "admin") {
          navigate("/dashboard");
        } else {
          navigate("/serviceProvider-dashboard");
        }
      }
    } catch (error) {
      if (error.response && !error.response.data.success) {
        setError(error.response.data.success);
      } else {
        setError("Server Error");
      }
    }
  };

  return (
    <div className="relative flex flex-col md:flex-row h-screen bg-gradient-to-r from-sky-500 to-blue-600 overflow-hidden">
      {/* Decorative Shapes */}
      <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-300 opacity-30 rounded-full transform -translate-x-1/4"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-full bg-blue-300 opacity-30 rounded-full transform translate-x-1/4"></div>

      {/* Welcome Section */}
      <div className="relative z-10 flex-1 flex justify-center items-center text-white p-10">
        <div>
          <h1 className="text-5xl font-extrabold mb-4">
            Welcome to Ghar Ko Sathi!
          </h1>
          <p className="text-lg mb-2">
            Log in to access reliable home repair services.
          </p>
          <p className="text-lg">Your trusted partner for home maintenance!</p>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="relative z-10 flex-1 flex justify-center items-center p-5">
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form
          className="w-full max-w-lg p-8 bg-white border border-gray-300 rounded-lg shadow-lg transform transition-transform"
          onSubmit={handleSubmit}
        >
          <h2 className="text-4xl font-bold text-center mb-6 text-blue-700">
            Log In
          </h2>

          {/* Email Field */}
          <label className="block mb-2 text-lg font-semibold" htmlFor="email">
            Email:
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg mb-4 focus-within:border-blue-500">
            <FaEnvelope className="ml-3 text-gray-400" />
            <input
              className="w-full p-3 rounded-lg focus:outline-none"
              type="email"
              id="email"
              autoComplete="off"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Field */}
          <label
            className="block mb-2 text-lg font-semibold"
            htmlFor="password"
          >
            Password:
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg mb-6 focus-within:border-blue-500">
            <FaLock className="ml-3 text-gray-400" />
            <input
              className="w-full p-3 rounded-lg focus:outline-none"
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Log In Button */}
          <button
            className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 shadow-md hover:shadow-lg"
            type="submit"
          >
            Log In
          </button>

          {/* Social Media Login Options */}
          <div className="flex justify-between mt-4">
            <button className="flex items-center justify-center w-full p-2 mr-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200">
              <FaGoogle className="mr-2" /> Google
            </button>
            <button className="flex items-center justify-center w-full p-2 ml-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition duration-200">
              <FaFacebook className="mr-2" /> Facebook
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm">
            Don&apos;t have an account?{" "}
            <NavLink to="/signup" className="text-blue-600 hover:underline">
              Sign Up
            </NavLink>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
