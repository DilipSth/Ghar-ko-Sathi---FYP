/* eslint-disable react/prop-types */
import { useRef, useState, useEffect } from "react";
import { LuBell } from "react-icons/lu";
import { IoSearch } from "react-icons/io5";
import { GiHamburgerMenu } from "react-icons/gi";
import { CiPaperplane } from "react-icons/ci";
import { useAuth } from "../../context/authContext";
import { useNavigate } from "react-router-dom";

export default function Header({ toggleSidebar }) {
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false); // Added state to manage dropdown visibility
  const dropdownRef = useRef(null); // Create a ref for the dropdown container

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Check if user is a service provider or a regular user
  const profileImage =
    user?.role === "serviceProvider" ? user.profileImage : user?.profileImage;

  return (
    <header className="bg-white border-b border-gray-300 shadow-xl">
      <nav className="mx-auto flex max-w-[2000px] items-center justify-between py-2 px-6 lg:px-8">
        <div className="text-center text-[#E0E0E0] items-center flex gap-5">
          <button
            onClick={toggleSidebar}
            className="text-white text-[24px] lg:hidden focus:outline-none"
          >
            <GiHamburgerMenu />
          </button>

          <div className="max-lg:hidden">
            <h1 className="font-semibold text-lg max-sm:text-base max-sm:font-bold text-left text-[#333333]">
              {user?.name}
            </h1>
            <p className="text-sm max-sm:text-sm font-light text-[#333333]">
              Stay up-to-date with the data provided below.
            </p>
          </div>

          <img
            // src={RCCILogo}
            className="max-lg:flex max-lg:w-12 max-lg:h-12 hidden"
          />
        </div>

        <div className="flex items-center lg:justify-end gap-10 max-sm:gap-4">
          <div className="flex flex-row gap-5">
            <span>
              <IoSearch className=" max-lg:hidden text-[#333333] text-[24px] cursor-pointer transition ease-in-out duration-500 max-sm:text-[18px]" />
            </span>
            <span>
              <CiPaperplane className="lg:hidden text-[#333333] text-[24px] cursor-pointer transition ease-in-out duration-500 max-sm:text-[18px]" />
            </span>
            <span>
              <LuBell className="text-[#333333] text-[24px] cursor-pointer transition ease-in-out duration-500 max-sm:text-[18px]" />
            </span>
          </div>

          {/* Dropdown for user or service provider */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center gap-2 text-[#333333]"
              onClick={() => setDropdownOpen(!dropdownOpen)} // Toggle dropdown
            >
              {profileImage ? (
                <img
                  src={`http://localhost:8000/public/registerImage/${profileImage}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-white text-lg">{user?.name[0]}</span>
                </div>
              )}
            </button>
            {dropdownOpen && ( // Render dropdown only if it's open
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md">
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
