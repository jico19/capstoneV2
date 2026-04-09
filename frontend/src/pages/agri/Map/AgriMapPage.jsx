import { useState } from "react"
import MainMap from "./MainMap"
import { useGetHogSurvey, useGetMaps } from "/src/hooks/useMaps"

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

    if (mapLoading || surveyLoading) return <div className="p-10 text-center font-bold opacity-50">Loading Data...</div>;
    if (mapError || surveyError) return <div className="p-10 text-error font-bold">Failed to load data.</div>;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black uppercase text-neutral">Map</h1>

                <div className="flex gap-4 items-center">
                    {surveyFetching && <span className="loading loading-spinner text-primary"></span>}

                    <select
                        className="select select-bordered"
                        value={selectedSeason}
                        // FIX: Only update the season, stop clearing the month
                        onChange={(e) => setSelectedSeason(e.target.value)}
                    >
                        <option value="all">All Year</option>
                        <option value="wet">Wet Season (Jun - Nov)</option>
                        <option value="dry">Dry Season (Dec - May)</option>
                    </select>

                    <select
                        className="select select-bordered"
                        value={selectedMonth}
                        // FIX: Only update the month, stop clearing the season
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="">Specific Month...</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                    </select>
                </div>
            </div>

            <MainMap mapData={map} surveyData={survey} />
        </div>
    )
}

export default AgriMapPage