import { useState, useRef } from "react"
import MainMap from "./MainMap"
import { useGetHogSurvey, useGetMaps } from "/src/hooks/useMaps"
import { Map as MapIcon, Info, Activity, AlertTriangle, Search, TrendingUp, BarChart3 } from "lucide-react"

/**
 * Pig Map - Redesigned for Farmer-Friendly clarity and Minimalist Design System
 */
const AgriMapPage = () => {
    const [startMonth, setStartMonth] = useState('')
    const [endMonth, setEndMonth] = useState('')
    const [selectedSeason, setSelectedSeason] = useState('all')
    const [activeFilters, setActiveFilters] = useState(['Low', 'Medium', 'High', 'Very High', 'None'])
    const [selectedBarangay, setSelectedBarangay] = useState(null)
    const mapRef = useRef(null)

    const toggleFilter = (level) => {
        setActiveFilters(prev => 
            prev.includes(level) 
                ? prev.filter(f => f !== level)
                : [...prev, level]
        )
    }

    const { data: map, isLoading: mapLoading, isError: mapError } = useGetMaps()
    const {
        data: survey,
        isLoading: surveyLoading,
        isError: surveyError,
        isFetching: surveyFetching
    } = useGetHogSurvey(startMonth, endMonth, selectedSeason)

    const handleSearch = (barangayName) => {
        if (barangayName) {
            setSelectedBarangay(barangayName)
        }
    }

    const months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    if (mapLoading || surveyLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-white">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
                    Loading Pig Map Data...
                </p>
            </div>
        );
    }

    if (mapError || surveyError) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 border border-red-100 p-8 text-red-600 flex flex-col items-center gap-4 text-center">
                    <AlertTriangle size={32} />
                    <div className="space-y-1">
                        <p className="font-black uppercase text-xs tracking-widest">Map Error</p>
                        <p className="text-sm font-medium">We couldn't load the map data. Please try again later.</p>
                    </div>
                </div>
            </div>
        );
    }

    const totalPigs = survey?.reduce((acc, curr) => acc + curr.total_pigs, 0) || 0
    const highDensityBarangays = survey?.filter(s => s.density_level === 'High' || s.density_level === 'Very High').length || 0

    return (
        <div className="flex-1 p-4 md:p-8 space-y-8 bg-white min-h-full">

            {/* 1. Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-gray-100 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <MapIcon className="text-green-600" size={24} />
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pig Population Map</h1>
                    </div>
                    <p className="text-gray-500 text-sm font-medium">See how many pigs are in each area of Sariaya</p>
                </div>

                <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white border border-gray-100 p-3">
                    {/* Search */}
                    <div className="flex items-center gap-2 px-4 py-2 border-b sm:border-b-0 sm:border-r border-gray-100">
                        <Search size={18} className="text-gray-400" />
                        <select 
                            className="bg-transparent text-xs font-black uppercase tracking-widest focus:outline-none min-w-[180px] cursor-pointer"
                            onChange={(e) => handleSearch(e.target.value)}
                            value=""
                        >
                            <option value="" disabled>FIND A BARANGAY</option>
                            {map?.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Season Shortcut */}
                    <div className="px-2 border-b sm:border-b-0 sm:border-r border-gray-100">
                        <select
                            className="w-full bg-white px-2 py-2 font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-green-600 rounded-none cursor-pointer"
                            value={selectedSeason}
                            onChange={(e) => {
                                setSelectedSeason(e.target.value);
                                setStartMonth('');
                                setEndMonth('');
                            }}
                        >
                            <option value="all">Full Year</option>
                            <option value="wet">Wet Season (Jun-Nov)</option>
                            <option value="dry">Dry Season (Dec-May)</option>
                        </select>
                    </div>

                    {/* Month Range */}
                    <div className="flex items-center gap-2 px-2">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">From</span>
                            <select
                                className="bg-stone-50 border border-stone-200 px-3 py-2 font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-green-600 rounded-none cursor-pointer"
                                value={startMonth}
                                onChange={(e) => {
                                    setStartMonth(e.target.value);
                                    setSelectedSeason('all');
                                }}
                            >
                                <option value="">Start</option>
                                {months.map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">To</span>
                            <select
                                className="bg-stone-50 border border-stone-200 px-3 py-2 font-black text-[10px] uppercase tracking-widest focus:outline-none focus:border-green-600 rounded-none cursor-pointer"
                                value={endMonth}
                                onChange={(e) => {
                                    setEndMonth(e.target.value);
                                    setSelectedSeason('all');
                                }}
                                disabled={!startMonth}
                            >
                                <option value="">End</option>
                                {months.map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Main Map Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                {/* Side Info Panel */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-white border border-gray-100 p-6 space-y-8">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</span>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">At a Glance</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-100">
                                <div className="text-green-600">
                                    <TrendingUp size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Total Pigs</p>
                                    <p className="text-2xl font-black text-gray-900 leading-none mt-1">{totalPigs.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-100">
                                <div className="text-red-600">
                                    <BarChart3 size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Busy Areas</p>
                                    <p className="text-2xl font-black text-gray-900 leading-none mt-1">{highDensityBarangays}</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Map Colors</span>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { id: 'Very High', label: 'Very High (More than 500)', color: 'bg-red-600' },
                                    { id: 'High', label: 'High (200 to 500)', color: 'bg-red-400' },
                                    { id: 'Medium', label: 'Medium (50 to 200)', color: 'bg-amber-500' },
                                    { id: 'Low', label: 'Low (Less than 50)', color: 'bg-green-600' },
                                    { id: 'None', label: 'Stable / No Data', color: 'bg-gray-300' }
                                ].map((item) => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => toggleFilter(item.id)}
                                        className={`flex items-center gap-4 w-full transition-opacity group ${activeFilters.includes(item.id) ? 'opacity-100' : 'opacity-30'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-none ${item.color} border border-gray-900/5`} />
                                        <span className={`text-[11px] font-black uppercase tracking-wider text-left ${activeFilters.includes(item.id) ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {item.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-8 font-bold uppercase tracking-widest">Tap a color to show or hide it on the map</p>
                        </div>
                    </div>

                    <div className="bg-gray-900 p-6 text-white border border-gray-900">
                        <div className="flex items-center gap-2 mb-3">
                            <Info size={16} className="text-green-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Notice</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium uppercase tracking-wider">
                            This map uses data from local agriculture records and history.
                        </p>
                    </div>
                </div>

                {/* Map Display Container */}
                <div className="xl:col-span-3 bg-white border border-gray-100 relative h-[650px] xl:h-[750px]">
                    {/* Custom Map UI Overlays */}
                    <div className="absolute top-4 left-4 z-[10] bg-white border border-gray-900 px-4 py-2 font-black text-[10px] uppercase tracking-[0.2em] text-gray-900 flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-600" />
                        Live GIS Service
                    </div>

                    {/* The Actual Map Component */}
                    <MainMap 
                        ref={mapRef} 
                        mapData={map} 
                        surveyData={survey} 
                        activeFilters={activeFilters}
                        selectedBarangay={selectedBarangay}
                        setSelectedBarangay={setSelectedBarangay}
                    />
                </div>
            </div>
        </div>
    )
}

export default AgriMapPage
