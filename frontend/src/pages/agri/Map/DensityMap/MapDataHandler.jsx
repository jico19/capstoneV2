import { useEffect, useState, useCallback, useTransition, useRef } from "react";
import { useMap, MapPopup } from '../../../../components/ui/map';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Truck } from "lucide-react";

/**
 * Calculates the exact bounding box and centroid directly from GeoJSON coordinates,
 * ensuring zooming and centering always accurately frames the polygon regardless of database fields.
 */
const getPolygonBoundsAndCenter = (geojson) => {
    if (!geojson) return null;
    let coords = [];
    if (Array.isArray(geojson) && geojson.length > 0) {
        if (Array.isArray(geojson[0]) && Array.isArray(geojson[0][0])) {
            coords = geojson[0];
        } else if (Array.isArray(geojson[0])) {
            coords = geojson;
        }
    }
    if (!coords.length) return null;

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const pt of coords) {
        if (Array.isArray(pt) && pt.length >= 2) {
            const lng = Number(pt[0]);
            const lat = Number(pt[1]);
            if (!isNaN(lng) && !isNaN(lat)) {
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
            }
        }
    }

    if (minLng === Infinity || maxLng === -Infinity) return null;

    return {
        bounds: [[minLng, minLat], [maxLng, maxLat]],
        center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
    };
};

