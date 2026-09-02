import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "./protectedRoute";
import RootRedirect from "./RootRedirect";

// Use a shared loading fallback
const PageLoader = () => (
    <div className="flex items-center justify-center min-h-screen bg-white">
        <span className="loading loading-spinner loading-lg text-green-700"></span>
    </div>
);

// Wrap a lazy component with Suspense
const withSuspense = (Component) => (
    <Suspense fallback={<PageLoader />}>
        <Component />
    </Suspense>
);

// Landing Page
const LandingLayout = lazy(() => import("../pages/landing-page/LandingLayout"));
const LandingHome = lazy(() => import("../pages/landing-page/Home/home"));
const LandingRequirements = lazy(() => import("../pages/landing-page/Requirements/requirements"));
const LandingAbout = lazy(() => import("../pages/landing-page/About/about"));
const LandingFAQs = lazy(() => import("../pages/landing-page/FAQs/faqs"));

// auths
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const SettingsPage = lazy(() => import("../pages/shared/SettingsPage"));

// farmer
const FarmerDashboard = lazy(() => import("../pages/farmer/Dashboard/FarmerDashboard"));
const FarmerApplicationDashboard = lazy(() => import("../pages/farmer/Dashboard/FarmerApplicationDashboard"));
const CreateApplication = lazy(() => import("../pages/farmer/Applications/CreateApplication"));
const ResubmitApplication = lazy(() => import("../pages/farmer/Applications/ResubmitApplication"));
const NotificationPage = lazy(() => import("../pages/farmer/Notification/NotificationPage"));
const PaymentSuccess = lazy(() => import("../pages/farmer/Payments/PaymentSuccess"));
const ApplicationDetail = lazy(() => import("../pages/farmer/Applications/ApplicationDetail"));
const PaymentCheckout = lazy(() => import("../pages/farmer/Payments/PaymentCheckout"));
const DownloadApplication = lazy(() => import("../pages/farmer/Dashboard/DownloadApplication"));

// agri
const AgriDashboardPage = lazy(() => import("../pages/agri/Dashboard/AgriDashboardPage"));
const ApplicationDashboard = lazy(() => import("../pages/agri/Applications/ApplicationDashboard"));
const AgriPermitDetail = lazy(() => import("../pages/agri/Applications/AgriPermitDetail"));
const AgriMapPage = lazy(() => import("../pages/agri/Map/DensityMap/AgriMapPage"));
const AgriPaymentPage = lazy(() => import("../pages/agri/Payment/AgriPaymentPage"));
const AgriReportsPage = lazy(() => import("../pages/agri/Reports/AgriReportsPage"));
const AuditTrailPage = lazy(() => import("../pages/agri/Audit/AuditTrailPage"));
const FarmerManagementPage = lazy(() => import("../pages/agri/FarmerManagementPage"));
const BarangayOfficialManagementPage = lazy(() => import("../pages/agri/BarangayOfficialManagementPage"));
const AgriSystemSettings = lazy(() => import("../pages/agri/SystemSettings/AgriSystemSettings"));

// barangay
const BarangayDashboard = lazy(() => import("../pages/barangay/Dashboard/BarangayDashboard"));
const HogSurveyPage = lazy(() => import("../pages/barangay/HogSurvey/HogSurveyPage"));
const BarangayAuditPage = lazy(() => import("../pages/barangay/Audit/BarangayAuditPage"));

// Opv
const OpvDashboard = lazy(() => import("../pages/opv/Dashboard/OpvDashboard"));
const OpvApplicationDashboard = lazy(() => import("../pages/opv/Application/OpvApplicationDashboard"));
const OPVApplicationDetail = lazy(() => import("../pages/opv/Application/OPVApplicationDetailView"));

// Inspector
const InspectorDashboard = lazy(() => import("../pages/inspector/Dashboard/InspectorDashboard"));
const InspectionHistory = lazy(() => import("../pages/inspector/Dashboard/InspectionHistory"));
const QRScannerPage = lazy(() => import("../pages/inspector/QR/QRScannerPage"));
const VerifyApplication = lazy(() => import("../pages/inspector/Application/VerifyApplication"));

// Others
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

