import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FilesIcon,
    FilePlus2,
    Bell,
    Settings,
    QrCode,
    History,
} from 'lucide-react';
import useAuthStore from '../store/authContext';

/**
 * Mobile-first navigation bar for Farmer and Inspector roles.
 * Displays at the bottom of the screen on mobile devices.
 * 
 * Follows Design.MD:
 * - Stone text for inactive items
 * - Green active indicator (top border)
 * - Square edges, no shadows
 * - High-signal minimalism
 */
const MobileNavbar = () => {
    const { user, isAuthenticated } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated || !user) return null;

    // Define navigation items based on user role
    const getNavItems = () => {
        switch (user.role) {
            case 'Farmer':
                return [
                    { icon: LayoutDashboard, label: 'Home', to: '/farmer/' },
                    { icon: FilesIcon, label: 'Apps', to: '/farmer/application' },
                    { icon: FilePlus2, label: 'Apply', to: '/farmer/application/create/' },
                    { icon: Settings, label: 'Setup', to: '/farmer/settings/' },
                ];
            case 'Inspector':
                return [
                    { icon: LayoutDashboard, label: 'Home', to: '/inspector/' },
                    { icon: QrCode, label: 'Scan', to: '/inspector/scan/' },
                    { icon: History, label: 'Logs', to: '/inspector/history/' },
                    { icon: Settings, label: 'Settings', to: '/inspector/settings/' },
                ];
            default:
                return null;
        }
    };

    const navItems = getNavItems();

    // Only render for Farmer and Inspector roles on mobile
    if (!navItems) return null;

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200">
            <nav className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-150 ${
                                isActive ? 'text-green-700' : 'text-stone-400'
                            }`}
                        >
                            {/* Active Indicator (Top Border) */}
                            <div className="relative flex items-center justify-center w-full">
                                {isActive && (
                                    <div className="absolute -top-[8px] w-full h-1 bg-green-700" />
                                )}
                                <Icon 
                                    size={20} 
                                    className={isActive ? 'text-green-700' : 'text-stone-400'} 
                                    strokeWidth={isActive ? 2.5 : 2} 
                                />
                            </div>
                            
                            {/* Label */}
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                                isActive ? 'text-green-700' : 'text-stone-400'
                            }`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default MobileNavbar;
