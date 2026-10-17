import { Link } from "react-router-dom";
import {
    Scan,
    Calendar,
    ShieldCheck,
    QrCode,
    History,
    ArrowRight,
    MapPin,
    Truck,
    Clock
} from "lucide-react";
import { useGetInspectorDashboard, useGetDashboardInsights } from '../../../hooks/useDashboard';
import KPICard from "../../../components/ui/KPICard";
import BarChartComponent from '../../../components/charts/BarChart';
import LineChartComponent from '../../../components/charts/LineChart';
import ChartTakeaway from '../../../components/ui/ChartTakeaway';
import DataTable from '../../../components/ui/DataTable';

const InspectorDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetInspectorDashboard();
    const { data: insightData, isLoading: isInsightLoading } = useGetDashboardInsights('Inspector');

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[360px] bg-white rounded-xl border border-stone-200 m-4 p-8">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4 animate-pulse">
                    Syncing checkpoint activity...
                </p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="m-4 p-6 text-center bg-red-50 rounded-xl border border-red-200">
                <p className="text-xs font-black text-red-700 uppercase tracking-widest">
                    Connection Error: Failed to sync Inspector logs.
                </p>
                <p className="text-[11px] text-stone-500 font-medium mt-1">
                    Please check your network connection and reload.
                </p>
            </div>
        );
    }

    const { kpis, charts } = metrics;
    const recentActivity = metrics.recent_activity || [];

    return (
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-stone-50 min-h-screen font-sans">
            {/* Header & Quick Status */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-stone-200 p-4 sm:p-6 rounded-xl shadow-xs">
                <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-200 inline-block">
                        Checkpoint Station
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-black text-stone-900 uppercase tracking-tight">
                        Inspector Portal
                    </h1>
                    <p className="text-xs text-stone-500 font-medium">
                        Live livestock transport verification & cargo checkpoint logs
                    </p>
                </div>
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                    <div className="bg-stone-50 border border-stone-200 px-3 py-2 rounded-lg text-left sm:text-right flex-1 sm:flex-initial">
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">Duty Date</span>
                        <span className="text-xs font-black text-stone-800 font-mono">
                            {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Field Primary Action: Tap to Scan */}
            <div className="bg-gradient-to-r from-green-800 to-green-700 text-white rounded-xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-green-300" />
                        <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                            Verify Livestock Transport
                        </h2>
                    </div>
                    <p className="text-xs text-green-100 max-w-md">
                        Scan incoming truck QR permit to inspect animal count, origin barangay, and veterinary clearances.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Link
                        to="/inspector/scan/"
                        className="flex-1 sm:flex-initial h-12 px-6 bg-white hover:bg-stone-100 text-green-800 font-black text-xs uppercase tracking-widest rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        <Scan size={16} /> Open Scanner
                    </Link>
                    <Link
                        to="/inspector/history/"
                        className="h-12 px-4 bg-green-800/80 hover:bg-green-850 text-white border border-green-600/40 font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        title="View Scan Logs"
                    >
                        <History size={16} />
                        <span className="hidden sm:inline">Logs</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards: Responsive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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

            {/* Verification Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-xl shadow-xs">
                    <div className="mb-4 border-l-3 border-green-700 pl-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Activity Monitoring</span>
                        <h2 className="text-base sm:text-lg font-black text-stone-900 uppercase tracking-tight">Recent Scan Trend</h2>
                    </div>
                    <div className="w-full overflow-hidden">
                        <BarChartComponent
                            data={charts.activity_trend}
                            xKey="date"
                            yKey="count"
                            height={240}
                            barColor="#15803d"
                        />
                    </div>
                    <ChartTakeaway
                        takeaway={insightData?.chart_insights?.activity_trend}
                        isLoading={isInsightLoading}
                    />
                </div>

                <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-xl shadow-xs">
                    <div className="mb-4 border-l-3 border-sky-600 pl-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Shift Optimization</span>
                        <h2 className="text-base sm:text-lg font-black text-stone-900 uppercase tracking-tight">Peak Checkpoint Hours</h2>
                    </div>
                    <div className="w-full overflow-hidden">
                        <LineChartComponent
                            data={charts.peak_activity}
                            xKey="hour"
                            yKey="count"
                            height={240}
                            lineColor="#15803d"
                        />
                    </div>
                    <ChartTakeaway
                        takeaway={insightData?.chart_insights?.peak_activity}
                        isLoading={isInsightLoading}
                    />
                </div>
            </div>

            {/* Recent Checkpoint Activity: Mobile Cards on Small Screens, DataTable on md+ */}
            <div className="bg-white border border-stone-200 rounded-xl shadow-xs p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="border-l-3 border-green-700 pl-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Duty Ledger</span>
                        <h2 className="text-base sm:text-lg font-black text-stone-900 uppercase tracking-tight">Recent Cargo Inspections</h2>
                    </div>
                    <Link
                        to="/inspector/history/"
                        className="text-xs font-bold text-green-700 hover:text-green-800 flex items-center gap-1"
                    >
                        All Logs <ArrowRight size={14} />
                    </Link>
                </div>

                {/* Mobile View: Cards (avoids 600px horizontal scroll leak) */}
                <div className="block md:hidden space-y-3">
                    {recentActivity.length > 0 ? (
                        recentActivity.map((log, index) => (
                            <div
                                key={`${log.application_id}-${index}`}
                                className="border border-stone-200 p-3.5 rounded-lg bg-stone-50/50 space-y-2.5"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-mono font-black text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                                        {log.application_id}
                                    </span>
                                    <span className="text-xs font-black text-stone-900 bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                                        {log.total_pigs} pigs
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-stone-700">
                                    <MapPin size={13} className="text-stone-400 shrink-0" />
                                    <span className="font-bold uppercase truncate">{log.destination}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-500 pt-1 border-t border-stone-200/60">
                                    <Clock size={11} className="text-stone-400 shrink-0" />
                                    <span>{log.scanned_at}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-stone-400 text-xs">
                            No checkpoint scans recorded yet today.
                        </div>
                    )}
                </div>

                {/* Desktop View: DataTable */}
                <div className="hidden md:block">
                    <DataTable
                        columns={[
                            {
                                header: "Permit ID",
                                render: (log) => (
                                    <span className="text-xs font-mono font-black text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
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
                        data={recentActivity}
                        minWidth="100%"
                        keyField={(log, index) => `${log.application_id}-${index}`}
                        emptyState={{
                            title: "No recent inspections recorded",
                            description: "Logs will appear automatically when permits are scanned at checkpoints."
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default InspectorDashboard;
