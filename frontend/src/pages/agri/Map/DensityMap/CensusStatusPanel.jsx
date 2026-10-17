import { useState } from "react";
import { 
    TrendingUp, 
    TrendingDown, 
    ShieldCheck, 
    ChevronDown, 
    ChevronUp, 
    Truck, 
    Calculator,
    ArrowUpRight,
    ArrowLeft
} from "lucide-react";

/**
 * Context-Aware Status & Intelligence Panel:
 * Transitions smoothly between Municipal Intelligence Mode and
 * Single-Barangay Dossier Mode to eliminate card stacking and information overload.
 */
const CensusStatusPanel = ({ 
    filters, 
    totalPigs, 
    operationalTakeaway, 
    secondaryTakeaway, 
    comparisonStats, 
    survey = [], 
    transportVolume = [] 
}) => {
    const { isCompareMode, selectedYear, baselineYear, selectedBarangay, setSelectedBarangay } = filters;
    const [expandedWhy, setExpandedWhy] = useState(false);

    // Selected Barangay Dossier Data
    const selectedBarangayRecord = selectedBarangay
        ? survey.find(s => s.barangay.toLowerCase() === selectedBarangay.toLowerCase())
        : null;

    const selectedTransportRecord = selectedBarangay
        ? transportVolume.find(t => t.barangay.toLowerCase() === selectedBarangay.toLowerCase())
        : null;

    const bPigs = Number(selectedBarangayRecord?.total_pigs || 0);
    const bBreakdown = selectedBarangayRecord?.breakdown || {};
    const bTransported = Number(selectedTransportRecord?.total_transported || 0);
    const bShare = totalPigs > 0 ? ((bPigs / totalPigs) * 100).toFixed(1) : '0.0';

    // -------------------------------------------------------------------------
    // VIEW A: SINGLE-BARANGAY FOCUSED DOSSIER (WHEN A BARANGAY IS SELECTED)
    // -------------------------------------------------------------------------
    if (selectedBarangay && selectedBarangayRecord) {
        return (
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs font-sans space-y-4">
                {/* Back to Municipal Overview Button */}
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                    <button
                        type="button"
                        onClick={() => setSelectedBarangay(null)}
                        className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-stone-600 hover:text-green-700 transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={14} />
                        <span>Back to Sariaya Overview</span>
                    </button>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-600/40">
                        {selectedBarangayRecord.density_level || 'Active'}
                    </span>
                </div>

                {/* Barangay Header */}
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
                        Inspecting Sector
                    </span>
                    <h2 className="text-xl font-black uppercase tracking-tight text-stone-800 leading-tight">
                        {selectedBarangay}
                    </h2>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
                            Swine Census
                        </span>
                        <p className="text-lg font-black text-stone-800 font-mono mt-0.5 leading-none">
                            {bPigs.toLocaleString()}
                        </p>
                        <span className="text-[10px] text-stone-500 font-medium">
                            {bShare}% of municipality
                        </span>
                    </div>

                    <div className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-sky-700 block">
                            Outbound Shipments
                        </span>
                        <p className="text-lg font-black text-sky-900 font-mono mt-0.5 leading-none flex items-center gap-1">
                            <Truck size={15} />
                            {bTransported.toLocaleString()}
                        </p>
                        <span className="text-[10px] text-sky-600 font-medium">
                            Permits released
                        </span>
                    </div>
                </div>

                {/* Herd Stage Breakdown */}
                <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block">
                        Herd Stage Composition
                    </span>
                    <div className="space-y-1.5 text-xs">
                        {[
                            { key: 'inahin', label: 'Breeding Sows', color: 'bg-green-600' },
                            { key: 'fattener', label: 'Market Fatteners', color: 'bg-amber-500' },
                            { key: 'grower', label: 'Growing Stock', color: 'bg-sky-600' },
                            { key: 'starter', label: 'Piglets / Starters', color: 'bg-purple-600' },
                            { key: 'barako', label: 'Breeding Boars', color: 'bg-stone-500' },
                            { key: 'bulaw', label: 'Bulaw', color: 'bg-stone-400' },
                        ].map(stage => {
                            const count = Number(bBreakdown[stage.key] || 0);
                            if (count <= 0 && bPigs > 0) return null;
                            const pct = bPigs > 0 ? Math.round((count / bPigs) * 100) : 0;
                            return (
                                <div key={stage.key} className="space-y-1">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-stone-600 font-medium">{stage.label}</span>
                                        <span className="font-mono font-bold text-stone-800">
                                            {count.toLocaleString()} <span className="text-[9px] text-stone-400 font-sans">({pct}%)</span>
                                        </span>
                                    </div>
                                    <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${stage.color} rounded-full transition-all duration-300`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sector Specific Operational Classification */}
                {operationalTakeaway && (
                    <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1 text-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">
                            Sector Classification: {operationalTakeaway.category}
                        </span>
                        <p className="text-stone-700 leading-relaxed font-normal">
                            {operationalTakeaway.insight}
                        </p>
                        {operationalTakeaway.action && (
                            <div className="pt-1.5 border-t border-stone-200 text-[11px]">
                                <span className="font-bold text-stone-800">Action: </span>
                                <span className="text-stone-600">{operationalTakeaway.action}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // VIEW B: MUNICIPAL OVERVIEW MODE (DEFAULT VIEW WHEN NO BARANGAY IS SELECTED)
    // -------------------------------------------------------------------------
    return (
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs font-sans space-y-4">
            
            {/* Header / Mode Indicator */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                <div className="flex items-center gap-1.5 text-green-700">
                    <ShieldCheck size={16} className="text-green-700 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-widest">
                        Municipal Intelligence
                    </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                    {isCompareMode ? `${baselineYear} vs ${selectedYear}` : selectedYear}
                </span>
            </div>

            {/* Compare Shifts Box (if compare mode is active) */}
            {isCompareMode && comparisonStats && (
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                            Municipal Census Shift
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                            comparisonStats.netDiff > 0 
                                ? 'bg-green-50 text-green-700 border border-green-600/40' 
                                : comparisonStats.netDiff < 0 
                                    ? 'bg-red-50 text-red-700 border border-red-600/40'
                                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}>
                            {comparisonStats.netDiff > 0 && <TrendingUp size={12} />}
                            {comparisonStats.netDiff < 0 && <TrendingDown size={12} />}
                            {comparisonStats.netDiff > 0 
                                ? `+${comparisonStats.netDiff.toLocaleString()} (+${comparisonStats.netPct}%)` 
                                : comparisonStats.netDiff < 0 
                                    ? `-${Math.abs(comparisonStats.netDiff).toLocaleString()} (-${comparisonStats.netPct}%)` 
                                    : 'Stable'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-200">
                        <div className="bg-white p-2 rounded-md border border-stone-200">
                            <span className="text-[9px] text-stone-400 font-black uppercase tracking-widest block">{baselineYear} Base</span>
                            <span className="font-bold text-stone-800 font-mono text-xs">
                                {comparisonStats.baseTotal.toLocaleString()} pigs
                            </span>
                        </div>
                        <div className="bg-white p-2 rounded-md border border-stone-200">
                            <span className="text-[9px] text-green-700 font-black uppercase tracking-widest block">{selectedYear} Target</span>
                            <span className="font-bold text-stone-800 font-mono text-xs">
                                {comparisonStats.targetTotal.toLocaleString()} pigs
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Grounded Operational Takeaway Card */}
            {operationalTakeaway && (
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-600/40">
                            {operationalTakeaway.category}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Audit-Grounded
                        </span>
                    </div>

                    <h3 className="text-sm font-black text-stone-800 uppercase tracking-tight">
                        {operationalTakeaway.title}
                    </h3>

                    <p className="text-xs text-stone-600 leading-relaxed font-normal">
                        {operationalTakeaway.insight}
                    </p>

                    {/* Clickable Sector Links */}
                    {operationalTakeaway.affectedBarangays?.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Focus Sector:</span>
                            {operationalTakeaway.affectedBarangays.map(bName => (
                                <button
                                    key={bName}
                                    type="button"
                                    onClick={() => setSelectedBarangay(bName)}
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-stone-100 hover:bg-green-50 text-stone-700 hover:text-green-700 rounded-md text-[10px] font-bold border border-stone-200 transition-colors cursor-pointer"
                                    title={`Inspect ${bName}`}
                                >
                                    <span>{bName}</span>
                                    <ArrowUpRight size={10} />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Priority Action */}
                    {operationalTakeaway.action && (
                        <div className="p-2.5 bg-green-50 rounded-lg border border-green-200 text-xs text-stone-800 space-y-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block">
                                Priority Action:
                            </span>
                            <p className="leading-snug text-stone-700">{operationalTakeaway.action}</p>
                        </div>
                    )}

                    {/* Collapsible "Why this conclusion?" Audit Drawer */}
                    {operationalTakeaway.why && (
                        <div className="pt-2 border-t border-stone-200">
                            <button
                                type="button"
                                onClick={() => setExpandedWhy(prev => !prev)}
                                className="flex items-center justify-between w-full py-1 text-xs font-bold text-stone-600 hover:text-stone-800 transition-colors cursor-pointer"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Calculator size={13} className="text-stone-400" />
                                    Why this conclusion?
                                </span>
                                {expandedWhy ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {expandedWhy && (
                                <div className="mt-2 p-2.5 bg-stone-50 rounded-lg border border-stone-200 space-y-2 text-[10px]">
                                    <div className="space-y-0.5">
                                        <span className="font-black text-stone-500 uppercase tracking-widest text-[9px] block">
                                            Reasoning Rule:
                                        </span>
                                        <p className="text-stone-700 font-medium">
                                            {operationalTakeaway.why.summary}
                                        </p>
                                    </div>

                                    <div className="space-y-0.5">
                                        <span className="font-black text-stone-500 uppercase tracking-widest text-[9px] block">
                                            Trigger Formula:
                                        </span>
                                        <code className="bg-white p-1 rounded-md border border-stone-200 font-mono text-green-700 block text-[9px] break-all">
                                            {operationalTakeaway.why.formula}
                                        </code>
                                    </div>

                                    {operationalTakeaway.why.evidence?.length > 0 && (
                                        <div className="space-y-1 pt-1 border-t border-stone-200">
                                            <span className="font-black text-stone-500 uppercase tracking-widest text-[9px] block">
                                                Underlying Census Data:
                                            </span>
                                            <div className="grid grid-cols-1 gap-1">
                                                {operationalTakeaway.why.evidence.map((ev, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white px-2 py-0.5 rounded-md border border-stone-200">
                                                        <span className="text-stone-500 font-medium">{ev.label}</span>
                                                        <span className="font-mono font-bold text-stone-800">{ev.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Secondary Operational Note */}
            {secondaryTakeaway && (
                <div className="pt-2.5 border-t border-stone-200 space-y-1 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                        {secondaryTakeaway.category}
                    </span>
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-tight">
                        {secondaryTakeaway.title}
                    </h4>
                    <p className="text-stone-600 leading-snug font-normal text-[11px]">
                        {secondaryTakeaway.insight}
                    </p>
                </div>
            )}
        </div>
    );
};

export default CensusStatusPanel;