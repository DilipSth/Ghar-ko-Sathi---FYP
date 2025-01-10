import { useState } from "react";
import LogTable from "./LogTable";


const Settings = () => {
  const [settings, setSettings] = useState({
    securityWarnings: true,
    loginNotifications: true,
    quotaWarnings: true,
    generalNotifications: true,
    monthlyNewsletter: false,
  });

  const handleToggle = (key) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: !prevSettings[key],
    }));
  };

  return (
    <>
      {/* Profile & Basic Settings Section */}
      <div className="p-4 flex items-center justify-center bg-gray-100">
        <div className="w-full h-[30rem] p-6 bg-white rounded-lg shadow-lg">
          <h1 className="font-bold text-2xl mb-4">Settings</h1>
          <div className="flex flex-col items-center mb-3">
            <div className="relative">
              <img
                src="https://via.placeholder.com/100"
                alt="Profile"
                className="w-20 h-20 rounded-lg object-cover border border-gray-300"
              />
              <button className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 2.487a3.375 3.375 0 114.775 4.775L7.11 21.788a1.125 1.125 0 01-.491.276l-4.2 1.05 1.05-4.2a1.125 1.125 0 01.276-.492L16.862 2.487z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <form className="space-y-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  className="w-full h-8 border-2 p-1 border-gray-300 rounded-md shadow-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  className="w-full h-8 border-2 p-1 border-gray-300 rounded-md shadow-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Middle Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  className="w-full h-8 border-2 p-1 border-gray-300 rounded-md shadow-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Last Name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full h-8 border-2 p-1 border-gray-300 rounded-md shadow-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="example@domain.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Number
                </label>
                <input
                  type="tel"
                  className="w-full h-8 border-2 p-1 border-gray-300 rounded-md shadow-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Phone Number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Address
                </label>
                <input
                  type="text"
                  className="w-full h-8 border-2 p-1 border-gray-300 rounded-md shadow-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Address"
                />
              </div>
            </div>
            <div className="pt-1 text-right">
              <button
                type="submit"
                className="w-24 py-2 px-4 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Email & Notification Settings Section */}
      <div className="p-4 t-5 flex items-center justify-center bg-gray-100">
        <div className="w-full h-[24rem] p-6 bg-white rounded-lg shadow-lg">
          <h1 className="font-bold text-xl mb-4">Email Settings</h1>
          <div className="space-y-3">
            {[
              { label: "Security Warnings", key: "securityWarnings" },
              { label: "Login Notifications", key: "loginNotifications" },
              { label: "Quota Warnings", key: "quotaWarnings" },
              { label: "General Notifications", key: "generalNotifications" },
              { label: "Monthly Newsletter", key: "monthlyNewsletter" },
            ].map(({ label, key }) => (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-gray-200"
              >
                <span>{label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    onChange={() => handleToggle(key)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-500 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 transition-all"></div>
                  <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-all peer-checked:translate-x-4"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Logs Section */}
      <div className="p-4 pt-5 flex items-center justify-center bg-gray-100">
        <div className="w-full h-[27rem] p-6 bg-white rounded-lg shadow-lg">
          <h1 className="font-bold text-xl mb-4">Security Logs</h1>
          <LogTable />
        </div>
      </div>
    </>
  );
};

export default Settings;
