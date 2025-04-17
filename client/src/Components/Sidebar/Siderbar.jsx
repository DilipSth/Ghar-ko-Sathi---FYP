/* eslint-disable react/prop-types */
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BiHome } from "react-icons/bi";
import { AiOutlineClose } from "react-icons/ai";
import { RiArrowRightSLine } from "react-icons/ri";
import { useEffect } from "react";
import { useAuth } from "../../context/authContext";
import masterItems from "../../lib/Menu";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Function to get default route based on user role
  const getDefaultRoute = (role) => {
    switch (role) {
      case "serviceProvider":
        return "/dashboard/menu/maps";
      case "user":
        return "/dashboard/menu/services";
      case "admin":
        return "/dashboard";
      default:
        return "/dashboard";
    }
  };

  // Set initial active route based on current location or default route
  useEffect(() => {
    if (location.pathname === "/dashboard") {
      const defaultRoute = getDefaultRoute(user?.role);
      if (defaultRoute !== "/dashboard") {
        navigate(defaultRoute);
      }
    }
  }, [user?.role, location.pathname, navigate]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  const renderNavItem = (item) => {
    // Check if user has permission to see this item
    if (item.allowedRoles && !item.allowedRoles.includes(user?.role)) {
      return null;
    }

    return (
      <NavLink
        key={item.label}
        to={item.to}
        className={({ isActive }) =>
          `flex items-center gap-3 text-[1.1rem] no-underline pl-5 py-2.5 pr-2 rounded-lg transition ease-in-out duration-300 w-full ${
            isActive
              ? "bg-[#FAFAFA] text-[#2460B9]"
              : "text-[#E0E0E0] hover:bg-[#FAFAFA] hover:text-[#2460B9]"
          }`
        }
      >
        <span className="w-6 flex justify-center">
          {item.icon || <RiArrowRightSLine className="text-xl" />}
        </span>
        <span className="truncate">{item.label}</span>
      </NavLink>
    );
  };

  // Filter menu items based on user role
  const filteredMasterItems = masterItems.map((group) => ({
    ...group,
    children: group.children.filter((item) => {
      return !item.allowedRoles || item.allowedRoles.includes(user?.role);
    }),
  })).filter(group => group.children.length > 0);

  // Check if user has permission to see the home page
  const showHome = user?.role === "admin";

  return (
    <div
      className={`fixed lg:sticky top-0 left-0 h-full z-50 bg-gray-800 transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        w-[260px] flex flex-col overflow-hidden`}
    >
      {/* Mobile Close Button */}
      <div className="flex justify-end p-4 lg:hidden">
        <button
          onClick={toggleSidebar}
          className="text-[#E0E0E0] text-3xl p-2 focus:outline-none"
          aria-label="Close sidebar"
        >
          <AiOutlineClose />
        </button>
      </div>

      {/* Logo/Title */}
      <div className="px-5 py-4 border-b border-gray-700">
        <h2 className="text-center font-semibold font-inter text-xl text-[#E0E0E0]">
          Ghar Ko Sathi
        </h2>
      </div>

      {/* Scrollable Sidebar Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3">
        <nav className="flex flex-col gap-4">
          {showHome && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-3 text-[1.1rem] no-underline pl-5 py-2.5 pr-2 rounded-lg transition ease-in-out duration-300 w-full ${
                  isActive && location.pathname === "/dashboard"
                    ? "bg-[#FAFAFA] text-[#2460B9]"
                    : "text-[#E0E0E0] hover:bg-[#FAFAFA] hover:text-[#2460B9]"
                }`
              }
              end
            >
              <span className="w-6 flex justify-center"><BiHome className="text-xl" /></span>
              <span>Home</span>
            </NavLink>
          )}

          {filteredMasterItems.map((group) => (
            <div key={group.label} className="mb-2">
              <h3 className="px-4 mb-2 text-sm font-semibold text-gray-300">
                {group.label}
              </h3>
              <ul className="flex flex-col space-y-1">
                {group.children.map((item) => renderNavItem(item))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
