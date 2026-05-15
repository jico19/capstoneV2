import {
    CheckCircle,
    Clock,
    TrendingUp,
    FileSignature,
    ArrowRight,
    Truck,
    Percent
} from "lucide-react";
import { useGetOPVDashboard } from "/src/hooks/useDashboard";
import KPICard from "/src/components/KPICard";
import BarChartComponent from "/src/components/charts/BarChart";
import { useNavigate } from "react-router-dom";

/**
 * OPV Staff Dashboard Overview (Unified)
 * High-signal minimalist overview of the Veterinary Office performance.
 * Merges workload monitoring with tactical livestock movement analytics.
 */
const OpvDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetOPVDashboard();
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4 animate-pulse">Syncing intelligence metrics</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-10 text-center text-red-700 bg-red-50 border border-red-200 rounded-none font-black uppercase tracking-widest text-xs max-w-3xl mx-auto mt-10">
                Critical Error: Failed to fetch dashboard intelligence.
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 bg-white min-h-screen font-sans rounded-none">
            {/* Flat Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-stone-100 pb-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 leading-none text-green-700">Operational.Intelligence</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none italic">OPV.Dashboard</h1>
                </div>
                <button 
                    onClick={() => navigate('/opv/application')}
                    className="bg-green-700 hover:bg-green-800 text-white px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-3"
                >
                    <FileSignature size={16} /> Manage Applications <ArrowRight size={14} />
                </button>
            </div>

            {/* KPI Cards: Primary Operational Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard
                    title="Awaiting Review"
                    value={kpis.waiting_for_opv}
                    subtitle="Validation queue"
                    icon={Clock}
                    colorClass="bg-amber-50 text-amber-700"
                />
                <KPICard
                    title="Validated Today"
                    value={kpis.validated_today}
                    subtitle="Processed within 24h"
                    icon={CheckCircle}
                    colorClass="bg-green-50 text-green-700"
                />
                <KPICard
                    title="Total Volume"
                    value={kpis.total_volume}
                    subtitle="Heads transported (30d)"
                    icon={Truck}
                    colorClass="bg-stone-50 text-stone-700"
                />
                <KPICard
                    title="Pass Rate"
                    value={kpis.pass_rate}
                    subtitle="Validation success rate"
                    icon={Percent}
                    colorClass="bg-blue-50 text-blue-700"
                    isPercent={true}
                />
            </div>

            {/* Main Content Area: Workload & Movement */}
            <div className="space-y-8">
                {/* Validation History Chart */}
                <div className="bg-stone-50 border border-stone-200 p-8 md:p-12 rounded-none">
                    <div className="mb-10 border-l-4 border-green-700 pl-6 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Workflow Statistics</p>
                        <h2 className="text-2xl font-black text-stone-800 uppercase tracking-tighter leading-tight">Daily.Throughput</h2>
                    </div>
                    <div className="bg-white p-6 border border-stone-100">
                        <BarChartComponent
                            data={charts.validation_history}
                            xKey="date"
                            yKey="count"
                            height={300}
                            barColor="#15803d"
                        />
                    </div>
                </div>

                {/* Tactical Analytics Grid */}
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
                                height={250}
                                barColor="#15803d"
                            />
                        </div>
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
                                height={250}
                                barColor="#1d4ed8"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OpvDashboard;
