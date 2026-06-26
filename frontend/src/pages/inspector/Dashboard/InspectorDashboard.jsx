import {
    Scan,
    Calendar,
    ShieldCheck,
    Clock,
    History
} from "lucide-react";
import { useGetInspectorDashboard } from "/src/hooks/useDashboard";
import KPICard from "../../../components/ui/KPICard";
import BarChartComponent from "/src/components/charts/BarChart";
import LineChartComponent from "/src/components/charts/LineChart";


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
        <div className="mx-auto p-8 space-y-12 bg-gray-50 min-h-screen font-sans rounded-none">
            {/* Flat Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 pb-10">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Field Verification Hub</p>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">Inspector View</h1>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-none">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Duty Session</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-gray-200 p-10 rounded-none">
                    <div className="mb-10 border-l-2 border-blue-600 pl-6 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Activity Monitoring</p>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Scan History</h2>
                    </div>
                    <BarChartComponent
                        data={charts.activity_trend}
                        xKey="date"
                        yKey="count"
                        height={300}
                        barColor="#16a34a"
                    />
                </div>

                <div className="bg-white border border-gray-200 p-10 rounded-none">
                    <div className="mb-10 border-l-2 border-green-600 pl-6 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Shift Optimization</p>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Peak Activity</h2>
                    </div>
                    <LineChartComponent
                        data={charts.peak_activity}
                        xKey="hour"
                        yKey="count"
                        height={300}
                        lineColor="#15803d"
                    />
                    <p className="mt-4 text-[10px] font-medium text-gray-500 uppercase tracking-wide">Verification scans per hour (all-time).</p>
                </div>
            </div>

            {/* Recent Checkpoint Activity Ledger */}
            <div className="bg-white border border-gray-200 p-10 rounded-none">
                <div className="mb-8 border-l-2 border-indigo-600 pl-6 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Duty Ledger</p>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Recent Cargo Inspections</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Permit ID</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Scan Timestamp</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Destination</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Cargo Size</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {metrics.recent_activity?.length > 0 ? (
                                metrics.recent_activity.map((log, index) => (
                                    <tr key={`${log.application_id}-${index}`} className="hover:bg-gray-50/50">
                                        <td className="py-4 text-xs font-black text-blue-700 uppercase tracking-tight">{log.application_id}</td>
                                        <td className="py-4 text-xs text-gray-500 font-mono">{log.scanned_at}</td>
                                        <td className="py-4 text-xs font-bold text-gray-800 uppercase">{log.destination}</td>
                                        <td className="py-4 text-xs font-black text-gray-900 text-right">{log.total_pigs} pigs</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        No recent inspections recorded.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InspectorDashboard;
