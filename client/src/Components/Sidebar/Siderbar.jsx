import { NavLink } from "react-router-dom";
import { BiHome } from "react-icons/bi";
import { AiOutlineClose } from "react-icons/ai";
import { useState, useEffect } from "react";
import masterItems from "../../lib/Menu";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [activeRoute, setActiveRoute] = useState(() => {
    return localStorage.getItem("activeRoute") || "/dashboard";
  });

  useEffect(() => {
    localStorage.setItem("activeRoute", activeRoute);
  }, [activeRoute]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isOpen]);

  const renderNavItem = (item) => {
    return (
      <NavLink
        key={item.label}
        to={item.to}
        className={({ isActive }) =>
          `flex items-center gap-5 text-[1.1rem] no-underline pl-8 py-2.5 pr-0 rounded-lg transition ease-in-out duration-300 w-72 ${
            isActive || activeRoute === item.to
              ? "bg-[#FAFAFA] text-[#2460B9]"
              : "text-[#E0E0E0] hover:bg-[#FAFAFA] hover:text-[#2460B9]"
          }`
        }
        onClick={() => setActiveRoute(item.to)} // Update active route on click
      >
        {item.icon}
        {item.label}
      </NavLink>
    );
  };

  const menuItems = [
    {
      label: "Home",
      icon: <BiHome className="text-xl" />,
      to: "/dashboard",
    },
  ];

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
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex w-72 items-center gap-5 text-[1.1rem] no-underline pl-8 py-2.5 pr-0 rounded-lg transition ease-in-out duration-300 ${
              activeRoute === "/dashboard"
                ? "bg-[#FAFAFA] text-[#2460B9]"
                : "text-[#E0E0E0] hover:bg-[#FAFAFA] hover:text-[#2460B9]"
            }`
          }
          onClick={() => setActiveRoute("/dashboard")}
        >
          <BiHome className="text-2xl" />
          Home
        </NavLink>

        {menuItems.slice(1).map((item) => renderNavItem(item))}
        {masterItems.map((group) => (
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