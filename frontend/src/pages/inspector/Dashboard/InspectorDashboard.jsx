import {
    Scan,
    Calendar,
    ShieldCheck,
    History
} from "lucide-react";
import { useGetInspectorDashboard, useGetDashboardInsights } from '../../../hooks/useDashboard';
import KPICard from "../../../components/ui/KPICard";
import BarChartComponent from '../../../components/charts/BarChart';
import LineChartComponent from '../../../components/charts/LineChart';
import ChartTakeaway from '../../../components/ui/ChartTakeaway';
import DataTable from '../../../components/ui/DataTable';


/**
 * Inspector Dashboard
 * Field-focused Flat UI: high contrast, no radius, minimalist data tables.
 */
const InspectorDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetInspectorDashboard();
    const { data: insightData, isLoading: isInsightLoading } = useGetDashboardInsights('Inspector');

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4 animate-pulse">Syncing field activity</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-10 text-center text-red-700 bg-red-50 rounded-xl border border-red-200 font-black uppercase tracking-widest text-xs max-w-3xl mx-auto mt-10 shadow-xs">
                Connection Error: Failed to sync Inspector logs.
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="mx-auto p-4 md:p-8 space-y-8 bg-white min-h-screen font-sans">
            {/* Flat Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-stone-200 pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Field Verification Hub</p>
                    <h1 className="text-3xl font-black text-stone-900 uppercase tracking-tight leading-none">Inspector View</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-stone-50 border border-stone-200 p-3 rounded-lg shadow-2xs">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Duty Session</p>
                        <p className="text-xs font-black text-stone-900 uppercase tracking-tight mt-1">{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="My Total Scans"
                    value={kpis.my_total_scans}
                    subtitle="Lifetime verification activity"
                    icon={Scan}
                    colorClass="bg-sky-50 text-sky-700"
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
                    colorClass="bg-stone-100 text-stone-700"
                />
            </div>

            {/* Verification Trend Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-stone-200 p-6 md:p-8 rounded-xl shadow-xs">
                    <div className="mb-8 border-l-4 border-sky-600 pl-4 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Activity Monitoring</p>
                        <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">Scan History</h2>
                    </div>
                    <BarChartComponent
                        data={charts.activity_trend}
                        xKey="date"
                        yKey="count"
                        height={300}
                        barColor="#15803d"
                    />
                    <ChartTakeaway
                        takeaway={insightData?.chart_insights?.activity_trend}
                        isLoading={isInsightLoading}
                    />
                </div>

                <div className="bg-white border border-stone-200 p-6 md:p-8 rounded-xl shadow-xs">
                    <div className="mb-8 border-l-4 border-green-700 pl-4 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Shift Optimization</p>
                        <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">Peak Activity</h2>
                    </div>
                    <LineChartComponent
                        data={charts.peak_activity}
                        xKey="hour"
                        yKey="count"
                        height={300}
                        lineColor="#15803d"
                    />
                    <ChartTakeaway
                        takeaway={insightData?.chart_insights?.peak_activity}
                        isLoading={isInsightLoading}
                    />
                    <p className="mt-4 text-[10px] font-medium text-stone-500 uppercase tracking-wide">Verification scans per hour (all-time).</p>
                </div>
            </div>

            {/* Recent Checkpoint Activity Ledger */}
            <div className="bg-white border border-stone-200 p-6 md:p-8 rounded-xl shadow-xs space-y-6">
                <div className="border-l-2 border-green-700 pl-4 space-y-0.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none">Duty Ledger</p>
                    <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">Recent Cargo Inspections</h2>
                </div>
                <DataTable
                    columns={[
                        {
                            header: "Permit ID",
                            render: (log) => (
                                <span className="text-xs font-mono font-black text-stone-900 bg-stone-100 px-2 py-0.5 border border-stone-200">
                                    {log.application_id}
                                </span>
                            ),
                        },
                        {
                            header: "Scan Timestamp",
                            render: (log) => (
                                <span className="text-xs text-stone-500 font-mono">{log.scanned_at}</span>
                            ),
                        },
                        {
                            header: "Destination",
                            render: (log) => (
                                <span className="text-xs font-bold text-stone-800 uppercase">{log.destination}</span>
                            ),
                        },
                        {
                            header: "Cargo Size",
                            align: "right",
                            render: (log) => (
                                <span className="text-xs font-black text-stone-900">{log.total_pigs} pigs</span>
                            ),
                        },
                    ]}
                    data={metrics.recent_activity || []}
                    minWidth="600px"
                    keyField={(log, index) => `${log.application_id}-${index}`}
                    emptyState={{
                        title: "No recent inspections recorded",
                        description: "Logs will appear automatically when permits are scanned at checkpoints."
                    }}
                />
            </div>
        </div>
    );
};

export default InspectorDashboard;
