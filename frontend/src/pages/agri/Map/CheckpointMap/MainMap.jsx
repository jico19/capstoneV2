import { Map } from "/src/components/ui/map"



const MainMap = () => {
    return (
        <div className="h-[600px] w-full border-2 border-base-300 rounded-2xl overflow-hidden shadow-inner">
            <Map
                center={[121.5239, 13.9630]}
                zoom={14}
                style="https://tiles.openfreemap.org/styles/bright"
            >
                <MapControls />
                {/* <MapDataHandler mapData={mapData} surveyData={surveyData} /> */}
            </Map>
        </div>)
}

export default MainMap