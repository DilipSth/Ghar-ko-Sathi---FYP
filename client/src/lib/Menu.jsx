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
      },
      {
        to: "/dashboard/menu/services",
        label: "Services",
        icon: <GiAutoRepair className="text-xl" />,
      },
      {
        to: "/dashboard/menu/users",
        label: "User's",
        icon: <FaUsers className="text-xl" />,
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
      },
      {
        to: "/dashboard/web-content/designations",
        label: "Security",
        icon: <IoShieldOutline className="text-xl" />,
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
        // icon: <FcServices className="text-xl"/>,
      },
    ],
  },
];

export default masterItems;
