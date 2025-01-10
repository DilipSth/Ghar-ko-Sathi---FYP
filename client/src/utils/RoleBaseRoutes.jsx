import { Navigate } from "react-router";
import { useAuth } from "../context/authContext";

const RoleBaseRoutes = ({ requiredRole, children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading....</div>;
    }

    if (!requiredRole.includes(user.role)) {
        return <Navigate to="/unauthorized" />;
    }

    return user ? children : <Navigate to="/login" />;
};

export default RoleBaseRoutes;