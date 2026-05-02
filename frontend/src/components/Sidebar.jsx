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
} from "lucide-react";
import useAuthStore from "../store/authContext";
import { Link, useNavigate, useLocation } from "react-router-dom";


const SidebarItem = ({ icon: Icon, label, to }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 px-6 py-3 transition-colors duration-150 ${
                isActive 
                ? "bg-green-50 text-green-700 border-r-2 border-green-600" 
                : "text-gray-600 border-r-2 border-transparent hover:bg-gray-50 hover:text-gray-900"
            }`}
        >
            <Icon size={18} className={isActive ? "text-green-600" : "text-gray-400"} />
            <span className={`text-sm tracking-tight ${isActive ? "font-bold" : "font-medium"}`}>{label}</span>
        </Link>
    );
};

const MenuSection = ({ title, children }) => (
    <>
        <li className="px-6 mt-8 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                {title}
            </span>
        </li>
        {children}
    </>
);

const Sidebar = ({ children }) => {
    const { user, isAuthenticated, logout} = useAuthStore();
    const navigate = useNavigate();

    const renderMenuByRole = () => {
        if (!isAuthenticated) return <SidebarItem icon={LayoutDashboard} label="Public Info" to="/" />;

        switch (user.role) {
            case 'Farmer':
                return (
                    <MenuSection title="Farmer Services">
                        <SidebarItem icon={LayoutDashboard} label="Home Dashboard" to='/farmer/'/>
                        <SidebarItem icon={Bell} label="Your Messages" to="/farmer/notification/"/>
                    </MenuSection>
                );
            case 'Agri':
                return (
                    <MenuSection title="Agri Office">
                        <SidebarItem icon={LayoutDashboard} label="Overview" to='/agri/'/>
                        <SidebarItem icon={FilesIcon} label="Applications" to='/agri/application'/>
                        <SidebarItem icon={CreditCard} label="Payments"to='/agri/payment' />
                        <SidebarItem icon={Map} label="Pig Map" to='/agri/map/pig-density/'/>
                        <SidebarItem icon={Map} label="Checkpoint Map" to='/agri/map/check-point/'/>
                    </MenuSection>
                );
            case 'Opv':
                return (
                    <MenuSection title="Staff Portal">
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/opv/"/>
                    </MenuSection>
                );
            case 'Inspector':
                return (
                    <MenuSection title="Field Check">
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/inspector/"/>
                        <SidebarItem icon={QrCode} label="Scan QR Code" to='/inspector/scan/'/>
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
        <div className="drawer lg:drawer-open min-h-screen bg-gray-50 font-sans">
            <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

            {/* Main Content Area */}
            <div className="drawer-content flex flex-col bg-white">
                {/* Mobile Header */}
                <header className="navbar lg:hidden bg-white border-b border-gray-100 px-4">
                    <label htmlFor="sidebar-drawer" className="btn btn-ghost btn-square text-gray-900">
                        <Menu size={24} />
                    </label>
                    <div className="flex-1 ml-2 font-black text-green-600 tracking-tighter text-xl">
                        LivestockPass
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>

            {/* Sidebar UI */}
            <aside className="drawer-side z-40">
                <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>

                <div className="flex flex-col w-64 min-h-full bg-white border-r border-gray-100">
                    {/* App Branding */}
                    <div className="px-6 pt-10 pb-6">
                        <h1 className="text-xl font-black text-gray-900 flex items-center gap-1 leading-none tracking-tighter">
                            Livestock<span className="text-green-600">Pass</span>
                        </h1>
                        <p className="text-[11px] font-bold text-gray-400 mt-2 tracking-wide">
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
                    <div className="p-4 border-t border-gray-100">
                        <button 
                            onClick={() => {
                                logout()
                                navigate('/')
                            }}
                            className="flex items-center w-full gap-3 px-4 py-4 text-xs font-black tracking-widest transition-colors rounded-none text-gray-500 hover:bg-red-50 hover:text-red-600 uppercase"
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