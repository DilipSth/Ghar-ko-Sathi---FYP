import { Routes, Route, Outlet } from "react-router-dom";
import Page404 from "../Pages/Page404/Page404";
import Layout from "../Components/Layout";
import Dashboard from "../Pages/Dashboard/Dashboard";
import Services from "../Pages/Menu/Services/Services";
import Settings from "../Pages/Account/Settings/Settings";
import Login from "../Pages/Auth/Login";
import PrivateRoutes from "../utils/PrivateRoutes";
import AddServices from "../Pages/Menu/Services/AddServices";
import SignupUser from "../Pages/Auth/SignupUser";
import SignupDesign from "../Pages/Auth/SignupDesign";
import SignupServiceProvider from "../Pages/Auth/SignupServiceProvider";
import { useAuth } from "../context/authContext";
import Users from "../Pages/Users/Users/Users";
import ServiceProviderUsers from "../Pages/Users/ServiceProvider/ServiceProviderUsers";
import ViewServiceProvider from "../Pages/Users/ServiceProvider/ViewServiceProvider";
import EditServiceProvider from "../Pages/Users/ServiceProvider/EditServiceProvider";
import ViewUser from "../Pages/Users/Users/ViewUser";
import EditUser from "../Pages/Users/Users/EditUser";
import ServiceProviderMap from "../Pages/Menu/Map/ServiceProviderMaps";

const AdminRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="*" element={<Page404 />} />
      <Route path="/" element={<Login />} />
      <Route path="/signupAccount" element={<SignupDesign />} />
      <Route path="/signupUser" element={<SignupUser />} />
      <Route
        path="/signupServiceProvider"
        element={<SignupServiceProvider />}
      />

      <Route
        path="/dashboard"
        element={
          <PrivateRoutes>
            <Layout />
          </PrivateRoutes>
        }
      >
        {/* Only Admin Can View the Dashboard */}
        {user?.role === "admin" && <Route index element={<Dashboard />} />}

        <Route path="menu" element={<Outlet />}>
          {/* Map Routes */}
          {/* <Route path="maps" element={<Maps />} /> */}
          <Route path="maps" element={<ServiceProviderMap />} />


          {/* Service Routes */}
          <Route path="services" element={<Outlet />}>
            <Route index element={<Services />} />
            {user?.role === "admin" && (
              <Route path="add-services" element={<AddServices />} />
            )}
          </Route>

          {/* Conditionally render User and ServiceProvider Routes */}
          {user?.role === "admin" && (
            <Route path="users" element={<Outlet />}>
              <Route index element={<Users />} />
              <Route path="view/:id" element={<ViewUser />} />
              <Route path="edit/:id" element={<EditUser />} />
            </Route>
          )}

          {user?.role === "admin" && (
            <Route path="serviceProvider" element={<Outlet />}>
              <Route index element={<ServiceProviderUsers />} />
              <Route path="view/:id" element={<ViewServiceProvider />} />
              <Route path="edit/:id" element={<EditServiceProvider />} />
            </Route>
          )}
        </Route>

        <Route path="account" element={<Outlet />}>
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AdminRoutes;
