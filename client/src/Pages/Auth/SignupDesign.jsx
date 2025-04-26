import { NavLink } from "react-router-dom";
import userImage from "../../assets/Services-folder/software-application.png";
import serviceProviderImage from "../../assets/Services-folder/maintenance.png";

const SignupDesign = () => {
  return (
    <div className="relative flex flex-col md:flex-row h-screen bg-gradient-to-r from-sky-500 to-blue-600 overflow-hidden">
      {/* Decorative Shapes */}
      <div className="absolute top-0 left-0 w-[60%] h-full bg-blue-300 opacity-30 rounded-full transform -translate-x-1/4"></div>
      <div className="absolute bottom-0 right-0 w-[60%] h-full bg-blue-300 opacity-30 rounded-full transform translate-x-1/4"></div>

      {/* Welcome Section */}
      <div className="relative z-10 flex-1 flex justify-center items-center text-white p-10">
        <div className="max-w-md w-full text-center">
          <h1 className="text-5xl font-extrabold mb-4">
            Welcome to Ghar Ko Sathi!
          </h1>
          <p className="text-lg mb-6">
            Sign up to access reliable home repair services.
          </p>
          <p className="text-lg">Your trusted partner for home maintenance!</p>
        </div>
      </div>

      {/* Signup Options Section */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-5">
        {/* Signup Heading */}
        <h3 className="font-bold text-4xl text-white mb-6">
          Sign up as
        </h3>

        {/* Signup Cards */}
        <div className="w-full max-w-lg flex justify-between gap-8">
          {/* User Sign Up Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 text-center flex flex-col items-center transform transition-all duration-300 hover:shadow-xl hover:scale-105 w-1/2">
            <div className="rounded-lg h-32 overflow-hidden mb-6 flex items-center justify-center bg-blue-50 p-3 w-full">
              <img
                alt="User"
                className="object-contain h-24 w-24 transition-transform duration-500 hover:scale-110"
                src={userImage}
              />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-blue-600">User</h2>
            <p className="text-gray-600 text-sm mb-4 h-10">Find and hire skilled professionals for your home needs</p>
            <NavLink to="/signupUser" className="text-white bg-blue-500 py-2 px-5 rounded-lg focus:outline-none hover:bg-blue-600 transition-colors w-full hover:shadow-md">
              Sign Up
            </NavLink>
          </div>

          {/* Service Provider Sign Up Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 text-center flex flex-col items-center transform transition-all duration-300 hover:shadow-xl hover:scale-105 w-1/2">
            <div className="rounded-lg h-32 overflow-hidden mb-6 flex items-center justify-center bg-blue-50 p-3 w-full">
              <img
                alt="Service Provider"
                className="object-contain h-24 w-24 transition-transform duration-500 hover:scale-110"
                src={serviceProviderImage}
              />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-blue-600">
              Service Provider
            </h2>
            <p className="text-gray-600 text-sm mb-4 h-10">Offer your services and grow your business</p>
            <NavLink to="/signupServiceProvider" className="text-white bg-blue-500 py-2 px-5 rounded-lg focus:outline-none hover:bg-blue-600 transition-colors w-full hover:shadow-md">
              Sign Up
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupDesign;
