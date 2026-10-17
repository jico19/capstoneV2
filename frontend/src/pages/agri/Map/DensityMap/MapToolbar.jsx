import { Search, X, Calendar, Scale, RotateCcw, CloudRain, Sun, Upload, Map as MapIcon } from "lucide-react";

/**
 * Unified Slim Operations Header:
 * Combines page branding, barangay search, time horizon pills,
 * comparison capsule, total census badge, and upload action into a single clean bar.
 */
const MapToolbar = ({ map, filters, totalPigs, onOpenUpload }) => {
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
        <div className="bg-white rounded-xl border border-stone-200 p-3.5 md:p-4 shadow-xs font-sans space-y-3">
            
            {/* MAIN ROW: Page Branding + Search + Time Horizon + Year Picker + Stats & Upload */}
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
                
                {/* 1. Title & Search */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 shadow-2xs">
                            <MapIcon size={18} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-700 block leading-none">
                                Swine Census
                            </span>
                            <h1 className="text-lg font-black uppercase tracking-tight text-stone-800 leading-tight whitespace-nowrap">
                                Pig Population Map
                            </h1>
                        </div>
                    </div>

                    {/* Integrated Search Input */}
                    <div className="relative w-full sm:w-56">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <select
                            className="w-full pl-8 pr-7 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-xs font-semibold text-stone-800 rounded-lg focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/20 shadow-2xs transition-all cursor-pointer"
                            onChange={(e) => setSelectedBarangay(e.target.value || null)}
                            value={selectedBarangay || ''}
                        >
                            <option value="">Find barangay...</option>
                            {map?.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                        {selectedBarangay && (
                            <button
                                type="button"
                                onClick={() => setSelectedBarangay(null)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                                title="Clear focus"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 2. Time Horizon Segmented Control */}
                <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 self-start xl:self-center flex-wrap gap-0.5">
                    <button
                        type="button"
                        onClick={() => handleSeasonModeChange('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            seasonMode === 'all'
                                ? 'bg-white text-stone-800 shadow-xs border border-stone-200/80'
                                : 'text-stone-600 hover:text-stone-800'
                        }`}
                    >
                        Full Year
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSeasonModeChange('wet')}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            seasonMode === 'wet'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-800'
                        }`}
                    >
                        <CloudRain size={12} className={seasonMode === 'wet' ? 'text-sky-100' : 'text-sky-600'} />
                        Wet Season
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSeasonModeChange('dry')}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            seasonMode === 'dry'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-800'
                        }`}
                    >
                        <Sun size={12} className={seasonMode === 'dry' ? 'text-amber-100' : 'text-amber-600'} />
                        Dry Season
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSeasonModeChange('custom')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            seasonMode === 'custom'
                                ? 'bg-green-700 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-800'
                        }`}
                    >
                        Custom
                    </button>

                    {seasonMode === 'custom' && (
                        <div className="flex items-center gap-1 px-1">
                            <select
                                className="bg-white border border-stone-200 px-1.5 py-1 text-xs font-bold text-stone-800 rounded-md focus:outline-none cursor-pointer shadow-2xs"
                                value={startMonth}
                                onChange={(e) => setStartMonth(e.target.value)}
                            >
                                {months.map(m => (
                                    <option key={m.id} value={m.id}>{m.short}</option>
                                ))}
                            </select>
                            <span className="text-stone-400 text-xs font-bold">➔</span>
                            <select
                                className="bg-white border border-stone-200 px-1.5 py-1 text-xs font-bold text-stone-800 rounded-md focus:outline-none cursor-pointer shadow-2xs"
                                value={endMonth}
                                onChange={(e) => setEndMonth(e.target.value)}
                            >
                                {months.map(m => (
                                    <option key={m.id} value={m.id}>{m.short}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* 3. Year Selection & Comparison Capsule + Municipal Count + Upload Button */}
                <div className="flex items-center gap-2.5 flex-wrap justify-end">
                    
                    {/* Year / Compare Mode */}
                    {!isCompareMode ? (
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs shadow-2xs">
                                <Calendar size={13} className="text-stone-400" />
                                <select
                                    className="bg-transparent font-bold text-stone-800 focus:outline-none cursor-pointer"
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
                                className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                                <Scale size={12} className="text-green-700" />
                                <span>Compare</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 bg-stone-800 text-white px-2.5 py-1.5 rounded-lg border border-stone-800 text-xs shadow-xs">
                            <Scale size={12} className="text-green-400 shrink-0" />
                            <select
                                className="bg-stone-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-md border border-stone-600 cursor-pointer"
                                value={baselineYear}
                                onChange={(e) => setBaselineYear(e.target.value)}
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <span className="text-stone-400 text-xs">vs</span>
                            <select
                                className="bg-stone-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-md border border-stone-600 cursor-pointer"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setIsCompareMode(false)}
                                className="ml-1 text-stone-400 hover:text-white cursor-pointer"
                                title="Exit Compare Mode"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Total Swine Pill (Single source of truth) */}
                    <div className="bg-stone-50 border border-stone-200 px-3 py-1 rounded-lg text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block leading-none">
                            Census
                        </span>
                        <span className="text-xs font-black text-stone-800 font-mono">
                            {totalPigs.toLocaleString()} <span className="text-[10px] font-normal text-stone-500 font-sans">pigs</span>
                        </span>
                    </div>

                    {/* Upload Survey Button */}
                    <button 
                        type="button"
                        onClick={onOpenUpload}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-xs active:scale-[0.98] transition-all cursor-pointer shrink-0"
                    >
                        <Upload size={13} />
                        <span>Upload Survey</span>
                    </button>

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-stone-200 transition-colors cursor-pointer"
                            title="Reset all filters"
                        >
                            <RotateCcw size={13} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MapToolbar;