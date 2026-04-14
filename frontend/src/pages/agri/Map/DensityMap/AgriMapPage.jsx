import { useState } from "react"
import MainMap from "./MainMap"
import { useGetHogSurvey, useGetMaps } from "/src/hooks/useMaps"
import { Map as MapIcon, Filter, Info, Activity, Layers, AlertTriangle } from "lucide-react"

const AgriMapPage = () => {
    const [selectedMonth, setSelectedMonth] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('all')

    const { data: map, isLoading: mapLoading, isError: mapError } = useGetMaps()
    const {
        data: survey,
        isLoading: surveyLoading,
        isError: surveyError,
        isFetching: surveyFetching
    } = useGetHogSurvey(selectedMonth, selectedSeason)

    if (mapLoading || surveyLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-white">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest animate-pulse">
                    Rendering Geospatial Layers...
                </p>
            </div>
        );
    }

    if (mapError || surveyError) {
        return (
            <div className="p-10">
                <div className="bg-red-50 border border-red-200 p-6 text-red-700 flex flex-col items-center gap-2">
                    <AlertTriangle size={24} />
                    <p className="font-bold uppercase text-xs">Mapping Error</p>
                    <p className="text-sm text-center">Failed to load topographical or survey data from the GIS server.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 md:p-8 space-y-6">

            {/* 1. Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-gray-200 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <MapIcon className="text-green-600" size={20} />
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Hog Density Analytics</h1>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Sariaya Barangay Geospatial Distribution & ML Predictions</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 p-3 shadow-sm">
                    <div className="flex items-center gap-2 px-2 border-r border-gray-100 mr-2">
                        {surveyFetching ? (
                            <span className="loading loading-spinner loading-xs text-green-600"></span>
                        ) : (
                            <Activity size={16} className="text-green-600" />
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters</span>
                    </div>

                    <select
                        className="select select-sm select-bordered rounded-none border-gray-200 bg-white font-bold text-xs uppercase focus:outline-none focus:border-green-600"
                        value={selectedSeason}
                        onChange={(e) => setSelectedSeason(e.target.value)}
                    >
                        <option value="all">Full Year Cycle</option>
                        <option value="wet">Wet Season (Jun-Nov)</option>
                        <option value="dry">Dry Season (Dec-May)</option>
                    </select>

                    <select
                        className="select select-sm select-bordered rounded-none border-gray-200 bg-white font-bold text-xs uppercase focus:outline-none focus:border-green-600"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="">Filter by Month...</option>
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                        ))}
                    </select>
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
                        <MainMap mapData={map} surveyData={survey} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AgriMapPage