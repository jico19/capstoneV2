import {
    FileText,
    CircleCheck,
    Clock,
    Inbox,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import KPICard from '../../../components/ui/KPICard';
import { useGetFarmerDashboard } from '/src/hooks/useDashboard';
import { Link } from 'react-router-dom';
import useAuthStore from '/src/store/authContext';
import BarChartComponent from '/src/components/charts/BarChart';

const FarmerDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetFarmerDashboard();
    const { user } = useAuthStore();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
            </div>
        );
    }

    if (isError || !metrics) {
        return (
            <div className="p-4">
                <div className="bg-red-50 text-red-700 border border-red-200 p-8 text-center font-black uppercase tracking-widest text-xs">
                    Something went wrong. Please refresh.
                </div>
            </div>
        );
    }

    const { kpis, charts, recent_applications } = metrics;

    return (
        <div className="p-4 md:p-8 space-y-8 bg-stone-50/50 min-h-full">
            {/* Header */}
            <div className="border-b border-stone-200 pb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Welcome Back</p>
                <h1 className="text-2xl md:text-3xl font-black text-stone-800 uppercase tracking-tighter mt-1">Hello, {user?.first_name || 'Farmer'}</h1>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard title="All Permits" value={kpis.total_applications} subtitle="Request history" icon={FileText} colorClass="bg-white text-stone-800 border-stone-200" />
                <KPICard title="Ready to Use" value={kpis.active_permits} subtitle="Approved/Active" icon={CircleCheck} colorClass="bg-green-50 text-green-700 border-green-600" />
                <KPICard title="Pending Pay" value={kpis.pending_payments} subtitle="Payment required" icon={Clock} colorClass="bg-amber-50 text-amber-700 border-amber-600" />
            </div>

            {/* Dashboard Visual Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Transport History Chart */}
                <div className="lg:col-span-2 bg-white border border-stone-200 p-6 flex flex-col">
                    <div className="mb-6 border-l-4 border-green-700 pl-4">
                        <h2 className="text-[10px] font-black text-stone-800 uppercase tracking-widest">Swine Shipped History</h2>
                        <p className="text-[10px] text-stone-400 font-medium mt-1">Monthly headcount of pigs transported under released permits.</p>
                    </div>
                    <div className="flex-1 min-h-[250px] bg-white border border-stone-50 p-4">
                        <BarChartComponent
                            data={charts.transport_volume}
                            xKey="date"
                            yKey="total_pigs"
                            height={250}
                            barColor="#15803d"
                        />
                    </div>
                </div>

                {/* Recent Apps */}
                <section className="bg-white border border-stone-200 overflow-hidden flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex justify-between items-center">
                        <h2 className="text-[10px] font-black text-stone-800 uppercase tracking-widest">Recent Applications</h2>
                        <Link to="/farmer/application" className="text-[10px] font-black text-green-700 uppercase tracking-widest flex items-center gap-1 hover:underline">
                            View All <ArrowRight size={12} />
                        </Link>
                    </div>

                    <div className="divide-y divide-stone-100 flex-1 overflow-auto">
                        {recent_applications?.length > 0 ? (
                            recent_applications.map(app => (
                                <Link key={app.id} to={`/farmer/application/detail/${app.id}`} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-stone-900 truncate uppercase tracking-tight">{app.application_id}</p>
                                        <p className="text-[10px] font-medium text-stone-500 mt-0.5">{app.transport_date}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="hidden sm:block text-[9px] font-black uppercase bg-stone-100 px-2 py-0.5 text-stone-600">
                                            {app.status}
                                        </span>
                                        <ChevronRight size={16} className="text-stone-300" />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center h-full text-stone-300">
                                <Inbox size={32} />
                                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-stone-400">No recent applications</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default FarmerDashboard;