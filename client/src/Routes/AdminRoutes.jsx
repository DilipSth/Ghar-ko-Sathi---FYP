import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Page404 from "../Pages/Page404/Page404";
import Layout from "../Components/Layout";
import Dashboard from "../Pages/Dashboard/Dashboard";
import Services from "../Pages/Menu/Services/Services";
import Settings from "../Pages/Account/Settings/Settings";
import Login from "../Pages/Auth/Login";
import PrivateRoutes from "../utils/PrivateRoutes";
import RoleBaseRoutes from "../utils/RoleBaseRoutes";
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
import PendingApproval from "../Pages/PendingApproval";
import Maps from "../Pages/Menu/Map/ServiceProviderMaps";
import ServiceProviderMap from "../Pages/Menu/Map/ServiceProviderMaps";
import UserMaps from "../Pages/Menu/Map/UserMaps";
import Security from "../Pages/Legal/Security";
import Privacy from "../Pages/Legal/Privacy";
import Chat from "../Pages/Contact/Chat";
import BookingConfirmationPage from "../Pages/ServiceProvider/BookingConfirmationPage";
import PaymentSuccess from "../Pages/Payment/PaymentSuccess";
import PaymentError from "../Pages/Payment/PaymentError";

const AdminRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Login />} />
      <Route path="/signupAccount" element={<SignupDesign />} />
      <Route path="/signupUser" element={<SignupUser />} />
      <Route path="/signupServiceProvider" element={<SignupServiceProvider />} />
      <Route 
        path="/pending-approval" 
        element={
          <PrivateRoutes>
            <PendingApproval />
          </PrivateRoutes>
        } 
      />

      {/* Payment Routes */}
      <Route 
        path="/payments/success" 
        element={
          <PrivateRoutes>
            <PaymentSuccess />
          </PrivateRoutes>
        }
      />
      <Route 
        path="/payments/error" 
        element={
          <PrivateRoutes>
            <PaymentError />
          </PrivateRoutes>
        }
      />

      {/* Service Provider Booking Details Route */}
      <Route 
        path="/provider/booking/:bookingId" 
        element={
          <PrivateRoutes>
            <RoleBaseRoutes requiredRole={["serviceProvider"]} requireApproval={true}>
              <BookingConfirmationPage />
            </RoleBaseRoutes>
          </PrivateRoutes>
        } 
      />

      {/* Dashboard and Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoutes>
            <Layout />
          </PrivateRoutes>
        }
      >
        {/* Dashboard Index Route - role-based access */}
        <Route 
          index 
          element={
            user?.role === "admin" ? (
              <Dashboard />
            ) : user?.role === "user" ? (
              <Navigate to="/dashboard/menu/services" replace />
            ) : user?.role === "serviceProvider" ? (
              <Navigate to="/dashboard/menu/maps" replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        <Route path="menu" element={<Outlet />}>
          {/* Maps Route */}
          <Route 
            path="maps" 
            element={
              user?.role === "serviceProvider" ? (
                <RoleBaseRoutes requiredRole={["serviceProvider", "admin"]} requireApproval={true}>
                  <ServiceProviderMap />
                </RoleBaseRoutes>
              ) : 

              user?.role === "user" ? (
                <RoleBaseRoutes requiredRole={["user", "admin"]} requireApproval={true}>
                  <UserMaps />
                </RoleBaseRoutes>
              ) : 
              
              (
                <RoleBaseRoutes requiredRole={["admin"]}>
                  <Maps />
                </RoleBaseRoutes>
              )
            } 
          />

          {/* Services Routes */}
          <Route path="services" element={<Outlet />}>
            <Route 
              index 
              element={
                user?.role === "serviceProvider" ? (
                  <RoleBaseRoutes requiredRole={["serviceProvider", "admin"]} requireApproval={true}>
                    <Services />
                  </RoleBaseRoutes>
                ) :
                 (
                  <RoleBaseRoutes requiredRole={["user", "admin"]}>
                    <Services />
                  </RoleBaseRoutes>
                )
              } 
            />
            <Route 
              path="add-services" 
              element={
                <RoleBaseRoutes requiredRole={["admin"]}>
                  <AddServices />
                </RoleBaseRoutes>
              } 
            />
          </Route>

          {/* User Management Routes - Admin Only */}
          <Route 
            path="users" 
            element={
              <RoleBaseRoutes requiredRole={["admin"]}>
                <Outlet />
              </RoleBaseRoutes>
            }
          >
            <Route index element={<Users />} />
            <Route path="view/:id" element={<ViewUser />} />
            <Route path="edit/:id" element={<EditUser />} />
          </Route>

          {/* Service Provider Management Routes - Admin Only */}
          <Route 
            path="serviceProvider" 
            element={
              <RoleBaseRoutes requiredRole={["admin"]}>
                <Outlet />
              </RoleBaseRoutes>
            }
          >
            <Route index element={<ServiceProviderUsers />} />
            <Route path="view/:id" element={<ViewServiceProvider />} />
            <Route path="edit/:id" element={<EditServiceProvider />} />
          </Route>
        </Route>

        {/* Account Settings Route - Available to all authenticated users */}
        <Route path="account" element={<Outlet />}>
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Legal Pages Route - Available to all authenticated users */}
        <Route path="legal" element={<Outlet />}>
          <Route path="security" element={<Security />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>

        {/* Contact Routes */}
        <Route path="contact" element={<Outlet />}>
          <Route path="chat" element={<Chat />} />
        </Route>
      </Route>

      {/* Catch-all for undefined routes */}
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
};

export default AdminRoutes;