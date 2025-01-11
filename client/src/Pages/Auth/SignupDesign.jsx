import { NavLink } from "react-router-dom";

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
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 text-center flex flex-col items-center">
            <div className="rounded-lg h-32 overflow-hidden mb-6">
              <img
                alt="User"
                className="object-cover object-center h-full w-full"
                src="https://dummyimage.com/1201x501"
              />
            </div>
            <h2 className="text-2xl font-bold  mb-3">User</h2>
            <NavLink to="/signupUser" className="text-white bg-indigo-500 py-2 px-5 rounded focus:outline-none hover:bg-indigo-600">
              Sign Up
            </NavLink>
          </div>

          {/* Service Provider Sign Up Card */}
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 text-center flex flex-col items-center">
            <div className="rounded-lg h-32 overflow-hidden mb-6">
              <img
                alt="Service Provider"
                className="object-cover object-center h-full w-full"
                src="https://dummyimage.com/1202x502"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Service Provider
            </h2>
            <NavLink to="/signupServiceProvider" className="text-white bg-indigo-500 py-2 px-5 rounded focus:outline-none hover:bg-indigo-600">
              Sign Up
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupDesign;
