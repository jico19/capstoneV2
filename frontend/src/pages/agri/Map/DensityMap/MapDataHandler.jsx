import { useEffect, useState } from "react"
import { useMap, MapPopup } from "/src/components/ui/map"

const MapDataHandler = ({ mapData, surveyData, activeFilters = ['Low', 'Medium', 'High', 'Very High', 'None'], selectedBarangay, setSelectedBarangay }) => {
    const { map, isLoaded } = useMap();
    const [hoveredId, setHoveredId] = useState(null);
    const [selectedField, setSelectedField] = useState(null);

    // --- 1. SEARCH TRIGGER LOGIC ---
    useEffect(() => {
        if (!selectedBarangay || !isLoaded || !mapData || !map) return;

        // Find the barangay in our data
        const item = mapData.find(b => b.name === selectedBarangay);
        const surveyRecord = surveyData?.find(s => s.barangay === selectedBarangay) || {};
        
        if (item) {
            const breakdown = surveyRecord.breakdown || {};
            const lng = Number(item.longitude);
            const lat = Number(item.latitude);
            
            // 1. Center the map on the barangay immediately
            map.easeTo({
                center: [lng, lat],
                zoom: 14,
                duration: 0
            });

            // 2. Trigger the popup info
            setSelectedField({
                name: item.name,
                density: surveyRecord.density_level || 'None',
                totalPigs: surveyRecord.total_pigs || 0,
                breakdown: breakdown,
                trend: surveyRecord.trend || 'stable',
                isPrediction: surveyRecord.is_prediction || false,
                lng: lng,
                lat: lat
            });
        }
    }, [selectedBarangay, isLoaded, mapData, surveyData, map]);

    // --- 2. SETUP SOURCE AND LAYERS ---
    useEffect(() => {
        if (!map || !isLoaded || !mapData) return;

        const sourceId = 'agri-fields';

        // Merge the map boundaries with the survey data
        const geojson = {
            type: 'FeatureCollection',
            features: mapData.map((item) => {
                const surveyRecord = surveyData?.find(s => s.barangay === item.name) || {};
                const density = surveyRecord.density_level || 'None';
                const totalPigs = surveyRecord.total_pigs || 0;
                const breakdown = surveyRecord.breakdown || {};
                const trend = surveyRecord.trend || 'stable';
                const isPrediction = surveyRecord.is_prediction || false;

                return {
                    type: 'Feature',
                    id: item.id,
                    properties: {
                        name: item.name,
                        density: density,
                        totalPigs: totalPigs,
                        breakdown: JSON.stringify(breakdown),
                        trend: trend,
                        isPrediction: isPrediction
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
                        ['boolean', ['feature-state', 'hover'], false],
                        0.7, 
                        0.4  
                    ],
                    // UPDATED: 3-Color Scale (Red, Yellow, Green) + White Fallback
                    'fill-color': [
                        'match',
                        ['get', 'density'],
                        'Low', '#22c55e',       // Green
                        'Medium', '#eab308',    // Yellow
                        'High', '#ef4444',      // Red
                        'Very High', '#ef4444', // Red
                        '#808080'               // Fallback / None (White)
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
                        ['boolean', ['feature-state','hover'], false],
                        '#111827',
                        '#9ca3af'  
                    ],
                    'line-width': [
                        'case',
                        ['boolean', ['feature-state','hover'], false],
                        2,
                        0.5
                    ]
                }
            });
        } else {
            existingSource.setData(geojson);
        }
    }, [map, isLoaded, mapData, surveyData]);

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
            if (e.features.length > 0) {
                map.getCanvas().style.cursor = 'pointer';
                const newHoveredId = e.features[0].id;

                if (hoveredId !== null && hoveredId !== newHoveredId) {
                    map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
                }

                setHoveredId(newHoveredId);
                map.setFeatureState({ source: sourceId, id: newHoveredId }, { hover: true });
            }
        };

        const onMouseLeave = () => {
            map.getCanvas().style.cursor = '';
            if (hoveredId !== null) {
                map.setFeatureState({ source: sourceId, id: hoveredId }, { hover: false });
            }
            setHoveredId(null);
        };

        const onClick = (e) => {
            const feature = e.features[0];
            if (feature) {
                setSelectedField(null);
                const breakdown = JSON.parse(feature.properties.breakdown || '{}');
                
                setTimeout(() => {
                    setSelectedField({
                        name: feature.properties.name,
                        density: feature.properties.density,
                        totalPigs: feature.properties.totalPigs,
                        breakdown: breakdown,
                        trend: feature.properties.trend,
                        isPrediction: feature.properties.isPrediction,
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
    }, [map, isLoaded, hoveredId]);

    const getTrendIcon = (trend) => {
        if (trend === 'up') return '↗';
        if (trend === 'down') return '↘';
        return '→';
    };

    const getDensityColor = (density) => {
        const colors = {
            'Low': 'text-green-600',
            'Medium': 'text-yellow-600',
            'High': 'text-red-600',
            'Very High': 'text-red-700'
        };
        return colors[density] || 'text-gray-400';
    };

    return (
        <>
            {selectedField && (
                <MapPopup
                    key={`${selectedField.lng}-${selectedField.lat}`}
                    latitude={selectedField.lat}
                    longitude={selectedField.lng}
                    onClose={() => setSelectedField(null)}
                    closeOnClick={true}
                    className="p-0 border-none shadow-none"
                >
                    <div className="w-56 bg-white border border-gray-900/10 rounded-none overflow-hidden">
                        {/* Header */}
                        <div className="border-b border-gray-100 p-3 bg-white">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Barangay</p>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">
                                {selectedField.name}
                            </h3>
                        </div>

                        {/* Summary Stats */}
                        <div className="p-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block leading-none">Status</span>
                                <span className={`text-xs font-black uppercase ${getDensityColor(selectedField.density)}`}>
                                    {selectedField.density}
                                </span>
                            </div>
                            <div className="space-y-0.5 text-right">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block leading-none">Pigs</span>
                                <span className="text-xs font-black text-green-600">
                                    {selectedField.totalPigs.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div className="p-3 space-y-2">
                            <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest block border-b border-gray-100 pb-1">
                                Distribution
                            </span>
                            <div className="grid grid-cols-1 gap-1.5">
                                {Object.entries(selectedField.breakdown).map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-center text-[11px]">
                                        <span className="text-gray-500 font-medium capitalize">{key.replace('_', ' ')}</span>
                                        <span className="font-black text-gray-900">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info Footer */}
                        <div className="p-3 pt-1 border-t border-gray-50">
                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider leading-relaxed">
                                Verified Data
                            </p>
                        </div>
                    </div>
                </MapPopup>
            )}
        </>
    );
};

export default MapDataHandler;