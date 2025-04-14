/* eslint-disable react/prop-types */
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BiHome } from "react-icons/bi";
import { AiOutlineClose } from "react-icons/ai";
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
          `flex items-center gap-5 text-[1.1rem] no-underline pl-8 py-2.5 pr-0 rounded-lg transition ease-in-out duration-300 w-72 ${
            isActive
              ? "bg-[#FAFAFA] text-[#2460B9]"
              : "text-[#E0E0E0] hover:bg-[#FAFAFA] hover:text-[#2460B9]"
          }`
        }
      >
        {item.icon}
        {item.label}
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
      className={`lg:pl-3 w-full fixed top-0 left-0 bg-gray-800 transition-transform transform duration-500 ease-in-out lg:pt-2 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } w-full h-full z-50 md:w-80 lg:h-full lg:relative lg:translate-x-0`}
    >
      <div className="flex justify-end pr-4 pt-4 lg:hidden">
        <button
          onClick={toggleSidebar}
          className="text-[#E0E0E0] text-3xl p-2 focus:outline-none"
        >
          <AiOutlineClose />
        </button>
      </div>
      <div>
        <div className="text-center text-[#E0E0E0] items-center justify-center flex gap-5 max-lg:hidden pr-14 pt-5">
          <h2 className="text-center font-semibold font-inter text-3xl">
            Ghar Ko Sathi
          </h2>
        </div>
      </div>

      {/* Scrollable Sidebar Content */}
      <div className="flex flex-col gap-5 font-inter max-md:items-center pt-10 overflow-y-auto h-[calc(100vh-5rem)]">
        {showHome && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex w-72 items-center gap-5 text-[1.1rem] no-underline pl-8 py-2.5 pr-0 rounded-lg transition ease-in-out duration-300 ${
                isActive && location.pathname === "/dashboard"
                  ? "bg-[#FAFAFA] text-[#2460B9]"
                  : "text-[#E0E0E0] hover:bg-[#FAFAFA] hover:text-[#2460B9]"
              }`
            }
            end
          >
            <BiHome className="text-2xl" />
            Home
          </NavLink>
        )}

        {filteredMasterItems.map((group) => (
          <div key={group.label}>
            <h3 className="mb-4 ml-4 text-sm font-semibold flex items-center text-gray-300">
              {group.label}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {group.children.map((item) => renderNavItem(item))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
