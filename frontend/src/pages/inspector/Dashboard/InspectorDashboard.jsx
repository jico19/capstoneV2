import { 
    Scan, 
    Calendar, 
    ShieldCheck, 
    Clock,
    History
} from "lucide-react";
import { useGetInspectorDashboard } from "/src/hooks/useDashboard";
import KPICard from "/src/components/KPICard";
import BarChartComponent from "/src/components/charts/BarChart";
import { useNavigate } from "react-router-dom";


/**
 * Inspector Dashboard
 * Field-focused Flat UI: high contrast, no radius, minimalist data tables.
 */
const InspectorDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetInspectorDashboard();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4 animate-pulse">Syncing field activity</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-10 text-center text-red-700 bg-red-50 rounded-none border border-gray-200 font-black uppercase tracking-widest text-xs max-w-3xl mx-auto mt-10">
                Connection Error: Failed to sync Inspector logs.
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-12 bg-gray-50 min-h-screen font-sans rounded-none">
            {/* Flat Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 pb-10">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Field Verification Hub</p>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">Inspector.View</h1>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-none">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Duty.Session</p>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight mt-1">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="My Total Scans"
                    value={kpis.my_total_scans}
                    subtitle="Lifetime verification activity"
                    icon={Scan}
                    colorClass="bg-gray-100 text-blue-700"
                />
                <KPICard
                    title="Scans Today"
                    value={kpis.scans_today}
                    subtitle="Activity for current shift"
                    icon={Calendar}
                    colorClass="bg-green-50 text-green-700"
                />
                <KPICard
                    title="System Active"
                    value={kpis.total_active_permits_in_system}
                    subtitle="Live permits currently on road"
                    icon={ShieldCheck}
                    colorClass="bg-indigo-50 text-indigo-700"
                />
            </div>

            {/* Verification Trend Chart */}
            <div className="bg-white border border-gray-200 p-10 rounded-none">
                <div className="mb-10 border-l-2 border-blue-600 pl-6 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Activity Monitoring</p>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Scan.History</h2>
                </div>
                <BarChartComponent
                    data={charts.activity_trend}
                    xKey="date"
                    yKey="count"
                    height={300}
                    barColor="#16a34a"
                />
            </div>

        </div>
    );
};

export default InspectorDashboard;
