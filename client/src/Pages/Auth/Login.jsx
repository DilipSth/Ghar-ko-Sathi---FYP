import axios from "axios";
import { useState } from "react";
import { FaEnvelope, FaLock, FaGoogle, FaFacebook } from "react-icons/fa";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/authContext";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify"; // Note: You'll need to install react-toastify if not already installed

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(
        "http://localhost:8000/api/auth/login",
        { email, password }
      );
      
      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        login(response.data.user);
        
        // Check if user is a service provider with pending approval
        if (response.data.user.role === "serviceProvider" && !response.data.user.approved) {
          navigate("/pending-approval");
        } else if (response.data.user.role === "admin") {
          navigate("/dashboard");
        } else if (response.data.user.role === "user") {
          navigate("/dashboard/menu/services");
        } else if (response.data.user.role === "serviceProvider") {
          navigate("/dashboard/menu/maps");
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to login. Try again.");
      if (error.response && !error.response.data.success) {
        setError(error.response.data.error || "Login failed");
      } else {
        setError("Server Error");
      }
    } finally {
      setLoading(false);
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
        <form
          className="w-full max-w-lg p-8 bg-white border border-gray-300 rounded-lg shadow-lg transform transition-transform"
          onSubmit={handleSubmit}
        >
          <h2 className="text-4xl font-bold text-center mb-6 text-blue-700">
            Log In
          </h2>

          {error && <p className="text-red-500 mb-4">{error}</p>}

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
            className={`w-full p-3 ${loading ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg transition duration-200 shadow-md hover:shadow-lg`}
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          {/* Sign Up Link */}
          <p className="mt-8 text-center text-sm">
            Don&apos;t have an account?{" "}
            <NavLink to="/signupAccount" className="text-blue-600 hover:underline">
              Sign Up
            </NavLink>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;