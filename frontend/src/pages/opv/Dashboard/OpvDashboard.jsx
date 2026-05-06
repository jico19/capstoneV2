import {
    CheckCircle,
    Clock,
    TrendingUp,
    FileSignature,
    ArrowRight
} from "lucide-react";
import { useGetOPVDashboard } from "/src/hooks/useDashboard";
import KPICard from "/src/components/KPICard";
import BarChartComponent from "/src/components/charts/BarChart";
import { useNavigate } from "react-router-dom";

/**
 * OPV Staff Dashboard Overview
 * High-signal minimalist overview of the Veterinary Office performance.
 * Focuses on KPIs and throughput trends.
 */
const OpvDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetOPVDashboard();
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4 animate-pulse">Syncing validation metrics</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-10 text-center text-red-700 bg-red-50 border border-red-200 rounded-none font-black uppercase tracking-widest text-xs max-w-3xl mx-auto mt-10">
                Critical Error: Failed to fetch validation metrics.
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12 bg-white min-h-screen font-sans rounded-none">
            {/* Flat Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-stone-100 pb-10">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 leading-none">Veterinary Office Overview</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none italic">OPV.Dashboard</h1>
                </div>
                <button 
                    onClick={() => navigate('/opv/application')}
                    className="bg-green-700 hover:bg-green-800 text-white px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-3"
                >
                    <FileSignature size={16} /> Manage Applications <ArrowRight size={14} />
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Awaiting Review"
                    value={kpis.waiting_for_opv}
                    subtitle="Applications in validation queue"
                    icon={Clock}
                    colorClass="bg-amber-50 text-amber-700"
                />
                <KPICard
                    title="Validated Today"
                    value={kpis.validated_today}
                    subtitle="Successfully processed within 24h"
                    icon={CheckCircle}
                    colorClass="bg-green-50 text-green-700"
                />
                <KPICard
                    title="Rejection Rate"
                    value={kpis.rejection_rate}
                    subtitle="Application quality tracking"
                    icon={TrendingUp}
                    colorClass="bg-red-50 text-red-700"
                    isPercent={true}
                />
            </div>

            {/* Validation History Chart */}
            <div className="bg-stone-50 border border-stone-200 p-8 md:p-12 rounded-none">
                <div className="mb-10 border-l-4 border-green-700 pl-6 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Workflow Statistics</p>
                    <h2 className="text-2xl font-black text-stone-800 uppercase tracking-tighter leading-tight">Daily.Throughput</h2>
                    <p className="text-xs text-stone-500 font-medium max-w-md mt-2">Historical data showing the volume of applications validated by the provincial veterinary office over the past 30 days.</p>
                </div>
                <div className="bg-white p-6 border border-stone-100">
                    <BarChartComponent
                        data={charts.validation_history}
                        xKey="date"
                        yKey="count"
                        height={350}
                        barColor="#15803d"
                    />
                </div>
            </div>
        </div>
    );
};

export default OpvDashboard;