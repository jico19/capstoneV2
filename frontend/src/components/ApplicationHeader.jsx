import { MapPin, Calendar, Clipboard, User } from 'lucide-react';

const ApplicationHeader = ({ data }) => {
    return (
        <header className="relative">
            {/* Top Row: Identification */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-green-600 rounded-full"></div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                            {data.application_id}
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium">
                        Transport Permit for <span className="text-slate-900 font-bold">{data.farmer_name}</span>
                    </p>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        Lifecycle Status
                    </span>
                    <div className="px-4 py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-black uppercase">
                        {data.status_display}
                    </div>
                </div>
            </div>

            {/* Transport Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-10 border-y border-slate-100">
                <DetailItem label="Origin" value={data.origin_barangay_name} sub="Sariaya, Quezon" icon={<MapPin size={16} />} />
                <DetailItem label="Destination" value={data.destination} icon={<Clipboard size={16} />} />
                <DetailItem label="Quantity" value={`${data.number_of_pigs} Heads`} sub="Live Swine" icon={<User size={16} />} />
                <DetailItem label="Schedule" value={data.transport_date} icon={<Calendar size={16} />} />
            </div>

            {/* Purpose Flag */}
            <div className="mt-6 flex items-center gap-3 text-slate-400 italic text-sm">
                <span className="font-bold uppercase text-[10px] tracking-widest not-italic">Purpose:</span>
                "{data.purpose}"
            </div>
        </header>
    );
};

const DetailItem = ({ label, value, sub, icon }) => (
    <div className="space-y-1">
        <div className="flex items-center gap-2 text-slate-400 uppercase text-[10px] font-black tracking-widest mb-2">
            {icon} {label}
        </div>
        <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
);

export default ApplicationHeader;