import { 
    FileText, 
    CircleCheck, 
    Clock, 
    LayoutDashboard
} from 'lucide-react';
import KPICard from '/src/components/KPICard';
import { useGetFarmerDashboard } from '/src/hooks/useDashboard';
import LineChartComponent from '/src/components/charts/LineChart';
import PieChartComponent from '/src/components/charts/PieChart';
import { Link } from 'react-router-dom';


const FarmerDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetFarmerDashboard();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4 animate-pulse">Syncing personal records</p>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-red-50 text-red-700 border border-gray-200 p-8 rounded-none flex items-center justify-center font-black uppercase tracking-widest text-xs">
                    Error: Dashboard sync failed.
                </div>
            </div>
        );
    }

    const { kpis, charts, recent_applications } = metrics;

    return (
        <div className="p-8 space-y-12 font-sans rounded-none">
            {/* Flat Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-10 gap-6">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Farmer Dashboard</p>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">Farmer.Stats</h1>
                </div>
                {/* Plain Tailwind Button - No border radius, no DaisyUI btn class */}
                <Link
                    to='/farmer/application/create/'
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-xs font-black uppercase tracking-wider rounded-none transition-colors"
                >
                    New Application
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Total Applications"
                    value={kpis.total_applications}
                    subtitle="Lifetime submissions"
                    icon={FileText}
                    colorClass="bg-gray-100 text-gray-900"
                />
                <KPICard
                    title="Active Permits"
                    value={kpis.active_permits}
                    subtitle="Ready for transport"
                    icon={CircleCheck}
                    colorClass="bg-green-50 text-green-700"
                />
                <KPICard
                    title="Pending Payments"
                    value={kpis.pending_payments}
                    subtitle="Requires your action"
                    icon={Clock}
                    colorClass="bg-amber-50 text-amber-700"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Transport Volume Trend */}
                <div className="bg-white border border-gray-200 p-10 rounded-none">
                    <div className="mb-10 border-l-2 border-green-600 pl-6 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Production Tracking</p>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Transport.Volume</h2>
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
                <div className="bg-white border border-gray-200 p-10 rounded-none">
                    <div className="mb-10 border-l-2 border-gray-900 pl-6 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Status Mix</p>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Current.Mix</h2>
                    </div>
                    <PieChartComponent 
                        data={charts.status_distribution}
                        nameKey="status"
                        valueKey="count"
                        height={300}
                    />
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none italic">Recent.Activity</h3>
                    <Link to="/farmer/application" className="text-[10px] font-black text-green-600 uppercase tracking-widest border-b-2 border-green-600">View All</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5">System ID</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right">Updated At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recent_applications.map((app, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-5 font-black text-gray-900 text-sm tracking-tight font-mono">{app.application_id}</td>
                                    <td className="px-6 py-5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-200 px-2 py-1">
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right text-gray-500 text-xs font-bold uppercase tracking-widest">
                                        {new Date(app.updated_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FarmerDashboard;