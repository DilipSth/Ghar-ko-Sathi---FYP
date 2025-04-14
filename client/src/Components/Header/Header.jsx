/* eslint-disable react/prop-types */
import { useRef, useState, useEffect } from "react";
import { LuBell } from "react-icons/lu";
import { IoSearch } from "react-icons/io5";
import { GiHamburgerMenu } from "react-icons/gi";
import { CiPaperplane } from "react-icons/ci";
import { useAuth } from "../../context/authContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const dropdownRef = useRef(null);

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

  // Fetch current user data including profile image
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?._id) return;

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
          setUserData(response.data.user);
          setImageError(false);
          setImageLoading(true);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setImageError(true);
      }
    };

    fetchUserData();
  }, [user?._id]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Function to get initials from name
  const getInitials = (name) => {
    if (!name) return "";
    return name.split(" ").map(word => word[0]).join("").toUpperCase();
  };

  // Profile image component
  const ProfileImage = () => {
    const profileImage = userData?.profileImage;

    if (!profileImage || imageError) {
      return (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {getInitials(userData?.name || user?.name)}
          </span>
        </div>
      );
    }

    return (
      <>
        <img
          src={`http://localhost:8000/public/registerImage/${profileImage}`}
          alt={userData?.name || "Profile"}
          className={`w-8 h-8 rounded-full object-cover ${imageLoading ? 'hidden' : ''}`}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
          onLoad={() => setImageLoading(false)}
        />
        {imageLoading && (
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        )}
      </>
    );
  };

  return (
    <header className="bg-white border-b border-gray-300 shadow-xl">
      <nav className="mx-auto flex max-w-[2000px] items-center justify-between py-2 px-6 lg:px-8">
        <div className="text-center text-[#E0E0E0] items-center flex gap-5">
          <button
            onClick={toggleSidebar}
            className="text-[#333333] text-[24px] lg:hidden focus:outline-none"
          >
            <GiHamburgerMenu />
          </button>

          <div className="max-lg:hidden">
            <h1 className="font-semibold text-lg max-sm:text-base max-sm:font-bold text-left text-[#333333]">
              {userData?.name || user?.name || 'Welcome'}
            </h1>
            <p className="text-sm max-sm:text-sm font-light text-[#333333]">
              Stay up-to-date with the data provided below.
            </p>
          </div>
        </div>

        <div className="flex items-center lg:justify-end gap-10 max-sm:gap-4">
          <div className="flex flex-row gap-5">
            <span>
              <IoSearch className="max-lg:hidden text-[#333333] text-[24px] cursor-pointer transition ease-in-out duration-500 max-sm:text-[18px]" />
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
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <ProfileImage />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{userData?.name || user?.name}</p>
                  <p className="text-xs text-gray-500">{userData?.email || user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
