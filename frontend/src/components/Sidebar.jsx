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
import { Link, useNavigate } from "react-router-dom";


const SidebarItem = ({ icon: Icon, label, to }) => (
    <Link to={to} className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-base-300 transition-colors">
            <Icon size={20} className="text-base-content/70" />
            <span className="font-medium text-sm">{label}</span>
    </Link>
);

const MenuSection = ({ title, children }) => (
    <>
        <li className="menu-title mt-4">
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">{title}</span>
        </li>
        {children}
    </>
);

const Sidebar = ({ children }) => {
    const { user, isAuthenticated, logout} = useAuthStore();
    const navigate = useNavigate()

    const renderMenuByRole = () => {
        if (!isAuthenticated) return <SidebarItem icon={LayoutDashboard} label="Public Information" />;

        switch (user.role) {
            case 'Farmer':
                return (
                    <MenuSection title="Farmer Portal">
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" />
                        <SidebarItem icon={FilesIcon} label="Apply for Permit" />
                        <SidebarItem icon={History} label="My Applications" />
                        <SidebarItem icon={Bell} label="Notifications" />
                    </MenuSection>
                );
            case 'Agri':
                return (
                    <MenuSection title="Agriculture Office">
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" to='/agri/'/>
                        <SidebarItem icon={FilesIcon} label="Applications" to='/agri/application'/>
                        <SidebarItem icon={CreditCard} label="Payment Confirmation"to='/agri/payment' />
                        <SidebarItem icon={Map} label="Geospatial Map" to='/agri/map'/>
                        <SidebarItem icon={BarChart3} label="System Reports" to='/agri/report'/>
                    </MenuSection>
                );
            case 'Opv':
                return (
                    <MenuSection title="OPV Staff">
                        <SidebarItem icon={LayoutDashboard} label="Dashboard" />
                        <SidebarItem icon={History} label="Validation History" />
                    </MenuSection>
                );
            case 'Inspector':
                return (
                    <MenuSection title="Field Inspection">
                        <SidebarItem icon={QrCode} label="Scan QR Code" />
                        <SidebarItem icon={History} label="Inspection Logs" />
                    </MenuSection>
                );
            case 'Admin':
                return (
                    <MenuSection title="Administration">
                        <SidebarItem icon={UserCog} label="User Management" />
                        <SidebarItem icon={Map} label="Barangay Data" />
                        <SidebarItem icon={Settings} label="System Settings" />
                    </MenuSection>
                );
            default:
                return <SidebarItem icon={LayoutDashboard} label="Dashboard" />;
        }
    };

    return (
        <div className="drawer lg:drawer-open min-h-screen bg-base-100">
            <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />

            {/* Main Content Area */}
            <div className="drawer-content flex flex-col bg-white">
                {/* Mobile Header */}
                <header className="navbar lg:hidden bg-base-100 border-b border-base-200 px-4">
                    <label htmlFor="sidebar-drawer" className="btn btn-ghost btn-square">
                        <Menu size={24} />
                    </label>
                    <div className="flex-1 ml-2 font-bold text-primary tracking-tight">LivestockPass</div>
                </header>

                <main className="p-6 lg:p-10">
                    {children}
                </main>
            </div>

            {/* Sidebar UI */}
            <aside className="drawer-side z-40">
                <label htmlFor="sidebar-drawer" className="drawer-overlay"></label>

                <div className="flex flex-col w-72 min-h-full bg-base-200 border-r border-base-300">
                    {/* App Branding */}
                    <div className="px-8 pt-8 pb-4">
                        <h1 className="text-2xl font-black text-green-600 flex items-center gap-2">
                            LivestockPass
                        </h1>
                    </div>

                    {/* Navigation Menu */}
                    <ul className="menu flex-1 px-4 py-2">
                        {renderMenuByRole()}
                    </ul>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-base-300 bg-base-200/50">
                        <button 
                            onClick={() => {
                                logout()
                                navigate('/')
                            }}
                            className="btn btn-ghost btn-block justify-start gap-3 font-medium text-sm text-error hover:bg-error/10"
                        >
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default Sidebar;