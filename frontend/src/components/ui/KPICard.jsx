import React from 'react';

/**
 * Farmer-Friendly & Executive Info Card (KPICard)
 * Fully responsive for mobile (phones, 2-col grids) and desktop dashboards.
 * Strictly adheres to FarmPass Design System 2.0 (stone neutrals, flat UI, sharp edges).
 */
const KPICard = ({ title, value, subtitle, icon: Icon, colorClass, isPercent }) => {
    return (
        <div className="bg-white border border-stone-200 p-3.5 sm:p-5 md:p-6 flex flex-col justify-between min-h-[100px] sm:min-h-[130px] rounded-none transition-all relative overflow-hidden">
            {/* Top Section: Title, Value & Icon */}
            <div className="flex justify-between items-start gap-2 relative z-10">
                <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none truncate">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-1 mt-0.5">
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-800 tracking-tight leading-none truncate">
                            {value}
                            {isPercent && <span className="text-sm sm:text-lg ml-0.5 text-stone-400 font-bold">%</span>}
                        </h3>
                    </div>
                </div>
                
                {/* Responsive Square Icon Container */}
                {Icon && (
                    <div className={`p-2 sm:p-3 rounded-none border border-current/10 flex items-center justify-center shrink-0 ${colorClass || 'bg-stone-50 text-stone-500'}`}>
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                    </div>
                )}
            </div>
            
            {/* Bottom Section: Friendly Helper Text */}
            {subtitle && (
                <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-stone-100 relative z-10">
                    <div className="text-[8px] sm:text-[9px] font-black text-stone-500 uppercase tracking-wider leading-none flex items-center gap-1.5 truncate">
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-600 rounded-none shrink-0"></div>
                        <span className="truncate">{subtitle}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KPICard;