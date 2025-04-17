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
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <div className="flex flex-col flex-1 w-0 min-h-0 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-[#F3F3F3]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