const router = createBrowserRouter([
    // none-role route
    { path: "/login", element: withSuspense(LoginPage) },
    { path: '/register', element: withSuspense(RegisterPage) },

    // Landing & Root Redirect
    {
        path: '/',
        element: <Suspense fallback={<PageLoader />}><LandingLayout /></Suspense>,
        children: [
            { 
                index: true, 
                element: <RootRedirect>{withSuspense(LandingHome)}</RootRedirect> 
            },
            { path: 'about', element: withSuspense(LandingAbout) },
            { path: 'requirements', element: withSuspense(LandingRequirements) },
            { path: 'faqs', element: withSuspense(LandingFAQs) },
        ]
    },

    // farmer route
    {
        path: '/farmer',
        element: <ProtectedRoute allowedRoles={['Farmer']} />,
        children: [
            { index: true, element: withSuspense(FarmerDashboard) },
            { path: 'application', element: withSuspense(FarmerApplicationDashboard) },
            { path: 'application/detail/:id', element: withSuspense(ApplicationDetail) },
            { path: 'application/resubmit/:id', element: withSuspense(ResubmitApplication) },
            { path: 'application/create/', element: withSuspense(CreateApplication) },
            { path: 'notification/', element: withSuspense(NotificationPage) },
            { path: 'payment/success/:issued_permit_id', element: withSuspense(PaymentSuccess) },
            { path: 'payment/checkout/:id', element: withSuspense(PaymentCheckout) },
            { path: 'application/download/:id', element: withSuspense(DownloadApplication) },
            { path: 'settings/', element: withSuspense(SettingsPage) }
        ]
    },
    // agri route
    {
        path: '/agri',
        element: <ProtectedRoute allowedRoles={['Agri']} />,
        children: [
            { index: true, element: withSuspense(AgriDashboardPage) },
            { path: 'application/', element: withSuspense(ApplicationDashboard) },
            { path: 'application/detail/:id', element: withSuspense(AgriPermitDetail) },
            { path: 'map/pig-density/', element: withSuspense(AgriMapPage) },
            { path: 'payment/', element: withSuspense(AgriPaymentPage) },
            { path: 'reports/', element: withSuspense(AgriReportsPage) },
            { path: 'audit-trail/', element: withSuspense(AuditTrailPage) },
            { path: 'farmers/', element: withSuspense(FarmerManagementPage) },
            { path: 'barangay-officials/', element: withSuspense(BarangayOfficialManagementPage) },
            { path: 'notification/', element: withSuspense(NotificationPage) },
            { path: 'settings/', element: withSuspense(SettingsPage) },
            { path: 'system-settings/', element: withSuspense(AgriSystemSettings) },
        ]
    },
    // barangay official route
    {
        path: '/barangay',
        element: <ProtectedRoute allowedRoles={['Barangay']} />,
        children: [
            { index: true, element: withSuspense(BarangayDashboard) },
            { path: 'hog-surveys/', element: withSuspense(HogSurveyPage) },
            { path: 'audit-logs/', element: withSuspense(BarangayAuditPage) },
            { path: 'settings/', element: withSuspense(SettingsPage) },
        ]
    },
    // opv route
    {
        path: '/opv',
        element: <ProtectedRoute allowedRoles={['Opv']} />,
        children: [
            { index: true, element: withSuspense(OpvDashboard) },
            { path: 'application/', element: withSuspense(OpvApplicationDashboard) },
            { path: 'application/detail/:id', element: withSuspense(OPVApplicationDetail) },
            { path: 'notification/', element: withSuspense(NotificationPage) },
            { path: 'settings/', element: withSuspense(SettingsPage) },
        ]
    },
    // inspector route
    {
        path: '/inspector',
        element: <ProtectedRoute allowedRoles={['Inspector']} />,
        children: [
            { index: true, element: withSuspense(InspectorDashboard) },
            { path: 'scan/', element: withSuspense(QRScannerPage) },
            { path: 'history/', element: withSuspense(InspectionHistory) },
            { path: 'verify/:token/', element: withSuspense(VerifyApplication) },
            { path: 'notification/', element: withSuspense(NotificationPage) },
            { path: 'settings/', element: withSuspense(SettingsPage) },
        ]
    },

    { path: "*", element: withSuspense(NotFoundPage) },
])

export default router;