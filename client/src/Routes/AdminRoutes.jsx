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

import SignupUser from "../Pages/Auth/SignupUser";
import SignupDesign from "../Pages/Auth/SignupDesign";
import SignupServiceProvider from "../Pages/Auth/SignupServiceProvider";

const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="*" element={<Page404 />} />
      <Route path="/" element={<Login />} />
      <Route path="/signupAccount" element={<SignupDesign />}></Route>
      <Route path="/signupUser" element={<SignupUser />} />
      <Route path="/signupServiceProvider" element={<SignupServiceProvider />} />


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


        {/* User Routes
          <Route path="users" element={<Outlet />}>
            <Route index element={<GharUsers />} />
            <Route path="add-users" element={<AddGharUsers />} />
            <Route path="gharUser/:id" element={<GharUser />} />
            <Route path="edit-users/:id" element={<UpdateUser />} />
          </Route> */}

          
        </Route>

        <Route path="account" element={<Outlet />}>
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
