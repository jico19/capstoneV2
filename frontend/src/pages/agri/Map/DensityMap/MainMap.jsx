import { forwardRef, useState } from "react";
import { Map, MapControls } from '../../../../components/ui/map';
import MapDataHandler from "./MapDataHandler";
import { RotateCcw, Flame, Layers, Truck, Scale, ChevronDown, ChevronUp } from "lucide-react";

const SARIAYA_CENTER = [121.5239, 13.9630];
const SARIAYA_DEFAULT_ZOOM = 12;

const DENSITY_TIERS = [
    { id: 'Very High', label: 'Very High', range: '1.5k+', color: '#dc2626' },
    { id: 'High', label: 'High', range: '500-1.5k', color: '#f97316' },
    { id: 'Medium', label: 'Medium', range: '100-499', color: '#eab308' },
    { id: 'Low', label: 'Low', range: '<100', color: '#22c55e' },
    { id: 'None', label: 'Zero', range: '0', color: '#94a3b8' }
];

const MainMap = forwardRef(({ 
    center = SARIAYA_CENTER, 
    zoom = SARIAYA_DEFAULT_ZOOM, 
    mapData, 
    surveyData, 
    activeFilters = ['Low', 'Medium', 'High', 'Very High', 'None'], 
    toggleFilter,
    selectedBarangay, 
    setSelectedBarangay,
    isCompareMode = false,
    compareSurveyData = [],
    compareYears = { baseline: '', target: '' },
    activeMapLayer = 'density',
    setActiveMapLayer,
    transportVolumeData = [],
    topHotspots = []
}, ref) => {
    const [isLegendOpen, setIsLegendOpen] = useState(true);

    const handleResetCamera = () => {
        if (ref?.current) {
            ref.current.easeTo({
                center: SARIAYA_CENTER,
                zoom: SARIAYA_DEFAULT_ZOOM,
                duration: 900
            });
        }
        if (setSelectedBarangay) {
            setSelectedBarangay(null);
        }
    };

    return (
        <div className="h-full w-full relative overflow-hidden font-sans">
            <Map
                ref={ref}
                center={center}
                zoom={zoom}
                style="https://tiles.openfreemap.org/styles/bright"
            >   
                <MapControls position="top-right" />

                <MapDataHandler 
                    mapData={mapData} 
                    surveyData={surveyData} 
                    activeFilters={activeFilters}
                    selectedBarangay={selectedBarangay}
                    setSelectedBarangay={setSelectedBarangay}
                    isCompareMode={isCompareMode}
                    compareSurveyData={compareSurveyData}
                    compareYears={compareYears}
                    activeMapLayer={activeMapLayer}
                    transportVolumeData={transportVolumeData}
                />
            </Map>

            {/* TOP-LEFT: Floating Top Hotspots Quick-Jump Chips */}
            {topHotspots && topHotspots.length > 0 && (
                <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 flex-wrap max-w-lg pointer-events-auto">
                    <div className="flex items-center gap-1 bg-stone-800 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-stone-800 shadow-xs">
                        <Flame size={12} className="text-amber-400" />
                        <span>Hotspots</span>
                    </div>

                    {topHotspots.map((spot) => {
                        const isSelected = selectedBarangay?.toLowerCase() === spot.name.toLowerCase();
                        return (
                            <button
                                key={spot.name}
                                type="button"
                                onClick={() => setSelectedBarangay(isSelected ? null : spot.name)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer border ${
                                    isSelected 
                                        ? 'bg-green-700 text-white border-green-700 shadow-xs' 
                                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:text-stone-800'
                                }`}
                                title={`Focus on ${spot.name}`}
                            >
                                <span className={`text-[10px] font-black ${isSelected ? 'text-white' : 'text-stone-400'}`}>
                                    #{spot.rank}
                                </span>
                                <span>{spot.name}</span>
                                <span className={`font-mono text-[11px] font-bold ${isSelected ? 'text-green-100' : 'text-stone-500'}`}>
                                    {spot.totalPigs.toLocaleString()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* TOP-RIGHT (Under MapControls): Floating Layer Switcher */}
            {setActiveMapLayer && (
                <div className="absolute top-16 right-3 z-[1000] flex flex-col items-end gap-1 pointer-events-auto">
                    <div className="flex items-center bg-white p-1 rounded-xl border border-stone-200 gap-1 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setActiveMapLayer('density')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeMapLayer === 'density'
                                    ? 'bg-green-700 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-800'
                            }`}
                            title="Swine Census Density Map"
                        >
                            <Layers size={12} />
                            <span>Census</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveMapLayer('transport')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeMapLayer === 'transport'
                                    ? 'bg-sky-600 text-white shadow-xs'
                                    : 'text-stone-600 hover:text-stone-800'
                            }`}
                            title="Live Livestock Outflow Movements"
                        >
                            <Truck size={12} />
                            <span>Outflows</span>
                        </button>

                        {isCompareMode && (
                            <button
                                type="button"
                                onClick={() => setActiveMapLayer('growth')}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    activeMapLayer === 'growth'
                                        ? 'bg-stone-800 text-white shadow-xs'
                                        : 'text-stone-600 hover:text-stone-800'
                                }`}
                                title="Growth / Decline Delta Choropleth"
                            >
                                <Scale size={12} />
                                <span>Delta</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* BOTTOM-LEFT: Reset Bounds Button */}
            <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2 pointer-events-auto">
                <button
                    type="button"
                    onClick={handleResetCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-stone-900 text-xs font-bold rounded-lg border border-stone-200 shadow-xs transition-colors cursor-pointer"
                    title="Reset bounds to Sariaya municipality"
                >
                    <RotateCcw size={12} className="text-stone-500" />
                    <span>Reset Bounds</span>
                </button>
            </div>

            {/* BOTTOM-RIGHT: Sleek Floating Interactive Density Legend Dock */}
            {activeMapLayer === 'density' && toggleFilter && (
                <div className="absolute bottom-3 right-3 z-[1000] pointer-events-auto">
                    <div className="bg-white rounded-xl border border-stone-200 p-2.5 space-y-1.5 font-sans min-w-[200px] shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                Density Filter
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsLegendOpen(prev => !prev)}
                                className="text-stone-400 hover:text-stone-700 cursor-pointer"
                            >
                                {isLegendOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                            </button>
                        </div>

                        {isLegendOpen && (
                            <div className="space-y-1 pt-0.5">
                                {DENSITY_TIERS.map(tier => {
                                    const isActive = activeFilters.includes(tier.id);
                                    return (
                                        <button
                                            key={tier.id}
                                            type="button"
                                            onClick={() => toggleFilter(tier.id)}
                                            className={`flex items-center justify-between w-full px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                                                isActive 
                                                    ? 'bg-stone-100 font-bold text-stone-800' 
                                                    : 'opacity-40 text-stone-400'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span 
                                                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                                                    style={{ backgroundColor: tier.color }}
                                                />
                                                <span>{tier.label}</span>
                                            </div>
                                            <span className="font-mono text-[10px] text-stone-400">
                                                {tier.range}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

MainMap.displayName = 'MainMap';

export default MainMap;