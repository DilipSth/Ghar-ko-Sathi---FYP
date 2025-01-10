import { Routes, Route, Outlet } from "react-router-dom";

import Page404 from "../Pages/Page404/Page404";
import Layout from "../Components/Layout";
import Dashboard from "../Pages/Dashboard/Dashboard";
import Services from "../Pages/Menu/Services/Services";
import Settings from "../Pages/Account/Settings/Settings";
import Login from "../Pages/Auth/Login";
import PrivateRoutes from "../utils/PrivateRoutes";
import RoleBaseRoutes from "../utils/RoleBaseRoutes";
import AddServices from "../Pages/Menu/Services/AddServices";
import Maps from "../Pages/Menu/Map/Maps";
import GharUsers from "../Pages/Menu/Users/GharUsers";
import AddGharUsers from "../Pages/Menu/Users/AddGharUsers";
import GharUser from "../Pages/Menu/Users/GharUser";
import UpdateUser from "../Pages/Menu/Users/UpdateUser";
import Signup from "../Pages/Auth/Signup";
// import AddMember from "../Pages/Auth/AddMember";

const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="*" element={<Page404 />} />
      <Route path="/" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      {/* <Route path="/create-account" element={<AddMember />}></Route> */}


      <Route path="/dashboard" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="menu" element={<Outlet />}>

        {/* Map Routes */}
          <Route
            path="maps"
            element={
              <PrivateRoutes>
                <RoleBaseRoutes requiredRole={["admin"]}>
                  <Maps />
                </RoleBaseRoutes>
              </PrivateRoutes>
            }
          />

        {/* Service Routes */}
          <Route path="services" element={<Outlet />}>
            <Route index element={<Services />} />
            <Route path="add-services" element={<AddServices />} />
          </Route>


        {/* User Routes */}
          <Route path="users" element={<Outlet />}>
            <Route index element={<GharUsers />} />
            <Route path="add-users" element={<AddGharUsers />} />
            <Route path="gharUser/:id" element={<GharUser />} />
            <Route path="edit-users/:id" element={<UpdateUser />} />
          </Route>

          
        </Route>

        <Route path="account" element={<Outlet />}>
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
