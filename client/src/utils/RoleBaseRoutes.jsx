import { useAuth } from "../context/authContext";
import { Navigate } from "react-router-dom";

const RoleBaseRoutes = ({ requiredRole, requireApproval = false, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/" />;
  }

  // If this is a service provider route that requires approval
  if (requireApproval && user.role === "serviceProvider" && user.approved === false) {
    return <Navigate to="/pending-approval" />;
  }

  // Check if user has the required role
  if (!requiredRole.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default RoleBaseRoutes;