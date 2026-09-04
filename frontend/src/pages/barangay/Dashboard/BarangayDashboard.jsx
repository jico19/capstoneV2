import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import useAuthStore from '../../../store/authStore';
import KPICard from '../../../components/ui/KPICard';
import BarChartComponent from '../../../components/charts/BarChart';
import LineChartComponent from '../../../components/charts/LineChart';
import { 
    Activity, 
    TrendingUp, 
    FileText, 
    Calendar,
    ArrowRight,
    MapPin,
    Shield,
    UploadCloud,
    History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SmartInsights from '../../../components/ui/SmartInsights';
import ChartTakeaway from '../../../components/ui/ChartTakeaway';
import { useGetDashboardInsights } from '../../../hooks/useDashboard';

const BarangayDashboard = () => {
    const { user } = useAuthStore();
    const { data: insightData, isLoading: isInsightLoading } = useGetDashboardInsights('Barangay');

    // Query for current density data of their barangay
    const { data: densityData = [], isLoading: isDensityLoading } = useQuery({
        queryKey: ['barangay-density-data'],
        queryFn: async () => {
            const res = await api.get('/hog-survey/survey_data/');
            return res.data;
        }
    });

    // Query for latest surveys of their barangay
    const { data: surveysData, isLoading: isSurveysLoading } = useQuery({
        queryKey: ['barangay-surveys-recent'],
        queryFn: async () => {
            const res = await api.get('/hog-survey/', {
                params: { limit: 10 } // load a few more to construct a nice trend
            });
            return res.data;
        }
    });

    const barangayStats = densityData[0] || {
        total_pigs: 0,
        density_level: 'None',
        breakdown: { inahin: 0, barako: 0, fattener: 0, grower: 0, bulaw: 0, starter: 0 }
    };

    const recentSurveys = surveysData?.results || [];

    const isPageLoading = isDensityLoading || isSurveysLoading;

    if (isPageLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
            </div>
        );
    }

    // Chart 1: Current Stage Breakdown mapping
    const stageChartData = [
        { type: 'Inahin', count: barangayStats.breakdown.inahin },
        { type: 'Barako', count: barangayStats.breakdown.barako },
        { type: 'Fattener', count: barangayStats.breakdown.fattener },
        { type: 'Grower', count: barangayStats.breakdown.grower },
        { type: 'Starter', count: barangayStats.breakdown.starter },
        { type: 'Bulaw', count: barangayStats.breakdown.bulaw },
    ];

    // Chart 2: Chronological order for the historical population trend chart
    const trendChartData = [...recentSurveys].reverse().map(s => ({
        date: s.survey_date,
        count: s.total_pigs
    }));

    return (
        <div className="p-4 md:p-8 space-y-8 bg-stone-50/50 min-h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-stone-200 pb-6 gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Barangay Official Panel</p>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-800 uppercase tracking-tighter mt-1">Hello, {user?.first_name || 'Official'}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <SmartInsights role="Barangay" title={`${user?.barangay_name || 'Barangay'} Swine Census & Movement Insights`} />
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200/50 px-4 py-2 text-green-800">
                        <MapPin size={16} />
                        <span className="text-xs font-black uppercase tracking-wider">{user?.barangay_name || 'Sariaya Barangay'}</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    title="Total Swine" 
                    value={barangayStats.total_pigs} 
                    subtitle="Current Headcount" 
                    icon={Activity} 
                    colorClass="bg-white text-stone-800 border-stone-200" 
                />
                <KPICard 
                    title="Density Level" 
                    value={barangayStats.density_level} 
                    subtitle="Risk Classification" 
                    icon={TrendingUp} 
                    colorClass={`${
                        barangayStats.density_level === 'Very High' || barangayStats.density_level === 'High'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                    }`} 
                />
                <KPICard 
                    title="Sows (Inahin)" 
                    value={barangayStats.breakdown.inahin} 
                    subtitle="Breeders" 
                    icon={Shield} 
                    colorClass="bg-blue-50 text-blue-700 border-blue-200" 
                />
                <KPICard 
                    title="Boars (Barako)" 
                    value={barangayStats.breakdown.barako} 
                    subtitle="Breeders" 
                    icon={Calendar} 
                    colorClass="bg-purple-50 text-purple-700 border-purple-200" 
                />
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribution Chart */}
                <div className="bg-white border border-stone-200 p-6 flex flex-col">
                    <div className="mb-6 border-l-4 border-green-700 pl-4">
                        <h2 className="text-[10px] font-black text-stone-800 uppercase tracking-widest">Swine Stage Breakdown</h2>
                        <p className="text-[10px] text-stone-400 font-medium mt-1">Current distribution of pigs by category in {user?.barangay_name}.</p>
                    </div>
                    <div className="flex-1 min-h-[250px] bg-white border border-stone-50 p-4">
                        {barangayStats.total_pigs > 0 ? (
                            <>
                                <BarChartComponent
                                    data={stageChartData}
                                    xKey="type"
                                    yKey="count"
                                    height={250}
                                    barColor="#15803d"
                                />
                                <ChartTakeaway
                                    takeaway={insightData?.chart_insights?.density_trend}
                                    isLoading={isInsightLoading}
                                />
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-stone-300 py-12">
                                <Activity size={48} className="mb-2" />
                                <p className="text-xs font-black uppercase tracking-wider">No survey data to display stages</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Historical Population Trend Chart */}
                <div className="bg-white border border-stone-200 p-6 flex flex-col">
                    <div className="mb-6 border-l-4 border-green-700 pl-4">
                        <h2 className="text-[10px] font-black text-stone-800 uppercase tracking-widest">Hog Population Trend</h2>
                        <p className="text-[10px] text-stone-400 font-medium mt-1">Chronological timeline of total counted hogs in your barangay.</p>
                    </div>
                    <div className="flex-1 min-h-[250px] bg-white border border-stone-50 p-4">
                        {trendChartData.length > 0 ? (
                            <>
                                <LineChartComponent
                                    data={trendChartData}
                                    xKey="date"
                                    yKey="count"
                                    height={250}
                                    lineColor="#15803d"
                                />
                                <ChartTakeaway
                                    takeaway={insightData?.chart_insights?.survey_velocity}
                                    isLoading={isInsightLoading}
                                />
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-stone-300 py-12">
                                <TrendingUp size={48} className="mb-2" />
                                <p className="text-xs font-black uppercase tracking-wider">No historical data to display trend</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Submissions Table & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Submissions Detailed Table */}
                <div className="lg:col-span-2 bg-white border border-stone-200 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex justify-between items-center">
                        <h2 className="text-[10px] font-black text-stone-800 uppercase tracking-widest">Recent Detailed Survey Logs</h2>
                        <Link to="/barangay/hog-surveys/" className="text-[10px] font-black text-green-700 uppercase tracking-widest flex items-center gap-1 hover:underline">
                            Manage All <ArrowRight size={12} />
                        </Link>
                    </div>
                    
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse text-xs font-semibold text-stone-700">
                            <thead className="bg-stone-50 border-b border-stone-100 text-[9px] font-black uppercase tracking-widest text-stone-500">
                                <tr>
                                    <th className="px-6 py-4">Survey Date</th>
                                    <th className="px-6 py-4 text-center">Inahin (Sow)</th>
                                    <th className="px-6 py-4 text-center">Barako (Boar)</th>
                                    <th className="px-6 py-4 text-center">Grow-Out Stage</th>
                                    <th className="px-6 py-4 text-center font-bold text-stone-800">Total Pigs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {recentSurveys.length > 0 ? (
                                    recentSurveys.slice(0, 5).map(s => {
                                        const growOutTotal = s.fattener + s.grower + s.starter + s.bulaw;
                                        return (
                                            <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-bold">{s.survey_date}</td>
                                                <td className="px-6 py-4 text-center">{s.inahin}</td>
                                                <td className="px-6 py-4 text-center">{s.barako}</td>
                                                <td className="px-6 py-4 text-center">{growOutTotal}</td>
                                                <td className="px-6 py-4 text-center font-black text-green-700 bg-green-50/20">{s.total_pigs}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-stone-300">
                                            <FileText size={32} className="mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">No recent surveys submitted</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Management Tasks */}
                <div className="bg-white border border-stone-200 p-6 space-y-4 h-fit">
                    <h2 className="text-[10px] font-black text-stone-800 uppercase tracking-widest border-b border-stone-100 pb-2">Quick Tasks</h2>
                    <div className="grid grid-cols-1 gap-2">
                        <Link 
                            to="/barangay/hog-surveys/" 
                            className="flex items-center justify-between p-3 border border-stone-200 hover:bg-stone-50 transition-colors font-bold text-xs uppercase text-stone-700"
                        >
                            <span className="flex items-center gap-2"><UploadCloud size={16} className="text-green-700" /> Collect / Add Survey</span>
                            <ArrowRight size={14} />
                        </Link>
                        <Link 
                            to="/barangay/audit-logs/" 
                            className="flex items-center justify-between p-3 border border-stone-200 hover:bg-stone-50 transition-colors font-bold text-xs uppercase text-stone-700"
                        >
                            <span className="flex items-center gap-2"><History size={16} className="text-amber-600" /> View Submission Logs</span>
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarangayDashboard;
