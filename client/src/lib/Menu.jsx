import { TbMapStar } from "react-icons/tb";
import { GiAutoRepair } from "react-icons/gi";
import { IoSettingsOutline, IoShieldOutline } from "react-icons/io5";
import { FaUsers } from "react-icons/fa";

const masterItems = [
  {
    label: "Menu",
    icon: null,
    children: [
      {
        to: "/dashboard/menu/maps",
        label: "Live Maps",
        icon: <TbMapStar className="text-xl" />,
        allowedRoles: ["admin", "user", "serviceProvider"]
      },
      {
        to: "/dashboard/menu/services",
        label: "Services",
        icon: <GiAutoRepair className="text-xl" />,
        allowedRoles: ["admin", "user", "serviceProvider"]
      },
      {
        to: "/dashboard/menu/users",
        label: "User's",
        icon: <FaUsers className="text-xl" />,
        allowedRoles: ["admin"]
      },
      {
        to: "/dashboard/menu/serviceProvider",
        label: "Service Provider",
        icon: <FaUsers className="text-xl" />,
        allowedRoles: ["admin"]
      },
    ],
  },

  {
    label: "Account",
    icon: null,
    children: [
      {
        to: "/dashboard/account/settings",
        label: "Settings",
        icon: <IoSettingsOutline className="text-xl" />,
        allowedRoles: ["admin", "user", "serviceProvider"]
      },
      {
        to: "/dashboard/web-content/designations",
        label: "Security",
        icon: <IoShieldOutline className="text-xl" />,
        allowedRoles: ["admin", "user", "serviceProvider"]
      },
    ],
  },
  {
    label: "Support",
    icon: null,
    children: [
      {
        to: "/dashboard/web-content/departments",
        label: "Privacy Policy",
        allowedRoles: ["admin", "user", "serviceProvider"]
        // icon: <FcServices className="text-xl"/>,
      },
    ],
  },
];

export default masterItems;
