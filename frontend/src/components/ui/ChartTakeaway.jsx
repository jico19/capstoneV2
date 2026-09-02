import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * ChartTakeaway Component
 * Provides a 1-sentence friendly translation of a chart for non-tech users & farmers.
 * Follows FarmPass Design System (stone neutrals, flat UI, zero border-radius).
 */
const ChartTakeaway = ({ takeaway, isLoading = false, className = '' }) => {
    if (!takeaway && !isLoading) {
        return null;
    }

    return (
        <div className={`mt-3 p-3 bg-stone-50 border-l-2 border-l-emerald-600 border border-stone-200 rounded-none flex items-start gap-2.5 ${className}`}>
            <div className="p-1 bg-emerald-100/60 text-emerald-800 rounded-none shrink-0 mt-0.5">
                <Lightbulb size={14} className="text-emerald-700" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-900">
                        Key Takeaway:
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400">
                        (Operational Guidance)
                    </span>
                </div>
                {isLoading ? (
                    <div className="space-y-1.5 py-1">
                        <div className="h-2.5 bg-stone-200 animate-pulse w-full"></div>
                        <div className="h-2.5 bg-stone-200 animate-pulse w-3/4"></div>
                    </div>
                ) : (
                    <p className="text-xs text-stone-700 font-medium leading-relaxed">
                        {takeaway}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ChartTakeaway;
