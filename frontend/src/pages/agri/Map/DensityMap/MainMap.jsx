import { useEffect, useState, forwardRef } from "react"
import { Map, MapControls, useMap, MapPopup} from "/src/components/ui/map"
import MapDataHandler from "./MapDataHandler"


const MainMap = forwardRef(({ center = [121.5239, 13.9630], zoom = 12, mapData, surveyData, activeFilters, selectedBarangay, setSelectedBarangay }, ref) => {
    return (
        <div className="h-full w-full overflow-hidden">
            <Map
                ref={ref}
                center={center}
                zoom={zoom}
                style="https://tiles.openfreemap.org/styles/bright"
            >   
                <MapControls />
                <MapDataHandler 
                    mapData={mapData} 
                    surveyData={surveyData} 
                    activeFilters={activeFilters}
                    selectedBarangay={selectedBarangay}
                    setSelectedBarangay={setSelectedBarangay}
                />
            </Map>
        </div>
    )
})

MainMap.displayName = 'MainMap'

export default MainMap