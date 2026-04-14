import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./protectedRoute";
import RootRedirect from "./RootRedirect";

// auths
import LoginPage from "/src/pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";

// farmer
import FarmerApplicationDashboard from "../pages/farmer/Dashboard/FarmerApplicationDashboard";
import CreateApplication from "../pages/farmer/Applications/CreateApplication";
import NotificationPage from "../pages/farmer/Notification/NotificationPage";
import PaymentSuccess from "../pages/farmer/Payments/PaymentSuccess";
import ApplicationDetail from "../pages/farmer/Applications/ApplicationDetail";
import PaymentCheckout from "../pages/farmer/Payments/PaymentCheckout";
import DownloadApplication from "../pages/farmer/Dashboard/DownloadApplication";



// agri
import AgriDashboardPage from "../pages/agri/Dashboard/AgriDashboardPage";
import ApplicationDashboard from "../pages/agri/Applications/ApplicationDashboard";
import AgriPermitDetail from "../pages/agri/Applications/AgriPermitDetail";
import AgriMapPage from "../pages/agri/Map/DensityMap/AgriMapPage";
import AgriPaymentPage from "../pages/agri/Payment/AgriPaymentPage";

// Opv
import OpvDashboard from "../pages/opv/Dashboard/OpvDashboard";
import OPVApplicationDetail from "../pages/opv/Application/OPVApplicationDetailView";

// Inspector
import InspectorDashboard from "../pages/inspector/Dashboard/InspectorDashboard";

const router = createBrowserRouter([
    { path: "/login", element: <LoginPage /> },
    { path: '/register', element: <RegisterPage />},
    { path: "/", element: <RootRedirect />, },


    {
        path: '/farmer',
        element: <ProtectedRoute allowedRoles={['Farmer']} />,
        children: [
            { index: true, element: <FarmerApplicationDashboard /> },
            { path: 'application/detail/:id', element: <ApplicationDetail /> },
            { path: 'application/create/', element: <CreateApplication /> },
            { path: 'notification/', element: <NotificationPage /> },
            { path: 'payment/success/:issued_permit_id', element: <PaymentSuccess /> },
            { path: 'payment/checkout/:id', element: <PaymentCheckout /> },
            { path: 'applicaation/download/:id', element: <DownloadApplication />}
        ]
    },
    {
        path: '/agri',
        element: <ProtectedRoute allowedRoles={['Agri']} />,
        children: [
            { index: true, element: <AgriDashboardPage /> },
            { path: 'application/', element: <ApplicationDashboard /> },
            { path: 'application/detail/:id', element: <AgriPermitDetail /> },
            { path: 'map/', element: <AgriMapPage /> },
            { path: 'payment/', element: <AgriPaymentPage /> },
        ]
    },

    {
        path: '/opv',
        element: <ProtectedRoute allowedRoles={['Opv']} />,
        children: [
            { index: true, element: <OpvDashboard /> },
            { path: 'application/detail/:id', element: <OPVApplicationDetail /> },
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