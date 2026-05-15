import {
    LayoutDashboard,
    FilePlus2,
    History,
    Map,
    UserCog,
    Settings,
    QrCode,
    BarChart3,
    Bell,
    CreditCard,
    LogOut,
    Menu,
    FilesIcon,
    FileText,
} from "lucide-react";
import useAuthStore from "../store/authContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import MobileNavbar from "./MobileNavbar";
import { useGetNotification } from "../hooks/useNotifications";

// Standard navigation item for the sidebar.
// Follows Design.MD: stone text, green active indicator on the right.
const SidebarItem = ({ icon: Icon, label, to }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 px-6 py-3 transition-colors duration-150 ${
                isActive 
                ? "bg-green-50 text-green-700 border-r-2 border-green-700" 
                : "text-stone-600 border-r-2 border-transparent hover:bg-stone-50 hover:text-stone-900"
            }`}
        >
            <Icon size={18} className={isActive ? "text-green-700" : "text-stone-400"} />
            <span className={`text-sm tracking-tight ${isActive ? "font-bold" : "font-medium"}`}>{label}</span>
        </Link>
    );
};

// Section header for grouping sidebar items.
// Uses text-[10px] font-black uppercase tracking-widest per Design.MD.
const MenuSection = ({ title, children }) => (
    <>
        <li className="px-6 mt-8 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                {title}
            </span>
        </li>
        {children}
    </>
);

const Sidebar = ({ children }) => {
    const { user, isAuthenticated, logout} = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const isMobileFirstRole = user && (user.role === 'Farmer' || user.role === 'Inspector');
    
    // Fetch notifications for the unread count badge
    const { data: notificationData } = useGetNotification(1, 0);
    const unreadCount = notificationData?.results?.filter(n => !n.is_read).length || 0;

    const renderMenuByRole = () => {
        if (!isAuthenticated) return <SidebarItem icon={LayoutDashboard} label="Public Info" to="/" />;

        switch (user.role) {
            case 'Farmer':
                return (
                    <MenuSection title="Farmer Services">
                        <SidebarItem icon={LayoutDashboard} label="Home Dashboard" to='/farmer/'/>
                        <SidebarItem icon={FilesIcon} label="My Applications" to='/farmer/application'/>
                        <SidebarItem icon={FilePlus2} label="Apply for Permit" to='/farmer/application/create/'/>
                        <SidebarItem icon={Bell} label="Your Messages" to="/farmer/notification/"/>
                        <SidebarItem icon={Settings} label="Your Settings" to="/farmer/settings/"/>
                    </MenuSection>
                );
            case 'Agri':
                return (
                    <MenuSection title="Agri Office">
                        <SidebarItem icon={LayoutDashboard} label="Overview" to='/agri/'/>
                        <SidebarItem icon={FilesIcon} label="Applications" to='/agri/application'/>
                        <SidebarItem icon={CreditCard} label="Payments"to='/agri/payment' />
                        <SidebarItem icon={Map} label="Map" to='/agri/map/pig-density/'/>
                        <SidebarItem icon={History} label="Audit Trail" to='/agri/audit-trail/'/>
                        <SidebarItem icon={BarChart3} label="Reports" to='/agri/reports/'/>
                        <SidebarItem icon={Settings} label="Settings" to='/agri/settings/'/>
                    </MenuSection>
                );
            case 'Opv':
                return (
                    <MenuSection title="Staff Portal">
                        <SidebarItem icon={LayoutDashboard} label="Overview" to="/opv/"/>
                        <SidebarItem icon={FilesIcon} label="Applications" to="/opv/application/"/>
                        <SidebarItem icon={Settings} label="Settings" to="/opv/settings/"/>
                    </MenuSection>
                );
            case 'Inspector':
                return (
                    <MenuSection title="Field Check">
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/inspector/"/>
                        <SidebarItem icon={QrCode} label="Scan QR Code" to='/inspector/scan/'/>
                        <SidebarItem icon={History} label="Inspection History" to='/inspector/history/'/>
                        <SidebarItem icon={Settings} label="Settings" to='/inspector/settings/'/>
                    </MenuSection>
                );
            case 'Admin':
                return (
                    <MenuSection title="Settings">
                        <SidebarItem icon={UserCog} label="Manage Users" to="/admin/users" />
                        <SidebarItem icon={Map} label="Map Data" to="/admin/map" />
                        <SidebarItem icon={Settings} label="System Tools" to="/admin/settings" />
                    </MenuSection>
                );
            default:
                return <SidebarItem icon={LayoutDashboard} label="Home" to="/"/>;
        }
    };

    return (
        <div className="drawer lg:drawer-open min-h-screen bg-stone-50 font-sans">
            <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

            {/* Main Content Area */}
            <div className="drawer-content flex flex-col bg-white">
                {/* Mobile Header - Hidden for mobile-first roles */}
                {!isMobileFirstRole && (
                    <header className="navbar lg:hidden bg-white border-b border-stone-100 px-4">
                        <label htmlFor="sidebar-drawer" className="btn btn-ghost btn-square text-stone-900 rounded-none">
                            <Menu size={24} />
                        </label>
                        <div className="flex-1 ml-2 font-black text-green-700 tracking-tighter text-xl">
                            LivestockPass
                        </div>
                    </header>
                )}

                {/* Simplified Mobile Header for mobile-first roles (Branding + Notifications + Logout) */}
                {isMobileFirstRole && (
                    <header className="navbar lg:hidden bg-white border-b border-stone-100 px-6">
                        <div className="flex-1 font-black text-green-700 tracking-tighter text-xl">
                            LivestockPass
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* Notification Bell */}
                            <Link 
                                to={`/${user.role.toLowerCase()}/notification/`}
                                className={`relative p-2 transition-colors ${
                                    location.pathname.includes('/notification/') ? 'text-green-700' : 'text-stone-400'
                                }`}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full border border-white"></span>
                                )}
                            </Link>

                            <button 
                                onClick={() => {
                                    logout()
                                    navigate('/')
                                }}
                                className="flex items-center gap-2 text-stone-400 hover:text-red-600 transition-colors"
                                title="Log Out"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">Log Out</span>
                                <LogOut size={18} />
                            </button>
                        </div>
                    </header>
                )}

                <main className={`flex-1 overflow-auto ${isMobileFirstRole ? 'pb-20 lg:pb-0' : ''}`}>
                    {children}
                </main>

                {/* Mobile-first bottom navbar */}
                {isMobileFirstRole && <MobileNavbar />}
            </div>

            {/* Sidebar UI - Hidden on mobile for mobile-first roles */}
            <aside className={`drawer-side z-40 ${isMobileFirstRole ? 'hidden lg:flex' : ''}`}>
                <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>

                <div className="flex flex-col w-64 min-h-full bg-white border-r border-stone-200">
                    {/* App Branding */}
                    <div className="px-6 pt-10 pb-6">
                        <h1 className="text-xl font-black text-stone-900 flex items-center gap-1 leading-none tracking-tighter">
                            Livestock<span className="text-green-700">Pass</span>
                        </h1>
                        <p className="text-[11px] font-black text-stone-400 mt-2 tracking-widest uppercase">
                            Municipal Service Portal
                        </p>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1">
                        <ul className="flex flex-col">
                            {renderMenuByRole()}
                        </ul>
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-stone-100">
                        <button 
                            onClick={() => {
                                logout()
                                navigate('/')
                            }}
                            className="flex items-center w-full gap-3 px-4 py-4 text-xs font-black tracking-widest transition-colors rounded-none text-stone-500 hover:bg-red-50 hover:text-red-600 uppercase"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default Sidebar;