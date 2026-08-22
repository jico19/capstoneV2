import { useState, useRef, useEffect, useMemo } from "react"
import MainMap from "./MainMap"
import { useGetHogSurvey, useGetMaps, useGetHogSurveyYears } from "/src/hooks/useMaps"
import { 
    Map as MapIcon, 
    Info, 
    AlertTriangle, 
    Search, 
    TrendingUp, 
    TrendingDown,
    Scale, 
    Upload, 
    Minus,
    ArrowRight,
    RotateCcw,
    Calendar,
    CloudRain,
    Sun,
    X,
    Sparkles,
    FileText
} from "lucide-react"
import HogSurveyUploadModal from "/src/components/HogSurveyUploadModal"

/**
 * Agriculture Pig Population Map & Operations Hub
 * Redesigned for maximum visual clarity, generous breathing room, and intuitive multi-year analytics.
 */
const AgriMapPage = () => {
    const [seasonMode, setSeasonMode] = useState('all') // 'all' | 'wet' | 'dry' | 'custom'
    const [startMonth, setStartMonth] = useState('')
    const [endMonth, setEndMonth] = useState('')
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    const [isCompareMode, setIsCompareMode] = useState(false)
    const [baselineYear, setBaselineYear] = useState('')
    const [activeFilters, setActiveFilters] = useState(['Low', 'Medium', 'High', 'Very High', 'None'])
    const [selectedBarangay, setSelectedBarangay] = useState(null)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const mapRef = useRef(null)

    const toggleFilter = (level) => {
        setActiveFilters(prev =>
            prev.includes(level)
                ? prev.filter(f => f !== level)
                : [...prev, level]
        )
    }

    const { data: map, isLoading: mapLoading, isError: mapError } = useGetMaps()
    const { data: availableYears, isLoading: yearsLoading } = useGetHogSurveyYears()

    const years = useMemo(() => {
        if (availableYears && availableYears.length > 0) {
            return availableYears.map(y => y.toString());
        }
        return [new Date().getFullYear().toString()];
    }, [availableYears]);

    // Update selectedYear and baselineYear when availableYears loads
    useEffect(() => {
        if (years.length > 0) {
            if (!years.includes(selectedYear)) {
                setSelectedYear(years[0]);
            }
            const currentIdx = years.indexOf(selectedYear);
            const fallbackBaseline = years[currentIdx + 1] || years[1] || years[0];
            if (!baselineYear || !years.includes(baselineYear) || baselineYear === selectedYear) {
                setBaselineYear(fallbackBaseline);
            }
        }
    }, [years, selectedYear]);

    // Query parameters
    const querySeason = seasonMode === 'custom' ? '' : seasonMode;
    const queryStartMonth = seasonMode === 'custom' ? startMonth : '';
    const queryEndMonth = seasonMode === 'custom' ? endMonth : '';

    // Primary survey query (Target Year)
    const {
        data: survey,
        isLoading: surveyLoading,
        isError: surveyError,
        isFetching: surveyFetching
    } = useGetHogSurvey(queryStartMonth, queryEndMonth, querySeason, selectedYear)

    // Baseline survey query (Active when Compare Mode is enabled)
    const {
        data: compareSurvey,
        isLoading: compareSurveyLoading,
        isFetching: compareSurveyFetching
    } = useGetHogSurvey(queryStartMonth, queryEndMonth, querySeason, isCompareMode ? baselineYear : null)

    const handleSearch = (barangayName) => {
        if (barangayName) {
            setSelectedBarangay(barangayName)
        }
    }

    const handleSeasonModeChange = (mode) => {
        setSeasonMode(mode);
        if (mode !== 'custom') {
            setStartMonth('');
            setEndMonth('');
        } else {
            if (!startMonth) setStartMonth('1');
            if (!endMonth) setEndMonth('3');
        }
    }

    const clearFilters = () => {
        setSeasonMode('all');
        setStartMonth('');
        setEndMonth('');
        const defaultYear = years[0] || new Date().getFullYear().toString();
        setSelectedYear(defaultYear);
        setSelectedBarangay(null);
        setIsCompareMode(false);
        setActiveFilters(['Low', 'Medium', 'High', 'Very High', 'None']);
    }

    const months = [
        { id: '1', name: 'January', short: 'Jan' },
        { id: '2', name: 'February', short: 'Feb' },
        { id: '3', name: 'March', short: 'Mar' },
        { id: '4', name: 'April', short: 'Apr' },
        { id: '5', name: 'May', short: 'May' },
        { id: '6', name: 'June', short: 'Jun' },
        { id: '7', name: 'July', short: 'Jul' },
        { id: '8', name: 'August', short: 'Aug' },
        { id: '9', name: 'September', short: 'Sep' },
        { id: '10', name: 'October', short: 'Oct' },
        { id: '11', name: 'November', short: 'Nov' },
        { id: '12', name: 'December', short: 'Dec' },
    ];

    // Municipal-wide plain-English comparison calculations
    const comparisonStats = useMemo(() => {
        if (!isCompareMode || !survey || !compareSurvey) return null;

        const targetTotal = survey.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0);
        const baseTotal = compareSurvey.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0);
        const netDiff = targetTotal - baseTotal;
        const netPct = baseTotal > 0 ? Math.abs((netDiff / baseTotal) * 100).toFixed(1) : (netDiff > 0 ? '100' : '0.0');

        let increased = 0;
        let decreased = 0;
        let stable = 0;

        (map || []).forEach(b => {
            const tVal = survey.find(s => s.barangay === b.name)?.total_pigs || 0;
            const bVal = compareSurvey.find(s => s.barangay === b.name)?.total_pigs || 0;
            if (tVal > bVal) increased++;
            else if (tVal < bVal) decreased++;
            else stable++;
        });

        // Dynamic Plain-English Narrative Summary
        let storySummary = "";
        if (netDiff > 0) {
            storySummary = `Sariaya's total pig count grew by +${netPct}% (+${netDiff.toLocaleString()} pigs) from ${baselineYear} to ${selectedYear}. Growth was recorded in ${increased} barangays.`;
        } else if (netDiff < 0) {
            storySummary = `Sariaya's total pig count decreased by -${netPct}% (-${Math.abs(netDiff).toLocaleString()} pigs) from ${baselineYear} to ${selectedYear}, reflecting commercial sales or market transport offloads.`;
        } else {
            storySummary = `Sariaya's total pig population remained stable between ${baselineYear} and ${selectedYear} at ${targetTotal.toLocaleString()} pigs.`;
        }

        return {
            targetTotal,
            baseTotal,
            netDiff,
            netPct,
            increased,
            decreased,
            stable,
            storySummary
        };
    }, [isCompareMode, survey, compareSurvey, map, baselineYear, selectedYear]);

    const totalPigs = survey?.reduce((acc, curr) => acc + Number(curr.total_pigs || 0), 0) || 0;
    const isMapDataUpdating = surveyFetching || (isCompareMode && compareSurveyFetching);
    const hasActiveFilters = seasonMode !== 'all' || selectedBarangay !== null || isCompareMode || activeFilters.length < 5;

    return (
        <div className="flex-1 p-4 md:p-8 space-y-6 bg-stone-50/40 min-h-full font-sans">
            
            {/* 1. Uncrowded Executive Page Header */}
            <div className="bg-white border border-stone-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 rounded-none">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700">
                            <MapIcon size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                                Geospatial Swine Census
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight uppercase leading-none">
                                Pig Population Map
                            </h1>
                        </div>
                    </div>
                    <p className="text-stone-500 text-xs font-medium max-w-2xl">
                        Comprehensive barangay density classification, swine distribution analytics, and multi-year biosecurity trend monitoring.
                    </p>
                </div>

                {/* Right Action Area */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-stone-100">
                    <div className="bg-stone-50 border border-stone-200 px-4 py-2 text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                            Total Municipal Census
                        </p>
                        <p className="text-lg font-black text-stone-900 leading-tight">
                            {totalPigs.toLocaleString()} <span className="text-xs font-normal text-stone-500 font-sans">Pigs</span>
                        </p>
                    </div>

                    <button 
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-stone-800 transition-colors rounded-none cursor-pointer shrink-0"
                    >
                        <Upload size={14} />
                        Upload Survey CSV
                    </button>
                </div>
            </div>

            {/* 2. Dedicated 2-Tier Operations Toolbar */}
            <div className="bg-white border border-stone-200 p-5 space-y-4 rounded-none">
                
                {/* TIER 1: Search, Year Selection & Comparison Capsule */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    
                    {/* Left: Search Input */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <select
                            className="w-full pl-10 pr-8 py-2.5 bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 uppercase tracking-wider focus:outline-none focus:border-emerald-700 focus:bg-white transition-colors rounded-none cursor-pointer"
                            onChange={(e) => handleSearch(e.target.value)}
                            value={selectedBarangay || ''}
                        >
                            <option value="">Search / Focus Barangay...</option>
                            {map?.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                        {selectedBarangay && (
                            <button
                                onClick={() => setSelectedBarangay(null)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                                title="Clear search focus"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Right: Year Picker & Comparison Capsule Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        {!isCompareMode ? (
                            /* Standard Mode Controls */
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-50 border border-stone-200">
                                    <Calendar size={14} className="text-stone-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Year:</span>
                                    <select
                                        className="bg-transparent text-xs font-black text-stone-900 focus:outline-none cursor-pointer"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                    >
                                        {years.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsCompareMode(true)}
                                    className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none cursor-pointer"
                                >
                                    <Scale size={13} className="text-emerald-700" />
                                    <span>Compare Years</span>
                                </button>
                            </div>
                        ) : (
                            /* Active Comparison Capsule */
                            <div className="flex items-center gap-2 bg-stone-900 text-white px-3 py-1.5 border border-stone-900 rounded-none animate-in fade-in duration-150">
                                <Scale size={14} className="text-emerald-400 shrink-0" />
                                
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Base:</span>
                                    <select
                                        className="bg-stone-800 text-white text-xs font-black px-2 py-1 border border-stone-700 rounded-none focus:outline-none focus:border-emerald-400 cursor-pointer"
                                        value={baselineYear}
                                        onChange={(e) => setBaselineYear(e.target.value)}
                                    >
                                        {years.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <span className="text-stone-500 font-bold text-xs px-0.5">vs</span>

                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Target:</span>
                                    <select
                                        className="bg-stone-800 text-white text-xs font-black px-2 py-1 border border-stone-700 rounded-none focus:outline-none focus:border-emerald-400 cursor-pointer"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                    >
                                        {years.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={() => setIsCompareMode(false)}
                                    className="ml-2 pl-2 border-l border-stone-700 text-stone-400 hover:text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                    title="Exit Year Comparison"
                                >
                                    <X size={12} />
                                    Exit
                                </button>
                            </div>
                        )}

                        {/* Reset Filters Action */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none cursor-pointer"
                                title="Reset all search, time, and category filters"
                            >
                                <RotateCcw size={12} />
                                Reset Filters
                            </button>
                        )}
                    </div>
                </div>

                {/* TIER 2: Time Horizon & Seasonal Filter Pills */}
                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
                    
                    {/* Segmented Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 mr-1.5">
                            Timeframe:
                        </span>

                        <button
                            onClick={() => handleSeasonModeChange('all')}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none border cursor-pointer ${
                                seasonMode === 'all'
                                    ? 'bg-stone-900 text-white border-stone-900'
                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                            }`}
                        >
                            Full Year (Jan - Dec)
                        </button>

                        <button
                            onClick={() => handleSeasonModeChange('wet')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none border cursor-pointer ${
                                seasonMode === 'wet'
                                    ? 'bg-blue-900 text-white border-blue-900'
                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                            }`}
                        >
                            <CloudRain size={12} className={seasonMode === 'wet' ? 'text-blue-200' : 'text-blue-500'} />
                            Wet Season (Jun - Nov)
                        </button>

                        <button
                            onClick={() => handleSeasonModeChange('dry')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none border cursor-pointer ${
                                seasonMode === 'dry'
                                    ? 'bg-amber-800 text-white border-amber-800'
                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                            }`}
                        >
                            <Sun size={12} className={seasonMode === 'dry' ? 'text-amber-200' : 'text-amber-500'} />
                            Dry Season (Dec - May)
                        </button>

                        <button
                            onClick={() => handleSeasonModeChange('custom')}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors rounded-none border cursor-pointer ${
                                seasonMode === 'custom'
                                    ? 'bg-emerald-900 text-white border-emerald-900'
                                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                            }`}
                        >
                            Custom Range
                        </button>
                    </div>

                    {/* Expandable Custom Month Selectors (Visible only when 'custom' is active) */}
                    {seasonMode === 'custom' && (
                        <div className="flex items-center gap-2 bg-emerald-50/50 p-1.5 border border-emerald-200 animate-in fade-in duration-100">
                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest pl-1">
                                Months:
                            </span>

                            <select
                                className="bg-white border border-emerald-300 px-2 py-1 text-xs font-bold text-stone-800 focus:outline-none rounded-none cursor-pointer"
                                value={startMonth}
                                onChange={(e) => setStartMonth(e.target.value)}
                            >
                                {months.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>

                            <span className="text-emerald-700 font-bold text-xs">→</span>

                            <select
                                className="bg-white border border-emerald-300 px-2 py-1 text-xs font-bold text-stone-800 focus:outline-none rounded-none cursor-pointer"
                                value={endMonth}
                                onChange={(e) => setEndMonth(e.target.value)}
                            >
                                {months.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Main Workspace Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                
                {/* Left Side Info Panel */}
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
                            /* Standard Single-Year Total */
                            <div className={`p-4 bg-stone-50 border border-stone-200 transition-all duration-300 ${isMapDataUpdating ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
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
                        ) : (
                            /* Plain-English Compare Mode Municipal Summary */
                            <div className={`space-y-4 ${isMapDataUpdating ? 'opacity-50 animate-pulse' : 'opacity-100'}`}>
                                
                                {/* 1. Plain-English Executive Story Card */}
                                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-emerald-800">
                                        <Sparkles size={13} className="shrink-0" />
                                        <span className="text-[9px] font-black uppercase tracking-wider">
                                            Executive Takeaway
                                        </span>
                                    </div>
                                    <p className="text-xs text-stone-800 leading-relaxed font-medium">
                                        {comparisonStats?.storySummary}
                                    </p>
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

                {/* Right Map Canvas Container */}
                <div className="xl:col-span-3 bg-white border border-stone-200 relative h-[700px] xl:h-[800px] overflow-hidden rounded-none shadow-sm">
                    
                    {/* Synchronizing Data Loading Overlay */}
                    {isMapDataUpdating && (
                        <div className="absolute inset-0 z-[1000] bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="bg-white p-6 border border-stone-200 flex items-center gap-4 shadow-xl">
                                <span className="loading loading-spinner loading-md text-emerald-700"></span>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-black uppercase tracking-widest text-stone-900">
                                        {isCompareMode ? 'Syncing Comparison Data' : 'Updating Map View'}
                                    </p>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                                        {isCompareMode ? `Comparing ${baselineYear} vs ${selectedYear}...` : 'Loading survey boundaries...'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Interactive Map */}
                    <MainMap
                        ref={mapRef}
                        mapData={map}
                        surveyData={survey}
                        activeFilters={activeFilters}
                        selectedBarangay={selectedBarangay}
                        setSelectedBarangay={setSelectedBarangay}
                        isCompareMode={isCompareMode}
                        compareSurveyData={compareSurvey || []}
                        compareYears={{ baseline: baselineYear, target: selectedYear }}
                    />
                </div>
            </div>
            
            {/* Survey CSV Upload Modal */}
            <HogSurveyUploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
            />
        </div>
    )
}

export default AgriMapPage
