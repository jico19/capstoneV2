import { useGetOPVAnalytics } from "/src/hooks/useDashboard";
import KPICard from "/src/components/KPICard";
import BarChartComponent from "/src/components/charts/BarChart";
import { Truck, Percent, ClipboardList } from "lucide-react";

/**
 * OPV Tactical Analytics
 * Provides operational insights into livestock movement and validation performance.
 * Following minimalist design system: flat UI, sharp corners, stones & greens.
 */
const OpvAnalytics = () => {
    const { data: metrics, isLoading, isError } = useGetOPVAnalytics();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4 animate-pulse">Computing tactical data</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-10 text-center text-red-700 bg-red-50 border border-red-200 rounded-none font-black uppercase tracking-widest text-xs max-w-3xl mx-auto mt-10">
                Error: Failed to synchronize tactical analytics.
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 bg-white min-h-screen rounded-none font-sans">
            {/* Minimalist Header */}
            <div className="border-b border-stone-100 pb-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 leading-none text-green-700">Operational.Intelligence</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none italic">OPV.Analytics</h1>
                </div>
            </div>

            {/* Tactical KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Total Volume"
                    value={kpis.total_volume}
                    subtitle="Heads transported (30d)"
                    icon={Truck}
                    colorClass="bg-green-50 text-green-700"
                />
                <KPICard
                    title="Pass Rate"
                    value={kpis.pass_rate}
                    subtitle="Validation success rate"
                    icon={Percent}
                    colorClass="bg-blue-50 text-blue-700"
                    isPercent={true}
                />
                <KPICard
                    title="Active Queue"
                    value={kpis.active_queue}
                    subtitle="Awaiting validation"
                    icon={ClipboardList}
                    colorClass="bg-amber-50 text-amber-700"
                />
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Origins Bar Chart */}
                <div className="bg-stone-50 border border-stone-200 p-8 rounded-none">
                    <div className="mb-8 border-l-4 border-green-700 pl-4 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Geographic Source</p>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-stone-800">Top.Origin.Areas</h3>
                    </div>
                    <div className="bg-white p-6 border border-stone-100">
                        <BarChartComponent
                            data={charts.top_barangays}
                            xKey="name"
                            yKey="count"
                            height={300}
                            barColor="#15803d"
                        />
                    </div>
                    <p className="mt-4 text-[10px] font-medium text-stone-500 uppercase tracking-wide">Volume distribution by top 5 origin barangays.</p>
                </div>

                {/* Destinations Bar Chart */}
                <div className="bg-stone-50 border border-stone-200 p-8 rounded-none">
                    <div className="mb-8 border-l-4 border-blue-700 pl-4 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Traffic Hotspots</p>
                        <h3 className="text-xl font-black uppercase tracking-tighter text-stone-800">Destination.Trends</h3>
                    </div>
                    <div className="bg-white p-6 border border-stone-100">
                        <BarChartComponent
                            data={charts.top_destinations}
                            xKey="name"
                            yKey="count"
                            height={300}
                            barColor="#1d4ed8"
                        />
                    </div>
                    <p className="mt-4 text-[10px] font-medium text-stone-500 uppercase tracking-wide">Most frequent shipment endpoints by volume.</p>
                </div>
            </div>
        </div>
    );
};

export default OpvAnalytics;
