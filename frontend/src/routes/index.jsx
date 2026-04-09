import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./protectedRoute";
import RootRedirect from "./RootRedirect";

// auths
import LoginPage from "/src/pages/auth/LoginPage";

// farmer
import FarmerDashboard from "../pages/farmer/FarmerDashboard";

// agri
import AgriDashboardPage from "../pages/agri/Dashboard/AgriDashboardPage";
import ApplicationDashboard from "../pages/agri/Applications/ApplicationDashboard";
import AgriPermitDetail from "../pages/agri/Applications/AgriPermitDetail";
import AgriMapPage from "../pages/agri/Map/AgriMapPage";
import AgriReportsPage from "../pages/agri/Reports/AgriReportsPage";
import AgriPaymentPage from "../pages/agri/Payment/AgriPaymentPage";

// Opv
import OpvDashboard from "../pages/opv/OpvDashboard";

// Inspector
import InspectorDashboard from "../pages/inspector/InspectorDashboard";

const router = createBrowserRouter([
    { path: "/login", element: <LoginPage /> },
    { path: "/", element: <RootRedirect />, },


    {
        path: '/farmer',
        element: <ProtectedRoute allowedRoles={['Farmer']} />,
        children: [
            { index: true, element: <FarmerDashboard /> }
        ]
    },
    {
        path: '/agri',
        element: <ProtectedRoute allowedRoles={['Agri']} />,
        children: [
            { index: true, element: <AgriDashboardPage /> },
            { path: 'application/', element: <ApplicationDashboard /> },
            { path: 'application/detail/:id', element: <AgriPermitDetail /> },
            { path: 'map/', element: <AgriMapPage />},
            { path: 'payment/', element: <AgriPaymentPage />},
            { path: 'report/', element: <AgriReportsPage />},
        ]
    },

    {
        path: '/opv',
        element: <ProtectedRoute allowedRoles={['Opv']} />,
        children: [
            { index: true, element: <OpvDashboard /> }
        ]
    },

    {
        path: '/inspector',
        element: <ProtectedRoute allowedRoles={['Inspector']} />,
        children: [
            { index: true, element: <InspectorDashboard /> }
        ]
    },

    { path: "*", element: <div>404</div> },
])


export default router