import { useAuth } from "../context/authContext";
import { Navigate, useLocation } from "react-router-dom";

const PrivateRoutes = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/" />;
  }
  
  // If user is a service provider with pending approval, redirect to pending page
  // Don't redirect if already on the pending-approval page to avoid infinite loop
  if (user.role === "serviceProvider" && 
      user.approved === false && 
      !location.pathname.includes("/pending-approval")) {
    return <Navigate to="/pending-approval" />;
  }

  return children;
};

export default PrivateRoutes;