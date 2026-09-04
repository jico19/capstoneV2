import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ChartTakeaway Component
 * Provides a high-signal, non-obvious diagnostic translation of a chart for operators and farmers.
 * Follows FarmPass Design System (stone neutrals, flat UI, zero border-radius, emerald accents).
 */
const ChartTakeaway = ({ takeaway, isLoading = false, className = '' }) => {
    if (!takeaway && !isLoading) {
        return null;
    }

    const isObject = typeof takeaway === 'object' && takeaway !== null;
    const category = isObject ? (takeaway.category || 'OPERATIONAL TAKEAWAY') : 'OPERATIONAL TAKEAWAY';
    const title = isObject ? takeaway.title : null;
    const insight = isObject ? (takeaway.insight || takeaway.text || '') : takeaway;
    const action = isObject ? takeaway.action : null;
    const actionLink = isObject ? takeaway.actionLink : null;

    return (
        <div className={`mt-3 p-3.5 bg-stone-50 border-l-2 border-l-emerald-600 border border-stone-200 rounded-none space-y-2 font-sans ${className}`}>
            <div className="flex items-center justify-between gap-1.5 border-b border-stone-200/60 pb-1.5">
                <div className="flex items-center gap-1.5 text-emerald-800">
                    <ShieldCheck size={13} className="text-emerald-700 shrink-0" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-900">
                        {category}
                    </span>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400">
                    Operational Takeaway
                </span>
            </div>

            {isLoading ? (
                <div className="space-y-1.5 py-1">
                    <div className="h-2.5 bg-stone-200 animate-pulse w-full"></div>
                    <div className="h-2.5 bg-stone-200 animate-pulse w-3/4"></div>
                </div>
            ) : (
                <div className="space-y-1">
                    {title && (
                        <p className="text-[11px] font-black text-stone-900 uppercase tracking-tight">
                            {title}
                        </p>
                    )}
                    <p className="text-xs text-stone-700 font-medium leading-relaxed">
                        {insight}
                    </p>
                </div>
            )}

            {action && !isLoading && (
                <div className="pt-2 border-t border-stone-200/80 flex items-start justify-between gap-2 text-[10px] text-stone-600">
                    <div className="flex items-start gap-1.5 min-w-0">
                        <span className="font-bold text-emerald-800 uppercase tracking-wider shrink-0 text-[9px]">Priority Action:</span>
                        <span className="leading-snug font-medium text-stone-700">{action}</span>
                    </div>
                    {actionLink && (
                        <Link to={actionLink} className="text-emerald-700 hover:text-emerald-800 font-black uppercase text-[9px] tracking-wider shrink-0 hover:underline flex items-center gap-0.5">
                            Execute →
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChartTakeaway;
