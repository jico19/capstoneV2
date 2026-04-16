import { MapIcon } from "lucide-react"
import CheckpointMainMap from "./CheckpointMainMap"



const CheckpointMap = () => {
    return (
        <div className="p-8 md:p-8 space-y-6">

            {/* 1. Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-gray-200 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <MapIcon className="text-green-600" size={20} />
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Checkpoint Map</h1>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Checkpoint Map</p>
                </div>

            
            </div>

            {/* 2. Main Map Layout */}
            <div className="">

                {/* Map Display Container */}
                <div className=" bg-white border border-gray-200 relative">
                    {/* Custom Map UI Overlays */}
                    <div className="absolute top-4 left-4 z-[1000] bg-white border-2 border-gray-900 px-3 py-1 font-mono text-[10px] font-black uppercase">
                        Sariaya Municipal GIS / Powered by MapCN
                    </div> 

                    {/* The Actual Map Component */}
                    <div className="w-full h-full">
                        <CheckpointMainMap  />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CheckpointMap