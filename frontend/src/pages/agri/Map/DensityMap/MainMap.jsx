import { useEffect, useState } from "react"
import { Map, MapControls, useMap, MapPopup} from "/src/components/ui/map"
import MapDataHandler from "./MapDataHandler"


const MainMap = ({ center = [121.5239, 13.9630], zoom = 12, mapData, surveyData }) => {
    return (
        <div className="h-[650px] w-full overflow-hidden">
            <Map
                center={center}
                zoom={zoom}
                style="https://tiles.openfreemap.org/styles/bright"
            >   
                <MapControls />
                <MapDataHandler mapData={mapData} surveyData={surveyData}/>
            </Map>
        </div>
    )
}

export default MainMap