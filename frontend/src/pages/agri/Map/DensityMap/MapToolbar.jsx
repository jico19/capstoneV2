import { Search, X, Calendar, Scale, RotateCcw, CloudRain, Sun } from "lucide-react";

/**
 * 2-Tier Operations Toolbar for the Pig Population Map:
 * search, year picker, comparison capsule, seasonal/custom time filters.
 */
const MapToolbar = ({ map, filters }) => {
    const {
        selectedBarangay,
        setSelectedBarangay,
        selectedYear,
        setSelectedYear,
        isCompareMode,
        setIsCompareMode,
        baselineYear,
        setBaselineYear,
        years,
        months,
        seasonMode,
        startMonth,
        setStartMonth,
        endMonth,
        setEndMonth,
        handleSeasonModeChange,
        clearFilters,
        hasActiveFilters
    } = filters;

    return (
        <div className="bg-white border border-stone-200 p-5 space-y-4 rounded-none">
            
            {/* TIER 1: Search, Year Selection & Comparison Capsule */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                
                {/* Left: Search Input */}
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <select
                        className="w-full pl-10 pr-8 py-2.5 bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 uppercase tracking-wider focus:outline-none focus:border-emerald-700 focus:bg-white transition-colors rounded-none cursor-pointer"
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value) setSelectedBarangay(value);
                        }}
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
    );
};

export default MapToolbar;