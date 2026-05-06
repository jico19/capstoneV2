import { MapPin, Calendar, Clipboard, User } from 'lucide-react';

/**
 * Application Header
 * Redesigned for Farmer-Friendly clarity and Minimalist Design System.
 */
const ApplicationHeader = ({ data }) => {
    return (
        <header className="relative space-y-10">
            {/* Top Row: Identification */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-10 bg-green-600"></div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
                            {data.application_id}
                        </h1>
                    </div>
                    <p className="text-gray-500 font-medium text-lg">
                        Transport Permit for <span className="text-gray-900 font-black">{data.farmer_name}</span>
                    </p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        Current Status
                    </span>
                    <div className="px-5 py-2 bg-green-50 text-green-700 border border-green-100 rounded-none text-xs font-black uppercase tracking-widest">
                        {data.status_display}
                    </div>
                </div>
            </div>

            {/* Transport Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 border border-gray-100 bg-gray-50/50">
                <DetailItem label="From Area" value={data.origin_barangay_name} sub="Sariaya, Quezon" icon={<MapPin size={16} className="text-green-600" />} />
                <DetailItem label="Going To" value={data.destination} icon={<Clipboard size={16} className="text-green-600" />} />
                <DetailItem label="Total Count" value={`${data.number_of_pigs} Heads`} sub="Live Swine" icon={<User size={16} className="text-green-600" />} />
                <DetailItem label="Travel Date" value={data.transport_date} icon={<Calendar size={16} className="text-green-600" />} />
            </div>

            {/* Purpose Flag */}
            <div className="flex items-start gap-4 p-4 border-l-4 border-gray-200 bg-white italic text-gray-600 text-sm">
                <span className="font-black uppercase text-[10px] tracking-widest not-italic text-gray-400">Purpose</span>
                <span className="font-medium">"{data.purpose}"</span>
            </div>
        </header>
    );
};

const DetailItem = ({ label, value, sub, icon }) => (
    <div className="p-6 space-y-2 border-b md:border-b-0 md:border-r border-gray-100 last:border-0">
        <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-black tracking-widest">
            {icon} {label}
        </div>
        <div className="space-y-0.5">
            <p className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{value}</p>
            {sub && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{sub}</p>}
        </div>
    </div>
);

export default ApplicationHeader;