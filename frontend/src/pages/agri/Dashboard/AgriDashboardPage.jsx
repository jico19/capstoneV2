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
 * Redesigned for high-signal minimalism and full responsiveness.
 */
const AgriOfficerKPIDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetAgriDashboard()

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Syncing Operations...</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 text-red-700 border border-red-100 p-8 rounded-none flex flex-col items-center text-center">
                    <AlertCircle size={32} className="mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">System Error: Dashboard sync failed</p>
                </div>
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="flex-1 space-y-8 p-4 md:p-8 bg-white min-h-full">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-gray-100 pb-8 gap-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Management Overview</p>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Operations Summary</h1>
                </div>
                <div className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-none">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">System Date</p>
                    <p className="text-xs font-black text-gray-900 uppercase mt-1">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Manual Review"
                    value={kpis.pending_agri_review}
                    subtitle="Requires officer verification"
                    icon={AlertCircle}
                    colorClass="bg-red-50 text-red-600"
                />
                <KPICard
                    title="At OPV Stage"
                    value={kpis.currently_at_opv}
                    subtitle="Awaiting health certificate"
                    icon={Clock}
                    colorClass="bg-blue-50 text-blue-600"
                />
                <KPICard
                    title="Awaiting Payment"
                    value={kpis.awaiting_payment}
                    subtitle="Pending permit fee"
                    icon={CreditCard}
                    colorClass="bg-amber-50 text-amber-600"
                />
                <KPICard
                    title="Digital Verification"
                    value={kpis.digital_verification_rate}
                    subtitle="AI-assisted validation"
                    icon={TrendingUp}
                    colorClass="bg-green-50 text-green-600"
                    isPercent={true}
                />
            </div>

            {/* Main Visual Data Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Density Trend - Spans 2 cols on Large */}
                <div className="xl:col-span-2 bg-white border border-gray-100 p-6 md:p-10 rounded-none flex flex-col">
                    <div className="mb-8 border-l-4 border-green-600 pl-6">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Density Tracking</p>
                        <h2 className="text-xl font-black text-gray-900 uppercase">Barangay Trends</h2>
                    </div>
                    <LineChartComponent
                        data={charts.density_trend}
                        xKey="date"
                        yKey="avg"
                        height={350}
                    />
                </div>

                {/* Status Distribution */}
                <div className="bg-white border border-gray-100 p-6 md:p-10 rounded-none flex flex-col">
                    <div className="mb-8 border-l-4 border-gray-900 pl-6">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Application Breakdown</p>
                        <h2 className="text-xl font-black text-gray-900 uppercase">Status</h2>
                    </div>
                    <PieChartComponent 
                        data={charts.status_distribution}
                        nameKey="status"
                        valueKey="count"
                        height={350}
                    />
                </div>

                {/* Submission Rate - Full width on XL */}
                <div className="xl:col-span-3 bg-white border border-gray-100 p-6 md:p-10 rounded-none flex flex-col">
                    <div className="mb-8 border-l-4 border-blue-600 pl-6">
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Throughput Analysis</p>
                        <h2 className="text-xl font-black text-gray-900 uppercase">Submission Rate</h2>
                    </div>
                    <LineChartComponent
                        data={charts.submission_trend}
                        xKey="date"
                        yKey="count"
                        height={350}
                        lineColor="#2563eb"
                    />
                </div>
            </div>
        </div>
    );
};

export default AgriOfficerKPIDashboard;