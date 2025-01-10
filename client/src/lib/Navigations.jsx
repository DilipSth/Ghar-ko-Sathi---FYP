// menuItems.ts
import { FcDebian, FcServices, FcTimeline } from "react-icons/fc";

const menuItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    children: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: FcTimeline,
      },
    ],
  },

  {
    label: "Menu",
    icon: null,
    children: [
      // ************************************ MASTER SETUP **********************************//
      {
        to: "menu/employees",
        label: "Employee's",
        icon: FcServices,

        // icon: FcDocument,
        children: [
          // ************************** MUN SETUP *****************************//

          {
            to: "menu/employeesDetails",
            label: "Employee's Details",
          },
        ],
      },
    ],
  },
  {
    label: "Users",
    icon: null,
    children: [
      // ************************************WEB CONTENT **********************************//
      {
        to: "web-content/users",
        label: "Users",
        icon: FcDebian,

        // icon: FcDocument,
        children: [
          // ************************** MUN WEB CONTENT *****************************//
          {
            to: "web-content/userDetails",
            label: "User Details",
          },
        ],
      },
    ],
  },
];

export default menuItems;
