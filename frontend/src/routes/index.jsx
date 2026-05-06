import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./protectedRoute";
import RootRedirect from "./RootRedirect";

// auths
import LoginPage from "/src/pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";

// farmer
import FarmerDashboard from "../pages/farmer/Dashboard/FarmerDashboard";
import FarmerApplicationDashboard from "../pages/farmer/Dashboard/FarmerApplicationDashboard";
import CreateApplication from "../pages/farmer/Applications/CreateApplication";
import ResubmitApplication from "../pages/farmer/Applications/ResubmitApplication";
import NotificationPage from "../pages/farmer/Notification/NotificationPage";
import PaymentSuccess from "../pages/farmer/Payments/PaymentSuccess";
import ApplicationDetail from "../pages/farmer/Applications/ApplicationDetail";
import PaymentCheckout from "../pages/farmer/Payments/PaymentCheckout";
import DownloadApplication from "../pages/farmer/Dashboard/DownloadApplication";
import FarmerSettings from "../pages/farmer/Settings/FarmerSettings";

// agri
import AgriDashboardPage from "../pages/agri/Dashboard/AgriDashboardPage";
import ApplicationDashboard from "../pages/agri/Applications/ApplicationDashboard";
import AgriPermitDetail from "../pages/agri/Applications/AgriPermitDetail";
import AgriMapPage from "../pages/agri/Map/DensityMap/AgriMapPage";
import AgriPaymentPage from "../pages/agri/Payment/AgriPaymentPage";
import AgriReportsPage from "../pages/agri/Reports/AgriReportsPage";
import AuditTrailPage from "../pages/agri/Audit/AuditTrailPage";


// Opv
import OpvDashboard from "../pages/opv/Dashboard/OpvDashboard";
import OpvApplicationDashboard from "../pages/opv/Application/OpvApplicationDashboard";
import OPVApplicationDetail from "../pages/opv/Application/OPVApplicationDetailView";

// Inspector
import InspectorDashboard from "../pages/inspector/Dashboard/InspectorDashboard";
import InspectionHistory from "../pages/inspector/Dashboard/InspectionHistory";
import QRScannerPage from "../pages/inspector/QR/QRScannerPage";
import VerifyApplication from "../pages/inspector/Application/VerifyApplication";

// Others
import NotFoundPage from "../pages/NotFoundPage";

const router = createBrowserRouter([
    { path: "/login", element: <LoginPage /> },
    { path: '/register', element: <RegisterPage />},
    { path: "/", element: <RootRedirect />, },


    {
        path: '/farmer',
        element: <ProtectedRoute allowedRoles={['Farmer']} />,
        children: [
            { index: true, element: <FarmerDashboard /> },
            { path: 'application', element: <FarmerApplicationDashboard /> },
            { path: 'application/detail/:id', element: <ApplicationDetail /> },
            { path: 'application/resubmit/:id', element: <ResubmitApplication /> },
            { path: 'application/create/', element: <CreateApplication /> },
            { path: 'notification/', element: <NotificationPage /> },
            { path: 'payment/success/:issued_permit_id', element: <PaymentSuccess /> },
            { path: 'payment/checkout/:id', element: <PaymentCheckout /> },
            { path: 'application/download/:id', element: <DownloadApplication />},
            { path: 'settings/', element: <FarmerSettings /> }
            ]
            },
    {
        path: '/agri',
        element: <ProtectedRoute allowedRoles={['Agri']} />,
        children: [
            { index: true, element: <AgriDashboardPage /> },
            { path: 'application/', element: <ApplicationDashboard /> },
            { path: 'application/detail/:id', element: <AgriPermitDetail /> },
            { path: 'map/pig-density/', element: <AgriMapPage /> },
            { path: 'payment/', element: <AgriPaymentPage /> },
            { path: 'reports/', element: <AgriReportsPage /> },
            { path: 'audit-trail/', element: <AuditTrailPage /> },
        ]
    },

    {
        path: '/opv',
        element: <ProtectedRoute allowedRoles={['Opv']} />,
        children: [
            { index: true, element: <OpvDashboard /> },
            { path: 'application/', element: <OpvApplicationDashboard /> },
            { path: 'application/detail/:id', element: <OPVApplicationDetail /> },
        ]
    },

    {
        path: '/inspector',
        element: <ProtectedRoute allowedRoles={['Inspector']} />,
        children: [
            { index: true, element: <InspectorDashboard /> },
            { path: 'scan/', element: <QRScannerPage />},
            { path: 'history/', element: <InspectionHistory />},
            { path: 'verify/:token/', element: <VerifyApplication />},
        ]
    },

    { path: "*", element: <NotFoundPage /> },
])


export default router;
