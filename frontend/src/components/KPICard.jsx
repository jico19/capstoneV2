/**
 * Flat KPI Card component following strict design guidelines.
 * No shadows, no gradients, no rounded corners.
 */
const KPICard = ({ title, value, subtitle, icon: Icon, colorClass, isPercent }) => (
    <div className="bg-white border border-gray-200 p-6 flex flex-col justify-between h-full rounded-none">
        <div className="flex justify-between items-start">
            <div className="space-y-1">
                {/* Section Label style */}
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">
                    {title}
                </p>
                {/* Value - bold and tight tracking */}
                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">
                    {isPercent ? `${value}%` : value}
                </h3>
            </div>
            {/* Semantic icon fill - no rounded corners */}
            <div className={`p-3 rounded-none flex items-center justify-center ${colorClass}`}>
                <Icon size={20} />
            </div>
        </div>
        {/* Monospace subtitle for technical clarity */}
        <p className="text-[11px] text-gray-500 mt-6 font-medium italic border-t border-gray-100 pt-3">
            {subtitle}
        </p>
    </div>
);

export default KPICard;