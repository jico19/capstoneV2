import { TrendingUp, TrendingDown, ShieldCheck, Minus, Info } from "lucide-react";

/**
 * Left status column of the Pig Population Map: census status / yearly
 * comparison card, interactive density legend, and staff quick guide.
 */
const CensusStatusPanel = ({ filters, toggleFilter, totalPigs, isMapDataUpdating, operationalTakeaway, comparisonStats }) => {
    const { isCompareMode, selectedYear, baselineYear, activeFilters } = filters;

    return (
        <div className="xl:col-span-1 space-y-6">
            
            {/* Status / Comparison Card */}
            <div className="bg-white border border-stone-200 p-6 space-y-6 rounded-none shadow-sm">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                        {isCompareMode ? 'Yearly Comparison' : 'Census Status'}
                    </p>
                    <h2 className="text-xl font-black text-stone-900 tracking-tight uppercase">
                        {isCompareMode ? 'What Changed Between Years' : 'At a Glance'}
                    </h2>
                </div>

                {/* Stats Display */}
                {!isCompareMode ? (
                    /* Standard Single-Year Total with Meaningful Operational Takeaway */
                    <div className={`space-y-4 transition-all duration-300 ${isMapDataUpdating ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
                        <div className="p-4 bg-stone-50 border border-stone-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-100 text-emerald-800">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest">
                                        Total Swine ({selectedYear})
                                    </p>
                                    <p className="text-2xl font-black text-stone-900 leading-none mt-1">
                                        {isMapDataUpdating ? '...' : totalPigs.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Non-Generic Purposeful Takeaway */}
                        <div className="p-3.5 bg-stone-50 border-l-2 border-l-emerald-600 border border-stone-200 space-y-2.5">
                            <div className="flex items-center justify-between gap-1.5 border-b border-stone-200/60 pb-1.5">
                                <div className="flex items-center gap-1.5 text-emerald-800">
                                    <ShieldCheck size={13} className="shrink-0 text-emerald-700" />
                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-900">
                                        {operationalTakeaway.category}
                                    </span>
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400">
                                    Operational Takeaway
                                </span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[11px] font-black text-stone-900 uppercase tracking-tight">
                                    {operationalTakeaway.title}
                                </p>
                                <p className="text-xs text-stone-700 leading-relaxed font-medium">
                                    {operationalTakeaway.insight}
                                </p>
                            </div>

                            {operationalTakeaway.action && (
                                <div className="pt-2 border-t border-stone-200/80 flex items-start gap-1.5 text-[10px] text-stone-600">
                                    <span className="font-bold text-emerald-800 uppercase tracking-wider shrink-0 text-[9px]">Priority Action:</span>
                                    <span className="leading-snug">{operationalTakeaway.action}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Plain-English Compare Mode Municipal Summary */
                    <div className={`space-y-4 ${isMapDataUpdating ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
                        
                        {/* 1. Structural Diagnostic Takeaway Card */}
                        <div className="p-3.5 bg-stone-50 border-l-2 border-l-emerald-600 border border-stone-200 space-y-2.5">
                            <div className="flex items-center justify-between gap-1.5 border-b border-stone-200/60 pb-1.5">
                                <div className="flex items-center gap-1.5 text-emerald-800">
                                    <ShieldCheck size={13} className="shrink-0 text-emerald-700" />
                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-900">
                                        {operationalTakeaway.category}
                                    </span>
                                </div>
                                <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400">
                                    Operational Takeaway
                                </span>
                            </div>

                            <div className="space-y-1">
                                <p className="text-[11px] font-black text-stone-900 uppercase tracking-tight">
                                    {operationalTakeaway.title}
                                </p>
                                <p className="text-xs text-stone-700 leading-relaxed font-medium">
                                    {operationalTakeaway.insight}
                                </p>
                            </div>

                            {operationalTakeaway.action && (
                                <div className="pt-2 border-t border-stone-200/80 flex items-start gap-1.5 text-[10px] text-stone-600">
                                    <span className="font-bold text-emerald-800 uppercase tracking-wider shrink-0 text-[9px]">Priority Action:</span>
                                    <span className="leading-snug">{operationalTakeaway.action}</span>
                                </div>
                            )}
                        </div>

                        {/* 2. Headcount Comparison Box */}
                        <div className="p-4 bg-stone-50 border border-stone-200 space-y-3">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-stone-500">
                                <span>Total Swine in Sariaya</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[10px] font-black ${
                                    comparisonStats?.netDiff > 0 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                        : comparisonStats?.netDiff < 0 
                                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                                            : 'bg-stone-100 text-stone-700 border-stone-200'
                                }`}>
                                    {comparisonStats?.netDiff > 0 && <TrendingUp size={11} />}
                                    {comparisonStats?.netDiff < 0 && <TrendingDown size={11} />}
                                    {comparisonStats?.netDiff > 0 
                                        ? `+${comparisonStats?.netDiff.toLocaleString()} Pigs (+${comparisonStats?.netPct}%)` 
                                        : comparisonStats?.netDiff < 0 
                                            ? `-${Math.abs(comparisonStats?.netDiff).toLocaleString()} Pigs (-${comparisonStats?.netPct}%)` 
                                            : 'No Net Change'}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-200">
                                <div className="bg-white p-2 border border-stone-200">
                                    <span className="text-[9px] text-stone-400 font-black uppercase block mb-0.5">
                                        Earlier ({baselineYear})
                                    </span>
                                    <span className="font-bold text-stone-800 text-sm">
                                        {comparisonStats?.baseTotal.toLocaleString()} <span className="text-[10px] font-normal text-stone-400 font-sans">pigs</span>
                                    </span>
                                </div>
                                <div className="bg-white p-2 border border-emerald-200">
                                    <span className="text-[9px] text-emerald-700 font-black uppercase block mb-0.5">
                                        Later ({selectedYear})
                                    </span>
                                    <span className="font-bold text-stone-900 text-sm">
                                        {comparisonStats?.targetTotal.toLocaleString()} <span className="text-[10px] font-normal text-emerald-600 font-sans">pigs</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 3. Barangay Movement Breakdown */}
                        <div className="p-4 bg-white border border-stone-200 space-y-2.5 text-xs">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest block border-b border-stone-100 pb-1.5">
                                Barangay Movements
                            </span>
                            <div className="space-y-2 text-[11px] font-bold">
                                <div className="flex justify-between items-center bg-emerald-50/50 p-1.5 border border-emerald-100 text-emerald-800">
                                    <span className="flex items-center gap-1.5">
                                        <TrendingUp size={13} className="text-emerald-600" />
                                        Barangays That Grew (Added Pigs)
                                    </span>
                                    <span className="font-mono text-xs">{comparisonStats?.increased}</span>
                                </div>
                                <div className="flex justify-between items-center bg-rose-50/50 p-1.5 border border-rose-100 text-rose-800">
                                    <span className="flex items-center gap-1.5">
                                        <TrendingDown size={13} className="text-rose-600" />
                                        Barangays That Dropped (Fewer Pigs)
                                    </span>
                                    <span className="font-mono text-xs">{comparisonStats?.decreased}</span>
                                </div>
                                <div className="flex justify-between items-center bg-stone-50 p-1.5 border border-stone-200 text-stone-600">
                                    <span className="flex items-center gap-1.5">
                                        <Minus size={13} className="text-stone-400" />
                                        No Significant Change (Steady)
                                    </span>
                                    <span className="font-mono text-xs">{comparisonStats?.stable}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Interactive Density Colors Legend */}
                <div className="pt-4 border-t border-stone-200">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-stone-900 uppercase tracking-widest">
                            Density Legend & Filter
                        </span>
                    </div>
                    <div className="space-y-2.5">
                        {[
                            { id: 'Very High', label: 'Very High (1,500+)', color: 'bg-red-600' },
                            { id: 'High', label: 'High (500 - 1,499)', color: 'bg-red-400' },
                            { id: 'Medium', label: 'Medium (100 - 499)', color: 'bg-amber-500' },
                            { id: 'Low', label: 'Low (< 100)', color: 'bg-green-600' },
                            { id: 'None', label: 'No Data / 0', color: 'bg-gray-300' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => toggleFilter(item.id)}
                                className={`flex items-center gap-3 w-full p-2 bg-stone-50/50 hover:bg-stone-100 border border-stone-200 transition-opacity cursor-pointer ${
                                    activeFilters.includes(item.id) ? 'opacity-100' : 'opacity-30'
                                }`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-none ${item.color} border border-stone-400/50 shrink-0`} />
                                <span className={`text-[10px] font-black uppercase tracking-wider text-left flex-1 ${
                                    activeFilters.includes(item.id) ? 'text-stone-900' : 'text-stone-400'
                                }`}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-stone-400 mt-4 font-bold uppercase tracking-wider leading-relaxed">
                        Click any density level to toggle map visibility
                    </p>
                </div>
            </div>

            {/* Notice & Staff Quick Guide Card */}
            <div className="bg-stone-900 p-5 text-white border border-stone-800 rounded-none space-y-3">
                <div className="flex items-center gap-2">
                    <Info size={15} className="text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        {isCompareMode ? 'Staff Quick Guide' : 'Data Integrity'}
                    </span>
                </div>
                
                {isCompareMode ? (
                    <div className="space-y-2.5 text-[11px] text-stone-300 leading-relaxed">
                        <p className="font-medium text-white border-b border-stone-800 pb-1.5">
                            How to interpret the changes:
                        </p>
                        <div className="space-y-2 text-[10px]">
                            <div className="flex items-start gap-2">
                                <span className="w-2 h-2 rounded-none bg-emerald-400 mt-1 shrink-0"></span>
                                <p><strong className="text-emerald-400 uppercase tracking-wider">Increases:</strong> Farmers restocked piglets or expanded breeding pens.</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-2 h-2 rounded-none bg-rose-400 mt-1 shrink-0"></span>
                                <p><strong className="text-rose-400 uppercase tracking-wider">Decreases:</strong> Hogs reached market weight and were sold or transported out.</p>
                            </div>
                            <p className="text-stone-400 pt-1.5 border-t border-stone-800 text-[10px]">
                                Click any barangay on the map to see its exact category breakdown.
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-[11px] text-stone-300 leading-relaxed font-medium">
                        Swine density classifications are grounded in verified municipal and barangay agriculture surveys.
                    </p>
                )}
            </div>
        </div>
    );
};

export default CensusStatusPanel;