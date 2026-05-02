import React from 'react';

/**
 * Farmer-Friendly Info Card (KPI)
 * Redesigned for high readability and strict adherence to the Minimalist Design System.
 */
const KPICard = ({ title, value, subtitle, icon: Icon, colorClass, isPercent }) => {
    return (
        <div className="bg-white border border-gray-100 p-8 flex flex-col justify-between min-h-[180px] rounded-none transition-colors relative overflow-hidden">
            {/* Top Section: Title & Icon */}
            <div className="flex justify-between items-start gap-4 relative z-10">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">
                            {value}
                            {isPercent && <span className="text-xl ml-1 text-gray-300">%</span>}
                        </h3>
                    </div>
                </div>
                
                {/* Square Icon Container */}
                <div className={`p-4 rounded-none border border-current/5 flex items-center justify-center ${colorClass || 'bg-gray-50 text-gray-400'}`}>
                    <Icon size={24} strokeWidth={2.5} />
                </div>
            </div>
            
            {/* Bottom Section: Friendly Helper Text */}
            {subtitle && (
                <div className="mt-8 pt-4 border-t border-gray-50 relative z-10">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-none"></div>
                        {subtitle}
                    </p>
                </div>
            )}
        </div>
    );
};

export default KPICard;