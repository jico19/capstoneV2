import { useState, useRef } from "react";
import MainMap from "./MainMap";
import { useGetHogSurvey, useGetMaps, useGetHogSurveyYears, useGetTransportVolume } from '../../../../hooks/useMaps';
import { Loader2 } from "lucide-react";
import HogSurveyUploadModal from '../../../../components/HogSurveyUploadModal';
import useMapFilters from './useMapFilters';
import useMapInsights from './useMapInsights';
import MapToolbar from './MapToolbar';
import CensusStatusPanel from './CensusStatusPanel';

/**
 * Agriculture Pig Population Map & Operations Hub
 * Re-architected for maximum visual breathing room, spacious layout,
 * and context-aware intelligence.
 */
const AgriMapPage = () => {
    const mapRef = useRef(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const { data: map } = useGetMaps();
    const { data: availableYears } = useGetHogSurveyYears();
    const { data: transportVolume = [] } = useGetTransportVolume();

    const filters = useMapFilters(availableYears);

    // Query parameters
    const querySeason = filters.seasonMode === 'custom' ? '' : filters.seasonMode;
    const queryStartMonth = filters.seasonMode === 'custom' ? filters.startMonth : '';
    const queryEndMonth = filters.seasonMode === 'custom' ? filters.endMonth : '';

    // Primary survey query (Target Year)
    const {
        data: survey,
        isFetching: surveyFetching
    } = useGetHogSurvey(queryStartMonth, queryEndMonth, querySeason, filters.selectedYear);

    // Baseline survey query (Active when Compare Mode is enabled)
    const {
        data: compareSurvey,
        isFetching: compareSurveyFetching
    } = useGetHogSurvey(queryStartMonth, queryEndMonth, querySeason, filters.isCompareMode ? filters.baselineYear : null);

    const { 
        comparisonStats, 
        operationalTakeaway, 
        secondaryTakeaway,
        topHotspots,
        totalPigs, 
        isMapDataUpdating 
    } = useMapInsights({
        map,
        survey,
        compareSurvey,
        surveyFetching,
        compareSurveyFetching,
        filters
    });

    return (
        <div className="flex-1 p-3 md:p-5 lg:p-6 space-y-4 bg-stone-100 min-h-full font-sans">
            
            {/* 1. Slim Integrated Operations Header */}
            <MapToolbar 
                map={map} 
                filters={filters} 
                totalPigs={totalPigs}
                onOpenUpload={() => setIsUploadModalOpen(true)}
            />

            {/* 2. Spacious 2-Column Command Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                
                {/* Left Side: Context-Aware Intelligence & Inspector (4 of 12 cols = 33%) */}
                <div className="lg:col-span-4 xl:col-span-4">
                    <CensusStatusPanel
                        filters={filters}
                        toggleFilter={filters.toggleFilter}
                        totalPigs={totalPigs}
                        isMapDataUpdating={isMapDataUpdating}
                        operationalTakeaway={operationalTakeaway}
                        secondaryTakeaway={secondaryTakeaway}
                        comparisonStats={comparisonStats}
                        survey={survey || []}
                        transportVolume={transportVolume || []}
                    />
                </div>

                {/* Right Side: Hero Map Canvas (8 of 12 cols = 67%) */}
                <div className="lg:col-span-8 xl:col-span-8 bg-white rounded-xl border border-stone-200 relative h-[650px] lg:h-[740px] overflow-hidden shadow-xs">
                    
                    {/* Non-Intrusive Syncing Indicator */}
                    {isMapDataUpdating && (
                        <div className="absolute top-3 right-14 z-[1000] bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-xs flex items-center gap-2">
                            <Loader2 size={13} className="animate-spin text-green-700" />
                            <span className="text-xs font-bold text-stone-800">
                                {filters.isCompareMode ? `Comparing ${filters.baselineYear} vs ${filters.selectedYear}...` : 'Updating Survey Data...'}
                            </span>
                        </div>
                    )}

                    {/* Interactive Map */}
                    <MainMap
                        ref={mapRef}
                        mapData={map}
                        surveyData={survey}
                        activeFilters={filters.activeFilters}
                        toggleFilter={filters.toggleFilter}
                        selectedBarangay={filters.selectedBarangay}
                        setSelectedBarangay={filters.setSelectedBarangay}
                        isCompareMode={filters.isCompareMode}
                        compareSurveyData={compareSurvey || []}
                        compareYears={{ baseline: filters.baselineYear, target: filters.selectedYear }}
                        activeMapLayer={filters.activeMapLayer}
                        setActiveMapLayer={filters.setActiveMapLayer}
                        transportVolumeData={transportVolume}
                        topHotspots={topHotspots}
                    />
                </div>
            </div>
            
            {/* Survey CSV Upload Modal */}
            <HogSurveyUploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
            />
        </div>
    );
};

export default AgriMapPage;