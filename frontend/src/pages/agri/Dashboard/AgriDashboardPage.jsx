import {
    CreditCard,
    AlertCircle,
    Clock,
    TrendingUp
} from 'lucide-react';
import KPICard from '/src/components/KPICard';
import { useGetAgriDashboard } from '/src/hooks/useDashboard';
import LineChartComponent from '/src/components/charts/LineChart';
import PieChartComponent from '/src/components/charts/PieChart';


/**
 * Agriculture Officer Dashboard
 * Strictly adheres to Flat UI, minimalist typography, and the strict color palette.
 */
const AgriOfficerKPIDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetAgriDashboard()

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4 animate-pulse">Syncing operations</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-red-50 text-red-700 border border-gray-200 p-8 rounded-none flex flex-col items-center space-y-2">
                    <AlertCircle size={32} />
                    <p className="text-sm font-black uppercase tracking-widest leading-none mt-2">Critical: Dashboard data sync failed.</p>
                </div>
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="min-h-screen p-8 space-y-12 font-sans rounded-none">
            {/* Flat Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-10 gap-6">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Management System Overview</p>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">Operations.Summary</h1>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-none">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">System.Date</p>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight mt-1">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* KPI Grid - No Gap for strict flat aesthetic */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Manual Review"
                    value={kpis.pending_agri_review}
                    subtitle="Requires officer verification"
                    icon={AlertCircle}
                    colorClass="bg-red-50 text-red-700"
                />
                <KPICard
                    title="At OPV Stage"
                    value={kpis.currently_at_opv}
                    subtitle="Awaiting health certificate"
                    icon={Clock}
                    colorClass="bg-blue-50 text-blue-700"
                />
                <KPICard
                    title="Awaiting Payment"
                    value={kpis.awaiting_payment}
                    subtitle="Pending permit fee"
                    icon={CreditCard}
                    colorClass="bg-yellow-50 text-yellow-700"
                />
                <KPICard
                    title="Automation Rate"
                    value={kpis.automation_rate}
                    subtitle="OCR performance without override"
                    icon={TrendingUp}
                    colorClass="bg-green-50 text-green-700"
                    isPercent={true}
                />
            </div>

            {/* Content Sections */}
            <div className="space-y-12">
                {/* Section: Density Trend */}
                <div className="bg-white border border-gray-200 p-10 rounded-none">
                    <div className="mb-10 border-l-2 border-green-600 pl-6 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Barangay Data Tracking</p>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Density.Trends</h2>
                    </div>
                    <LineChartComponent
                        data={charts.density_trend}
                        xKey="date"
                        yKey="avg"
                        height={350}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Status Distribution */}
                    <div className="bg-white border border-gray-200 p-10 rounded-none">
                        <div className="mb-10 border-l-2 border-gray-900 pl-6 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Application Breakdown</p>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Status.Mix</h2>
                        </div>
                        <PieChartComponent 
                            data={charts.status_distribution}
                            nameKey="status"
                            valueKey="count"
                            height={300}
                        />
                    </div>

                    {/* Submission History */}
                    <div className="bg-white border border-gray-200 p-10 rounded-none">
                        <div className="mb-10 border-l-2 border-blue-600 pl-6 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Monthly Throughput</p>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Submission.Rate</h2>
                        </div>
                        <LineChartComponent
                            data={charts.submission_trend}
                            xKey="date"
                            yKey="count"
                            height={300}
                            lineColor="#2563eb"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgriOfficerKPIDashboard;