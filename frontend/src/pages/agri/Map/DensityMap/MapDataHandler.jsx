import { useEffect, useState } from "react"
import { useMap, MapPopup } from "/src/components/ui/map"

const MapDataHandler = ({ mapData, surveyData }) => {
    const { map, isLoaded } = useMap();
    const [hoveredId, setHoveredId] = useState(null);
    const [selectedField, setSelectedField] = useState(null);

    // --- 1. SETUP SOURCE AND LAYERS ---
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

                return {
                    type: 'Feature',
                    id: item.id,
                    properties: {
                        name: item.name,
                        lng: Number(item.longitude),
                        lat: Number(item.latitude),
                        density: density,
                        totalPigs: totalPigs
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
                        '#9ca3af'  
                    ]
                }
            });
        } else {
            existingSource.setData(geojson);
        }
    }, [map, isLoaded, mapData, surveyData]);

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
                setTimeout(() => {
                    setSelectedField({
                        name: feature.properties.name,
                        density: feature.properties.density,
                        totalPigs: feature.properties.totalPigs,
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

    return (
        <>
            {selectedField && (
                <MapPopup
                    key={`${selectedField.lng}-${selectedField.lat}`}
                    latitude={selectedField.lat}
                    longitude={selectedField.lng}
                    onClose={() => setSelectedField(null)}
                    closeOnClick={true}
                >
                    <div className="p-3 min-w-[160px] bg-white text-neutral">
                        <strong className="block text-lg border-b pb-1 mb-2">
                            {selectedField.name}
                        </strong>
                        <div className="flex flex-col gap-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Density:</span>
                                <span className="font-bold">{selectedField.density}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Est. Population:</span>
                                <span className="font-bold">{selectedField.totalPigs}</span>
                            </div>
                        </div>
                    </div>
                </MapPopup>
            )}
        </>
    );
};

export default MapDataHandler;