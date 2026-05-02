import { 
    FileText, 
    CircleCheck, 
    Clock, 
    LayoutDashboard,
    Plus
} from 'lucide-react';
import KPICard from '/src/components/KPICard';
import { useGetFarmerDashboard } from '/src/hooks/useDashboard';
import LineChartComponent from '/src/components/charts/LineChart';
import PieChartComponent from '/src/components/charts/PieChart';
import { Link } from 'react-router-dom';
import useAuthStore from '/src/store/authContext';


const FarmerDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetFarmerDashboard();
    const { user } = useAuthStore();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Opening your records...</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 text-red-700 border border-red-100 p-8 rounded-none flex items-center justify-center text-center font-black uppercase tracking-widest text-xs">
                    Something went wrong. Please refresh the page.
                </div>
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="flex-1 space-y-6 md:space-y-10 p-4 md:p-8 bg-white min-h-full">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-100 pb-6 md:pb-8 gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Welcome Back</p>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Hello, {user?.first_name || 'Farmer'}</h1>
                </div>
                
                {/* Mobile-optimized Primary Action */}
                <Link
                    to='/farmer/application/create/'
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-4 md:py-3 flex justify-center items-center gap-2 text-sm md:text-xs font-black uppercase tracking-widest rounded-none transition-colors"
                >
                    <Plus size={18} />
                    Start New Request
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <KPICard
                    title="All My Permits"
                    value={kpis.total_applications}
                    subtitle="History of your requests"
                    icon={FileText}
                    colorClass="bg-gray-50 text-gray-900"
                />
                <KPICard
                    title="Ready to Use"
                    value={kpis.active_permits}
                    subtitle="Approved and active"
                    icon={CircleCheck}
                    colorClass="bg-green-50 text-green-600"
                />
                <KPICard
                    title="Waiting for Payment"
                    value={kpis.pending_payments}
                    subtitle="Next step required"
                    icon={Clock}
                    colorClass="bg-amber-50 text-amber-600"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                {/* Transport Volume Trend */}
                <div className="bg-white border border-gray-100 p-6 md:p-10 rounded-none">
                    <div className="mb-8 border-l-4 border-green-600 pl-4 md:pl-6 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Activity</p>
                        <h2 className="text-xl font-black text-gray-900">Your Pig Transport History</h2>
                    </div>
                    <LineChartComponent
                        data={charts.transport_volume}
                        xKey="date"
                        yKey="total_pigs"
                        height={300}
                        lineColor="#16a34a"
                    />
                </div>

                {/* Personal Status Distribution */}
                <div className="bg-white border border-gray-100 p-6 md:p-10 rounded-none">
                    <div className="mb-8 border-l-4 border-gray-900 pl-4 md:pl-6 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Status Check</p>
                        <h2 className="text-xl font-black text-gray-900">Where Your Permits Are</h2>
                    </div>
                    <PieChartComponent 
                        data={charts.status_distribution}
                        nameKey="status"
                        valueKey="count"
                        height={300}
                    />
                </div>
            </div>

        </div>
    );
};

export default FarmerDashboard;