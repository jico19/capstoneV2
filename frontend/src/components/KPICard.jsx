// --- Sub-component: KPI Card ---
const KPICard = ({ title, value, subtitle, icon: Icon, colorClass, isPercent }) => (
    <div className="bg-white border border-gray-200 p-5 flex flex-col justify-between">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{isPercent ? `${value}%` : value}</h3>
            </div>
            <div className={`p-2 rounded-none ${colorClass}`}>
                <Icon size={18} />
            </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-4 font-medium italic">{subtitle}</p>
    </div>
);

export default KPICard