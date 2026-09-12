import { useState, useRef } from "react"
import MainMap from "./MainMap"
import { useGetHogSurvey, useGetMaps, useGetHogSurveyYears } from '../../../../hooks/useMaps'
import { Map as MapIcon, Upload } from "lucide-react"
import HogSurveyUploadModal from '../../../../components/HogSurveyUploadModal'
import useMapFilters from './useMapFilters'
import useMapInsights from './useMapInsights'
import MapToolbar from './MapToolbar'
import CensusStatusPanel from './CensusStatusPanel'

/**
 * Agriculture Pig Population Map & Operations Hub
 * Redesigned for maximum visual clarity, generous breathing room, and intuitive multi-year analytics.
 */
const AgriMapPage = () => {
    const mapRef = useRef(null)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

    const { data: map } = useGetMaps()
    const { data: availableYears } = useGetHogSurveyYears()

    const filters = useMapFilters(availableYears)

    // Query parameters
    const querySeason = filters.seasonMode === 'custom' ? '' : filters.seasonMode;
    const queryStartMonth = filters.seasonMode === 'custom' ? filters.startMonth : '';
    const queryEndMonth = filters.seasonMode === 'custom' ? filters.endMonth : '';

    // Primary survey query (Target Year)
    const {
        data: survey,
        isFetching: surveyFetching
    } = useGetHogSurvey(queryStartMonth, queryEndMonth, querySeason, filters.selectedYear)

    // Baseline survey query (Active when Compare Mode is enabled)
    const {
        data: compareSurvey,
        isFetching: compareSurveyFetching
    } = useGetHogSurvey(queryStartMonth, queryEndMonth, querySeason, filters.isCompareMode ? filters.baselineYear : null)

    const { comparisonStats, operationalTakeaway, totalPigs, isMapDataUpdating } = useMapInsights({
        map,
        survey,
        compareSurvey,
        surveyFetching,
        compareSurveyFetching,
        filters
    })

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
            <MapToolbar map={map} filters={filters} />

            {/* 3. Main Workspace Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                
                {/* Left Side Info Panel */}
                <CensusStatusPanel
                    filters={filters}
                    toggleFilter={filters.toggleFilter}
                    totalPigs={totalPigs}
                    isMapDataUpdating={isMapDataUpdating}
                    operationalTakeaway={operationalTakeaway}
                    comparisonStats={comparisonStats}
                />

                {/* Right Map Canvas Container */}
                <div className="xl:col-span-3 bg-white border border-stone-200 relative h-[700px] xl:h-[800px] overflow-hidden rounded-none shadow-sm">
                    
                    {/* Synchronizing Data Loading Overlay */}
                    {isMapDataUpdating && (
                        <div className="absolute inset-0 z-[1000] bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="bg-white p-6 border border-stone-200 flex items-center gap-4 shadow-xl">
                                <span className="loading loading-spinner loading-md text-emerald-700"></span>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-black uppercase tracking-widest text-stone-900">
                                        {filters.isCompareMode ? 'Syncing Comparison Data' : 'Updating Map View'}
                                    </p>
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                                        {filters.isCompareMode ? `Comparing ${filters.baselineYear} vs ${filters.selectedYear}...` : 'Loading survey boundaries...'}
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
                        activeFilters={filters.activeFilters}
                        selectedBarangay={filters.selectedBarangay}
                        setSelectedBarangay={filters.setSelectedBarangay}
                        isCompareMode={filters.isCompareMode}
                        compareSurveyData={compareSurvey || []}
                        compareYears={{ baseline: filters.baselineYear, target: filters.selectedYear }}
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