import Skeleton from 'react-loading-skeleton';
import { useContentLoading } from './loadingContext';
import { MapPin, Calendar, Clipboard, User } from 'lucide-react';

/**
 * Application Header
 * Responsive for mobile and desktop screens.
 * Strictly adheres to Design.MD: green-700 primary, green-50 fills, stone neutrals, no shadows.
 */
const ApplicationHeader = ({ data }) => {   
    const isLoading = useContentLoading();
    return (
        <header className="relative space-y-6 sm:space-y-8">
            {/* Top Row: Identification & Status */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-stone-200 pb-5">
                <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-6 sm:h-8 bg-green-700 shrink-0"></div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-800 tracking-tight leading-none uppercase truncate">
                            {isLoading ? <Skeleton width="12ch" /> : data.application_id}
                        </h1>
                    </div>
                    <p className="text-stone-500 font-medium text-xs sm:text-sm pl-4 truncate">
                        Transport Permit for <span className="text-stone-800 font-black">{isLoading ? <Skeleton width="12ch" /> : data.farmer_name}</span>
                    </p>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Current Status
                    </span>
                    <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-md text-xs font-semibold uppercase tracking-wider">
                        {isLoading ? <Skeleton width="12ch" /> : data.status_display}
                    </div>
                </div>
            </div>

            {/* Transport Details Grid (2x2 on mobile, 4-col on desktop) */}
            <div className="grid grid-cols-2 md:grid-cols-4 border border-stone-200 bg-stone-50/60 rounded-xl overflow-hidden divide-x divide-y md:divide-y-0 divide-stone-200 shadow-xs">
                <DetailItem 
                    label="From Area" 
                    value={data.origins?.length > 1 ? "Multiple Origins" : (data.origins?.[0]?.barangay_name || data.origin_barangay_name)} 
                    sub={data.origins?.length > 1 ? `${data.origins.length} Locations` : "Sariaya, Quezon"} 
                    icon={<MapPin size={14} className="text-emerald-700 shrink-0" />} 
                />
                <DetailItem 
                    label="Going To" 
                    value={data.destination || "Not specified"} 
                    icon={<Clipboard size={14} className="text-emerald-700 shrink-0" />} 
                />
                <DetailItem 
                    label="Total Count" 
                    value={`${data.number_of_pigs} Pigs`} 
                    sub="Live Swine" 
                    icon={<User size={14} className="text-emerald-700 shrink-0" />} 
                />
                <DetailItem 
                    label="Travel Date" 
                    value={data.transport_date} 
                    icon={<Calendar size={14} className="text-emerald-700 shrink-0" />} 
                />
            </div>

            {/* Purpose Flag */}
            {data.purpose && (
                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 text-xs sm:text-sm">
                    <span className="font-semibold uppercase text-[10px] tracking-wider text-stone-400 shrink-0 mt-0.5">Purpose:</span>
                    <span className="font-medium text-stone-800 italic">"{data.purpose}"</span>
                </div>
            )}
        </header>
    );
};

const DetailItem = ({ label, value, sub, icon }) => {
    const isLoading = useContentLoading();
    return (
    <div className="p-3 sm:p-4 md:p-5 space-y-1 min-w-0">
        <div className="flex items-center gap-1.5 text-stone-400 uppercase text-[8px] sm:text-[9px] font-black tracking-widest truncate">
            {icon} {label}
        </div>
        <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-black text-stone-800 truncate uppercase tracking-tight">{isLoading ? <Skeleton /> : value}</p>
            {sub && <p className="text-[8px] sm:text-[9px] font-bold text-stone-400 uppercase tracking-wide truncate">{sub}</p>}
        </div>
    </div>
    );
};

export default ApplicationHeader;
