import { useEffect, useState } from "react"
import { useMap, MapPopup } from "/src/components/ui/map"
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react"

const MapDataHandler = ({ 
    mapData, 
    surveyData, 
    activeFilters = ['Low', 'Medium', 'High', 'Very High', 'None'], 
    selectedBarangay, 
    setSelectedBarangay,
    isCompareMode = false,
    compareSurveyData = [],
    compareYears = { baseline: '', target: '' }
}) => {
    const { map, isLoaded } = useMap();
    const [hoveredId, setHoveredId] = useState(null);
    const [hoveredFeature, setHoveredFeature] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedField, setSelectedField] = useState(null);

    // --- 1. SEARCH TRIGGER LOGIC ---
    useEffect(() => {
        if (!selectedBarangay || !isLoaded || !mapData || !map) return;

        const item = mapData.find(b => b.name === selectedBarangay);
        const surveyRecord = surveyData?.find(s => s.barangay === selectedBarangay) || {};
        const compareRecord = compareSurveyData?.find(s => s.barangay === selectedBarangay) || {};
        
        if (item) {
            const breakdown = surveyRecord.breakdown || {};
            const compareBreakdown = compareRecord.breakdown || {};
            const lng = Number(item.longitude);
            const lat = Number(item.latitude);
            
            map.easeTo({
                center: [lng, lat],
                zoom: 14,
                duration: 800
            });

            // Set selected feature state
            if (selectedId !== null) {
                map.setFeatureState({ source: 'agri-fields', id: selectedId }, { selected: false });
            }
            setSelectedId(item.id);
            map.setFeatureState({ source: 'agri-fields', id: item.id }, { selected: true });

            setSelectedField({
                id: item.id,
                name: item.name,
                density: surveyRecord.density_level || 'None',
                totalPigs: surveyRecord.total_pigs || 0,
                breakdown: breakdown,
                trend: surveyRecord.trend || 'stable',
                isPrediction: surveyRecord.is_prediction || false,
                compareDensity: compareRecord.density_level || 'None',
                compareTotalPigs: compareRecord.total_pigs || 0,
                compareBreakdown: compareBreakdown,
                lng: lng,
                lat: lat
            });

            setSelectedBarangay(null);
        }
    }, [selectedBarangay, isLoaded, mapData, map, setSelectedBarangay, compareSurveyData, selectedId]);

    // --- 1.1 DATA UPDATE LOGIC ---
    useEffect(() => {
        if (!selectedField || !surveyData) return;

        const updatedRecord = surveyData.find(s => s.barangay === selectedField.name);
        const compareRecord = compareSurveyData?.find(s => s.barangay === selectedField.name);

        if (updatedRecord || compareRecord) {
            setSelectedField(prev => ({
                ...prev,
                density: updatedRecord?.density_level || prev?.density || 'None',
                totalPigs: updatedRecord?.total_pigs ?? prev?.totalPigs ?? 0,
                breakdown: updatedRecord?.breakdown || prev?.breakdown || {},
                trend: updatedRecord?.trend || prev?.trend || 'stable',
                isPrediction: updatedRecord?.is_prediction ?? prev?.isPrediction ?? false,
                compareDensity: compareRecord?.density_level || prev?.compareDensity || 'None',
                compareTotalPigs: compareRecord?.total_pigs ?? prev?.compareTotalPigs ?? 0,
                compareBreakdown: compareRecord?.breakdown || prev?.compareBreakdown || {},
            }));
        }
    }, [surveyData, compareSurveyData]);

    // --- 2. SETUP SOURCE AND LAYERS ---
    useEffect(() => {
        if (!map || !isLoaded || !mapData) return;

        const sourceId = 'agri-fields';

        const geojson = {
            type: 'FeatureCollection',
            features: mapData.map((item) => {
                const surveyRecord = surveyData?.find(s => s.barangay === item.name) || {};
                const density = surveyRecord.density_level || 'None';
                const totalPigs = surveyRecord.total_pigs || 0;
                const breakdown = surveyRecord.breakdown || {};
                const trend = surveyRecord.trend || 'stable';
                const isPrediction = surveyRecord.is_prediction || false;

                const compareRecord = compareSurveyData?.find(s => s.barangay === item.name) || {};
                const compareDensity = compareRecord.density_level || 'None';
                const compareTotalPigs = compareRecord.total_pigs || 0;
                const compareBreakdown = compareRecord.breakdown || {};

                return {
                    type: 'Feature',
                    id: item.id,
                    properties: {
                        name: item.name,
                        density: density,
                        totalPigs: totalPigs,
                        breakdown: JSON.stringify(breakdown),
                        trend: trend,
                        isPrediction: isPrediction,
                        compareDensity: compareDensity,
                        compareTotalPigs: compareTotalPigs,
                        compareBreakdown: JSON.stringify(compareBreakdown),
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: item.geojson
                    }
                }
            })
        };

        const existingSource = map.getSource(sourceId);
        if (!existingSource) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojson,
                generateId: true
            });

            map.addLayer({
                id: 'fields-fill',
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        0.85,
                        ['boolean', ['feature-state', 'hover'], false],
                        0.7, 
                        0.4  
                    ],
                    'fill-color': [
                        'match',
                        ['get', 'density'],
                        'Low', '#22c55e',       // Green
                        'Medium', '#eab308',    // Yellow
                        'High', '#ef4444',      // Red
                        'Very High', '#ef4444', // Red
                        '#808080'               // Fallback / None
                    ]
                }
            });

            map.addLayer({
                id: 'fields-outline',
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        '#065f46',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#111827',
                        '#9ca3af'  
                    ],
                    'line-width': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        2.5,
                        ['boolean', ['feature-state', 'hover'], false],
                        2,
                        0.5
                    ]
                }
            });
        } else {
            existingSource.setData(geojson);
        }
    }, [map, isLoaded, mapData, surveyData, compareSurveyData]);

    // Update visibility based on filters
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer('fields-fill')) return;

        map.setFilter('fields-fill', [
            'in',
            ['get', 'density'],
            ['literal', activeFilters]
        ]);
        
        map.setFilter('fields-outline', [
            'in',
            ['get', 'density'],
            ['literal', activeFilters]
        ]);
    }, [map, isLoaded, activeFilters]);

    // --- 2. HANDLERS ---
    useEffect(() => {
        if (!map || !isLoaded) return;

        const sourceId = 'agri-fields';

        const onMouseMove = (e) => {
            if (e.features && e.features.length > 0) {
                map.getCanvas().style.cursor = 'pointer';
                const feature = e.features[0];
                const newHoveredId = feature.id;

                if (hoveredId !== null && hoveredId !== newHoveredId) {
                    map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
                }

                setHoveredId(newHoveredId);
                map.setFeatureState({ source: sourceId, id: newHoveredId }, { hover: true });

                setHoveredFeature({
                    id: newHoveredId,
                    name: feature.properties.name,
                    totalPigs: feature.properties.totalPigs,
                    density: feature.properties.density,
                    x: e.point.x,
                    y: e.point.y
                });
            }
        };

        const onMouseLeave = () => {
            map.getCanvas().style.cursor = '';
            if (hoveredId !== null) {
                map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
            }
            setHoveredId(null);
            setHoveredFeature(null);
        };

        const onClick = (e) => {
            const feature = e.features[0];
            if (feature) {
                const sourceId = 'agri-fields';
                if (selectedId !== null) {
                    map.setFeatureState({ source: sourceId, id: selectedId }, { selected: false });
                }

                const newId = feature.id;
                setSelectedId(newId);
                map.setFeatureState({ source: sourceId, id: newId }, { selected: true });

                setSelectedField(null);
                const breakdown = JSON.parse(feature.properties.breakdown || '{}');
                const compareBreakdown = JSON.parse(feature.properties.compareBreakdown || '{}');
                
                setTimeout(() => {
                    setSelectedField({
                        id: newId,
                        name: feature.properties.name,
                        density: feature.properties.density,
                        totalPigs: feature.properties.totalPigs,
                        breakdown: breakdown,
                        trend: feature.properties.trend,
                        isPrediction: feature.properties.isPrediction,
                        compareDensity: feature.properties.compareDensity,
                        compareTotalPigs: feature.properties.compareTotalPigs,
                        compareBreakdown: compareBreakdown,
                        lng: e.lngLat.lng,
                        lat: e.lngLat.lat
                    });
                }, 0);
            }
        };

        map.on('mousemove', 'fields-fill', onMouseMove);
        map.on('mouseleave', 'fields-fill', onMouseLeave);
        map.on('click', 'fields-fill', onClick);

        return () => {
            map.off('mousemove', 'fields-fill', onMouseMove);
            map.off('mouseleave', 'fields-fill', onMouseLeave);
            map.off('click', 'fields-fill', onClick);
        };
    }, [map, isLoaded, hoveredId, selectedId]);

    const getDensityColor = (density) => {
        const colors = {
            'Low': 'text-green-600',
            'Medium': 'text-yellow-600',
            'High': 'text-red-600',
            'Very High': 'text-red-700'
        };
        return colors[density] || 'text-gray-400';
    };

    // Calculate delta calculations for compare mode
    const renderComparisonPopup = () => {
        const targetPigs = Number(selectedField.totalPigs || 0);
        const basePigs = Number(selectedField.compareTotalPigs || 0);
        const diff = targetPigs - basePigs;
        const pct = basePigs > 0 
            ? ((diff / basePigs) * 100).toFixed(1) 
            : (diff > 0 ? '+100' : '0.0');

        const allKeys = Array.from(new Set([
            ...Object.keys(selectedField.compareBreakdown || {}),
            ...Object.keys(selectedField.breakdown || {})
        ]));

        return (
            <div className="w-60 bg-white border border-stone-200 rounded-none shadow-2xl overflow-hidden font-sans p-3 space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between gap-1.5 border-b border-stone-100 pb-1.5">
                    <h3 className="text-xs font-black text-stone-900 tracking-tight uppercase truncate">
                        {selectedField.name}
                    </h3>
                    {/* YoY Badge */}
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 border text-[8px] font-black uppercase tracking-wider rounded-none shrink-0 ${
                        diff > 0 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : diff < 0 
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-stone-100 text-stone-700 border-stone-200'
                    }`}>
                        {diff > 0 && <TrendingUp size={9} />}
                        {diff < 0 && <TrendingDown size={9} />}
                        {diff === 0 && <Minus size={9} />}
                        {diff > 0 ? `+${pct}%` : `${pct}%`}
                    </span>
                </div>

                {/* Headcount Shift Row */}
                <div className="flex items-center justify-between bg-stone-50 p-1.5 border border-stone-100 text-xs font-mono">
                    <div>
                        <span className="text-[7px] font-bold text-stone-400 uppercase font-sans block leading-none mb-0.5">
                            {compareYears.baseline || 'Base'}
                        </span>
                        <span className="font-bold text-stone-700">{basePigs.toLocaleString()}</span>
                    </div>
                    <ArrowRight size={11} className="text-stone-300 mx-0.5" />
                    <div>
                        <span className="text-[7px] font-bold text-emerald-700 uppercase font-sans block leading-none mb-0.5">
                            {compareYears.target || 'Target'}
                        </span>
                        <span className="font-black text-stone-900">{targetPigs.toLocaleString()}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${diff > 0 ? 'text-emerald-700' : diff < 0 ? 'text-rose-700' : 'text-stone-400'}`}>
                        ({diff > 0 ? `+${diff}` : diff})
                    </span>
                </div>

                {/* Compact 2-Column Grid for Stage Deltas */}
                {allKeys.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 pt-1 text-[9px] border-t border-stone-100 max-h-36 overflow-y-auto">
                        {allKeys.map(key => {
                            const bVal = Number(selectedField.compareBreakdown?.[key] || 0);
                            const tVal = Number(selectedField.breakdown?.[key] || 0);
                            const stageDiff = tVal - bVal;

                            return (
                                <div key={key} className="flex justify-between items-center bg-stone-50/70 px-1.5 py-0.5 border border-stone-200/50">
                                    <span className="text-stone-500 truncate capitalize font-medium mr-1 text-[8px]">
                                        {key.replace('_', ' ')}
                                    </span>
                                    <span className={`font-bold font-mono text-[9px] ${
                                        stageDiff > 0 ? 'text-emerald-700' : stageDiff < 0 ? 'text-rose-700' : 'text-stone-400'
                                    }`}>
                                        {stageDiff > 0 ? `+${stageDiff}` : stageDiff}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const handleClosePopup = () => {
        if (selectedId !== null && map) {
            map.setFeatureState({ source: 'agri-fields', id: selectedId }, { selected: false });
        }
        setSelectedId(null);
        setSelectedField(null);
    };

    return (
        <>
            {/* Instant Floating Cursor HUD Tooltip */}
            {hoveredFeature && !selectedField && (
                <div 
                    className="pointer-events-none absolute z-[1500] bg-stone-900/95 backdrop-blur-sm text-white px-3 py-1.5 border border-stone-700 shadow-2xl rounded-none flex items-center gap-2 transform -translate-x-1/2 -translate-y-full mb-2 animate-in fade-in zoom-in-95 duration-75 font-sans"
                    style={{ left: `${hoveredFeature.x}px`, top: `${hoveredFeature.y - 8}px` }}
                >
                    <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                        style={{ 
                            backgroundColor: hoveredFeature.density === 'Low' 
                                ? '#22c55e' 
                                : hoveredFeature.density === 'Medium' 
                                    ? '#eab308' 
                                    : hoveredFeature.density === 'None' 
                                        ? '#9ca3af' 
                                        : '#ef4444' 
                        }} 
                    />
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-100">
                        {hoveredFeature.name}
                    </span>
                    <span className="text-stone-600 text-[10px] font-bold">•</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">
                        {Number(hoveredFeature.totalPigs || 0).toLocaleString()} Pigs
                    </span>
                </div>
            )}

            {/* Selected Barangay Popover */}
            {selectedField && (
                <MapPopup
                    key={`${selectedField.lng}-${selectedField.lat}`}
                    latitude={selectedField.lat}
                    longitude={selectedField.lng}
                    onClose={handleClosePopup}
                    closeOnClick={true}
                    className="p-0 border-none shadow-none"
                >
                    {isCompareMode ? (
                        renderComparisonPopup()
                    ) : (
                        <div className="w-52 bg-white border border-stone-200 rounded-none shadow-2xl overflow-hidden font-sans p-3 space-y-2">
                            {/* Header */}
                            <div className="flex items-center justify-between gap-1.5 border-b border-stone-100 pb-1.5">
                                <h3 className="text-xs font-black text-stone-900 tracking-tight uppercase truncate">
                                    {selectedField.name}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[8px] font-black uppercase tracking-wider rounded-none shrink-0 ${
                                    selectedField.density === 'Low' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                    selectedField.density === 'Medium' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                    selectedField.density === 'None' ? 'bg-stone-50 text-stone-600 border-stone-200' :
                                    'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                    {selectedField.density}
                                </span>
                            </div>

                            {/* Total Headcount Bar */}
                            <div className="flex items-baseline justify-between bg-stone-50 p-1.5 border border-stone-100">
                                <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">
                                    Total Swine
                                </span>
                                <span className="text-sm font-black text-stone-900 font-mono">
                                    {Number(selectedField.totalPigs || 0).toLocaleString()} <span className="text-[8px] font-normal text-stone-500 font-sans">pigs</span>
                                </span>
                            </div>

                            {/* Compact 2-Column Mini Grid for Stages */}
                            {Object.keys(selectedField.breakdown || {}).length > 0 && (
                                <div className="grid grid-cols-2 gap-1 pt-1 text-[9px] border-t border-stone-100">
                                    {Object.entries(selectedField.breakdown || {}).map(([key, value]) => (
                                        <div key={key} className="flex justify-between items-center bg-stone-50/70 px-1.5 py-0.5 border border-stone-200/50">
                                            <span className="text-stone-500 truncate capitalize font-medium mr-1 text-[8px]">
                                                {key.replace('_', ' ')}
                                            </span>
                                            <span className="font-bold font-mono text-stone-800 text-[9px]">
                                                {Number(value).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </MapPopup>
            )}
        </>
    );
};

export default MapDataHandler;
