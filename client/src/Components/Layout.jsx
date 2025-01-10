import { useState } from "react";
import { Outlet } from "react-router";
import Header from "./Header/Header";
import Sidebar from "./Sidebar/Siderbar";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prevState) => !prevState);
  };

  return (
    <div className={`flex h-screen overflow-hidden`}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div
        className={`relative flex flex-col flex-grow overflow-y-auto overflow-x-hidden bg-gray-100`}
      >
        <div className="flex flex-col max-md:pt-0  max-sm:p-0 ">
          <Header toggleSidebar={toggleSidebar} />
        </div>
        <div className="flex-grow overflow-auto bg-[#F3F3F3] ">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
