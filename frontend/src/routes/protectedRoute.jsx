// routes/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authContext";
import Sidebar from "../components/Sidebar";

const ProtectedRoute = ({ allowedRoles }) => {
    const access = useAuthStore((s) => s.access)
    const user = useAuthStore((s) => s.user)


    if (!access) return <Navigate to="/login" replace />;
    if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;

    return (
        <Sidebar>
            <Outlet />
        </Sidebar>
    );
};

export default ProtectedRoute;