const MapDataHandler = ({ 
    mapData, 
    surveyData, 
    activeFilters = ['Low', 'Medium', 'High', 'Very High', 'None', 'No data'],
    selectedBarangay, 
    setSelectedBarangay,
    isCompareMode = false,
    compareSurveyData = [],
    compareYears = { baseline: '', target: '' },
    activeMapLayer = 'density', // 'density' | 'transport' | 'growth'
    transportVolumeData = []
}) => {
    const { map, isLoaded } = useMap();
    const [, startTransition] = useTransition();

    // Synchronous refs to prevent stale closure race conditions in high-frequency mouse events
    const hoveredIdRef = useRef(null);
    const selectedIdRef = useRef(null);

    const [hoveredFeature, setHoveredFeature] = useState(null);
    const [selectedField, setSelectedField] = useState(null);

    // --- 1. SEARCH OR EXTERNAL FOCUS TRIGGER (ACCURATE BOUNDS ZOOM) ---
    useEffect(() => {
        const sourceId = 'agri-fields';

        if (!selectedBarangay) {
            if (selectedIdRef.current !== null && map && isLoaded) {
                try {
                    map.setFeatureState({ source: sourceId, id: selectedIdRef.current }, { selected: false });
                } catch {
                    // map or source might be tearing down
                }
            }
            selectedIdRef.current = null;
            return;
        }

        if (!isLoaded || !mapData || !map) return;

        const item = mapData.find(b => b.name.toLowerCase() === selectedBarangay.toLowerCase());
        const surveyRecord = surveyData?.find(s => s.barangay.toLowerCase() === selectedBarangay.toLowerCase()) || {};
        const compareRecord = compareSurveyData?.find(s => s.barangay.toLowerCase() === selectedBarangay.toLowerCase()) || {};
        const transportRecord = transportVolumeData?.find(t => t.barangay.toLowerCase() === selectedBarangay.toLowerCase()) || {};
        
        if (item) {
            const breakdown = surveyRecord.breakdown || {};
            const compareBreakdown = compareRecord.breakdown || {};
            
            // Accurately compute polygon bounds from GeoJSON rather than stored lat/lng
            const geoInfo = getPolygonBoundsAndCenter(item.geojson);
            const lng = geoInfo ? geoInfo.center[0] : Number(item.longitude);
            const lat = geoInfo ? geoInfo.center[1] : Number(item.latitude);

            if (geoInfo) {
                map.fitBounds(geoInfo.bounds, {
                    padding: 80,
                    maxZoom: 14.2,
                    duration: 850
                });
            } else if (!isNaN(lng) && !isNaN(lat)) {
                map.easeTo({
                    center: [lng, lat],
                    zoom: 13.8,
                    duration: 850
                });
            }

            const rafId = requestAnimationFrame(() => {
                if (selectedIdRef.current !== null && selectedIdRef.current !== item.id) {
                    map.setFeatureState({ source: sourceId, id: selectedIdRef.current }, { selected: false });
                }
                selectedIdRef.current = item.id;
                map.setFeatureState({ source: sourceId, id: item.id }, { selected: true });

                setSelectedField({
                    id: item.id,
                    name: item.name,
                    density: surveyRecord.density_level || 'No data',
                    totalPigs: Number(surveyRecord.total_pigs || 0),
                    breakdown,
                    compareDensity: compareRecord.density_level || 'No data',
                    compareTotalPigs: Number(compareRecord.total_pigs || 0),
                    compareBreakdown,
                    diffPigs: surveyRecord.has_observations && compareRecord.has_observations
                        ? Number(surveyRecord.total_pigs) - Number(compareRecord.total_pigs) : null,
                    transportedPigs: Number(transportRecord.total_transported || 0),
                    transportLevel: transportRecord.volume_level || 'Stable',
                    lng,
                    lat
                });
            });

            return () => {
                cancelAnimationFrame(rafId);
            };
        }
    }, [selectedBarangay, isLoaded, mapData, map, surveyData, compareSurveyData, transportVolumeData]);

    // --- 2. SETUP GEOJSON DATA SOURCE ---
    useEffect(() => {
        if (!map || !isLoaded || !mapData) return;

        const sourceId = 'agri-fields';

        const geojson = {
            type: 'FeatureCollection',
            features: mapData.map((item) => {
                const surveyRecord = surveyData?.find(s => s.barangay.toLowerCase() === item.name.toLowerCase()) || {};
                const density = surveyRecord.density_level || 'No data';
                const totalPigs = Number(surveyRecord.total_pigs || 0);
                const breakdown = surveyRecord.breakdown || {};

                const compareRecord = compareSurveyData?.find(s => s.barangay.toLowerCase() === item.name.toLowerCase()) || {};
                const compareDensity = compareRecord.density_level || 'No data';
                const compareTotalPigs = Number(compareRecord.total_pigs || 0);
                const compareBreakdown = compareRecord.breakdown || {};

                const transportRecord = transportVolumeData?.find(t => t.barangay.toLowerCase() === item.name.toLowerCase()) || {};
                const transportedPigs = Number(transportRecord.total_transported || 0);
                const transportLevel = transportRecord.volume_level || 'Stable';

                const diff = surveyRecord.has_observations && compareRecord.has_observations ? totalPigs - compareTotalPigs : null;
                let growthTier = diff === null ? 'no_data' : 'stable';
                if (diff > 50) growthTier = 'growth_high';
                else if (diff > 0) growthTier = 'growth_mod';
                else if (diff < -50) growthTier = 'drop_high';
                else if (diff !== null && diff < 0) growthTier = 'drop_mod';

                return {
                    type: 'Feature',
                    id: item.id,
                    properties: {
                        name: item.name,
                        density,
                        totalPigs,
                        breakdown: JSON.stringify(breakdown),
                        compareDensity,
                        compareTotalPigs,
                        compareBreakdown: JSON.stringify(compareBreakdown),
                        transportedPigs,
                        transportLevel,
                        growthTier,
                        diffPigs: diff,
                        hasComparison: diff !== null,
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: item.geojson
                    }
                };
            })
        };

        const existingSource = map.getSource(sourceId);
        if (!existingSource) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: geojson,
                generateId: false
            });

            // Base Fill Layer
            map.addLayer({
                id: 'fields-fill',
                type: 'fill',
                source: sourceId,
                paint: {
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        0.88,
                        ['boolean', ['feature-state', 'hover'], false],
                        0.75, 
                        0.48  
                    ],
                    'fill-color': [
                        'match',
                        ['get', 'density'],
                        'Low', '#22c55e',       // Green
                        'Medium', '#eab308',    // Amber
                        'High', '#f97316',      // Orange
                        'Very High', '#dc2626', // Crimson Red
                        'No data', '#e2e8f0',
                        '#94a3b8'               // Slate / None
                    ]
                }
            });

            // Boundary Outline Layer
            map.addLayer({
                id: 'fields-outline',
                type: 'line',
                source: sourceId,
                paint: {
                    'line-color': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        '#0f172a',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#1e293b',
                        '#cbd5e1'  
                    ],
                    'line-width': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        3,
                        ['boolean', ['feature-state', 'hover'], false],
                        2.2,
                        0.8
                    ]
                }
            });
        } else {
            existingSource.setData(geojson);
        }
    }, [map, isLoaded, mapData, surveyData, compareSurveyData, transportVolumeData]);

    // --- 3. DYNAMIC COLOR LAYER SWITCHING (Density vs Transport vs Growth Delta) ---
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer('fields-fill')) return;

        if (activeMapLayer === 'growth' && isCompareMode) {
            map.setPaintProperty('fields-fill', 'fill-color', [
                'match',
                ['get', 'growthTier'],
                'no_data', '#e2e8f0',
                'growth_high', '#059669', // Deep Emerald
                'growth_mod', '#34d399',  // Mint Green
                'stable', '#94a3b8',      // Slate Grey
                'drop_mod', '#fb7185',    // Soft Coral
                'drop_high', '#e11d48',   // Deep Crimson
                '#94a3b8'
            ]);
        } else if (activeMapLayer === 'transport') {
            map.setPaintProperty('fields-fill', 'fill-color', [
                'match',
                ['get', 'transportLevel'],
                'Congested', '#7c3aed', // Purple
                'Heavy', '#3b82f6',     // Blue
                'Moderate', '#06b6d4',  // Cyan
                'Light', '#10b981',     // Green
                '#cbd5e1'               // None / Stable
            ]);
        } else {
            map.setPaintProperty('fields-fill', 'fill-color', [
                'match',
                ['get', 'density'],
                'Low', '#22c55e',
                'Medium', '#eab308',
                'High', '#f97316',
                'Very High', '#dc2626',
                'No data', '#e2e8f0',
                '#94a3b8'
            ]);
        }
    }, [map, isLoaded, activeMapLayer, isCompareMode]);

    // Update density visibility based on filter checkboxes
    useEffect(() => {
        if (!map || !isLoaded || !map.getLayer('fields-fill')) return;

        if (activeMapLayer === 'density') {
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
        } else {
            map.setFilter('fields-fill', null);
            map.setFilter('fields-outline', null);
        }
    }, [map, isLoaded, activeFilters, activeMapLayer]);

    // --- 4. MAP INTERACTION EVENTS (SYNCHRONOUS REF TRACKING) ---
    useEffect(() => {
        if (!map || !isLoaded) return;

        const sourceId = 'agri-fields';

        const clearHoverState = () => {
            if (hoveredIdRef.current !== null) {
                try {
                    map.setFeatureState({ source: sourceId, id: hoveredIdRef.current }, { hover: false });
                } catch {
                    // Safe guard during layer unmount
                }
                hoveredIdRef.current = null;
            }
            setHoveredFeature(null);
        };

        const onMouseMove = (e) => {
            if (e.features && e.features.length > 0) {
                map.getCanvas().style.cursor = 'pointer';
                const feature = e.features[0];
                const newHoveredId = feature.id;

                // Synchronously clear previous hover state
                if (hoveredIdRef.current !== null && hoveredIdRef.current !== newHoveredId) {
                    map.setFeatureState({ source: sourceId, id: hoveredIdRef.current }, { hover: false });
                }

                hoveredIdRef.current = newHoveredId;
                map.setFeatureState({ source: sourceId, id: newHoveredId }, { hover: true });

                setHoveredFeature({
                    id: newHoveredId,
                    name: feature.properties.name,
                    totalPigs: Number(feature.properties.totalPigs || 0),
                    density: feature.properties.density,
                    diffPigs: Number(feature.properties.diffPigs || 0),
                    hasComparison: feature.properties.hasComparison,
                    transportedPigs: Number(feature.properties.transportedPigs || 0),
                    x: e.point.x,
                    y: e.point.y
                });
            }
        };

        const onMouseLeave = () => {
            map.getCanvas().style.cursor = '';
            clearHoverState();
        };

        const onCanvasMouseLeave = () => {
            map.getCanvas().style.cursor = '';
            clearHoverState();
        };

        const onClick = (e) => {
            if (e.originalEvent) {
                e.originalEvent._polygonClicked = true;
            }
            const feature = e.features && e.features[0];
            if (feature) {
                const bName = feature.properties.name;
                const item = mapData?.find(b => b.name.toLowerCase() === bName.toLowerCase());

                if (selectedIdRef.current !== null && selectedIdRef.current !== feature.id) {
                    map.setFeatureState({ source: sourceId, id: selectedIdRef.current }, { selected: false });
                }

                selectedIdRef.current = feature.id;
                map.setFeatureState({ source: sourceId, id: feature.id }, { selected: true });

                const breakdown = JSON.parse(feature.properties.breakdown || '{}');
                const compareBreakdown = JSON.parse(feature.properties.compareBreakdown || '{}');

                // Smoothly frame the clicked polygon using its true GeoJSON bounds
                const geoInfo = item ? getPolygonBoundsAndCenter(item.geojson) : null;
                if (geoInfo) {
                    map.fitBounds(geoInfo.bounds, {
                        padding: 80,
                        maxZoom: 14.2,
                        duration: 850
                    });
                }

                if (setSelectedBarangay) {
                    setSelectedBarangay(bName);
                }

                startTransition(() => {
                    setSelectedField({
                        id: feature.id,
                        name: bName,
                        density: feature.properties.density,
                        totalPigs: Number(feature.properties.totalPigs || 0),
                        breakdown,
                        compareDensity: feature.properties.compareDensity,
                        compareTotalPigs: Number(feature.properties.compareTotalPigs || 0),
                        compareBreakdown,
                        transportedPigs: Number(feature.properties.transportedPigs || 0),
                        transportLevel: feature.properties.transportLevel,
                        diffPigs: Number(feature.properties.diffPigs || 0),
                        hasComparison: feature.properties.hasComparison,
                        lng: e.lngLat.lng,
                        lat: e.lngLat.lat
                    });
                });
            }
        };

        const onMapClick = (e) => {
            // If the click originated from a polygon feature, skip deselecting
            if (e.originalEvent?._polygonClicked) return;

            // Deselect when clicking outside any polygon on the map canvas
            if (selectedIdRef.current !== null) {
                try {
                    map.setFeatureState({ source: sourceId, id: selectedIdRef.current }, { selected: false });
                } catch {
                    // Safe guard
                }
            }
            selectedIdRef.current = null;
            setSelectedField(null);
            if (setSelectedBarangay) {
                setSelectedBarangay(null);
            }
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (selectedIdRef.current !== null) {
                    try {
                        map.setFeatureState({ source: sourceId, id: selectedIdRef.current }, { selected: false });
                    } catch {
                        // Safe guard
                    }
                }
                selectedIdRef.current = null;
                setSelectedField(null);
                if (setSelectedBarangay) {
                    setSelectedBarangay(null);
                }
            }
        };

        const canvas = map.getCanvas();
        window.addEventListener('keydown', onKeyDown);
        if (canvas) {
            canvas.addEventListener('mouseleave', onCanvasMouseLeave);
        }

        map.on('mousemove', 'fields-fill', onMouseMove);
        map.on('mouseleave', 'fields-fill', onMouseLeave);
        map.on('click', 'fields-fill', onClick);
        map.on('click', onMapClick);

        return () => {
            clearHoverState();
            window.removeEventListener('keydown', onKeyDown);
            if (canvas) {
                canvas.removeEventListener('mouseleave', onCanvasMouseLeave);
            }
            map.off('mousemove', 'fields-fill', onMouseMove);
            map.off('mouseleave', 'fields-fill', onMouseLeave);
            map.off('click', 'fields-fill', onClick);
            map.off('click', onMapClick);
        };
    }, [map, isLoaded, setSelectedBarangay, mapData]);

    const handleClosePopup = useCallback(() => {
        if (selectedIdRef.current !== null && map) {
            try {
                map.setFeatureState({ source: 'agri-fields', id: selectedIdRef.current }, { selected: false });
            } catch {
                // Safe guard
            }
        }
        selectedIdRef.current = null;
        setSelectedField(null);
    }, [map]);

    return (
        <>
            {/* Quick Floating Cursor HUD Tooltip */}
            {hoveredFeature && !selectedField && (
                <div 
                    className="pointer-events-none absolute z-[1500] bg-stone-900 text-white px-2.5 py-1 rounded-lg border border-stone-800 shadow-xs flex items-center gap-2 transform -translate-x-1/2 -translate-y-full mb-3 font-sans"
                    style={{ left: `${hoveredFeature.x}px`, top: `${hoveredFeature.y - 8}px` }}
                >
                    <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ 
                            backgroundColor: activeMapLayer === 'growth'
                                ? (hoveredFeature.diffPigs > 0 ? '#10b981' : hoveredFeature.diffPigs < 0 ? '#f43f5e' : '#94a3b8')
                                : activeMapLayer === 'transport'
                                    ? (hoveredFeature.transportedPigs > 0 ? '#3b82f6' : '#94a3b8')
                                    : (hoveredFeature.density === 'Low' ? '#22c55e' : hoveredFeature.density === 'Medium' ? '#eab308' : hoveredFeature.density === 'High' ? '#f97316' : hoveredFeature.density === 'Very High' ? '#dc2626' : '#94a3b8')
                        }} 
                    />
                    <span className="text-xs font-bold text-white tracking-tight">
                        {hoveredFeature.name}
                    </span>
                    <span className="text-stone-500 text-xs">•</span>
                    <span className="text-xs font-mono font-bold text-green-400">
                        {activeMapLayer === 'growth' && isCompareMode
                            ? (hoveredFeature.hasComparison ? `${hoveredFeature.diffPigs > 0 ? '+' : ''}${hoveredFeature.diffPigs} pigs` : 'No comparison data')
                            : activeMapLayer === 'transport'
                                ? `${hoveredFeature.transportedPigs.toLocaleString()} shipped`
                                : (hoveredFeature.density === 'No data' ? 'No observations' : `${hoveredFeature.totalPigs.toLocaleString()} pigs`)
                        }
                    </span>
                </div>
            )}

            {/* Interactive Selected Barangay Popover */}
            {(() => {
                const activePopupField = (selectedBarangay && selectedField && selectedBarangay.toLowerCase() === selectedField.name.toLowerCase()) 
                    ? selectedField 
                    : null;
                if (!activePopupField) return null;

                return (
                    <MapPopup
                        key={`${activePopupField.lng}-${activePopupField.lat}`}
                        latitude={activePopupField.lat}
                        longitude={activePopupField.lng}
                        onClose={handleClosePopup}
                        closeOnClick={true}
                        className="p-0 border-none shadow-none"
                    >
                        <div className="w-64 bg-white rounded-xl border border-stone-200 overflow-hidden font-sans p-3.5 space-y-2.5 shadow-md">
                            <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-2">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
                                        Barangay
                                    </span>
                                    <h3 className="text-sm font-black uppercase tracking-tight text-stone-800 leading-tight">
                                        {activePopupField.name}
                                    </h3>
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-600/40 shrink-0">
                                    {activePopupField.density}
                                </span>
                            </div>

                            {/* Headcount Metrics Card */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 block">Total Swine</span>
                                    <span className="text-sm font-black text-stone-800 font-mono">
                                        {activePopupField.density === 'No data' ? 'No data' : activePopupField.totalPigs.toLocaleString()}
                                    </span>
                                </div>
                                <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 block">Outbound</span>
                                    <span className="text-sm font-black text-sky-700 font-mono flex items-center gap-1">
                                        <Truck size={12} />
                                        {activePopupField.transportedPigs.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Compare Mode Differential */}
                            {isCompareMode && activePopupField.density !== 'No data' && activePopupField.compareDensity !== 'No data' && (
                                <div className="p-2 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
                                    <span className="text-[10px] font-medium text-stone-600">
                                        {compareYears.baseline} ➔ {compareYears.target}:
                                    </span>
                                    <span className={`font-mono font-bold inline-flex items-center gap-0.5 ${
                                        activePopupField.diffPigs > 0 ? 'text-green-700' : activePopupField.diffPigs < 0 ? 'text-red-700' : 'text-stone-500'
                                    }`}>
                                        {activePopupField.diffPigs > 0 && <TrendingUp size={12} />}
                                        {activePopupField.diffPigs < 0 && <TrendingDown size={12} />}
                                        {activePopupField.diffPigs === 0 && <Minus size={12} />}
                                        {activePopupField.diffPigs > 0 ? `+${activePopupField.diffPigs}` : activePopupField.diffPigs}
                                    </span>
                                </div>
                            )}

                            <div className="pt-1 border-t border-stone-200 flex items-center justify-between">
                                <p className="text-[10px] text-stone-500 font-medium">
                                    Selected in inspector dossier
                                </p>
                                <span className="text-[10px] font-black uppercase tracking-wider text-green-700 flex items-center gap-0.5">
                                    Active <ArrowRight size={10} />
                                </span>
                            </div>
                        </div>
                    </MapPopup>
                );
            })()}
        </>
    );
};

export default MapDataHandler;
