import {
    FileText,
    CircleCheck,
    Clock,
    Inbox,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import KPICard from '../../../components/ui/KPICard';
import { useGetFarmerDashboard, useGetDashboardInsights } from '../../../hooks/useDashboard';
import { Link } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';
import BarChartComponent from '../../../components/charts/BarChart';
import SmartInsights from '../../../components/ui/SmartInsights';
import ChartTakeaway from '../../../components/ui/ChartTakeaway';
import { ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const FarmerDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetFarmerDashboard();
    const { data: insightData, isLoading: isInsightLoading } = useGetDashboardInsights('Farmer');
    const { user, fetchUserProfile } = useAuthStore();
    const [showGateModal, setShowGateModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    const isVerified = user?.verification_status === 'VERIFIED';

    const handleRequestPermitClick = (e) => {
        if (!isVerified) {
            e.preventDefault();
            setShowGateModal(true);
        }
    };

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
        <div className="p-4 md:p-8 space-y-6 bg-stone-50/50 min-h-full">
            {/* KYC Status Notification Banner (GCash-style) */}
            {user?.verification_status === 'UNVERIFIED' && (
                <div className="bg-amber-50 border-2 border-amber-500 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-700 mt-0.5 flex-shrink-0" size={22} />
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-amber-900">
                                Account Status: Pending Document Verification
                            </p>
                            <p className="text-xs text-amber-800 mt-0.5">
                                You must upload your Handler's License, Transport License, and Trader's Pass to request livestock permits.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/farmer/verification"
                        className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors"
                    >
                        Upload Documents →
                    </Link>
                </div>
            )}

            {user?.verification_status === 'PENDING_REVIEW' && (
                <div className="bg-blue-50 border-2 border-blue-500 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Clock className="text-blue-700 mt-0.5 flex-shrink-0" size={22} />
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-blue-900">
                                Documents Under Review
                            </p>
                            <p className="text-xs text-blue-800 mt-0.5">
                                Your licenses are currently being reviewed by the Municipal Agriculture Office. Permits will unlock upon verification.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/farmer/verification"
                        className="px-4 py-2 border border-blue-400 bg-white hover:bg-blue-50 text-blue-800 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors"
                    >
                        View Submission
                    </Link>
                </div>
            )}

            {user?.verification_status === 'REJECTED' && (
                <div className="bg-red-50 border-2 border-red-500 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-red-700 mt-0.5 flex-shrink-0" size={22} />
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-red-900">
                                Verification Needs Correction
                            </p>
                            <p className="text-xs text-red-800 mt-0.5">
                                {user?.verification_remarks || "Some documents were rejected. Please upload updated copies."}
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/farmer/verification"
                        className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors"
                    >
                        Re-upload Documents →
                    </Link>
                </div>
            )}

            {/* Header with Quick Action */}
            <div className="border-b border-stone-200 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Welcome Back</p>
                        {isVerified && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-green-100 text-green-800">
                                <CheckCircle2 size={10} /> Fully Verified
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-800 uppercase tracking-tighter mt-0.5">
                        Hello, {user?.first_name || 'Farmer'}
                    </h1>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <SmartInsights role="Farmer" title="Personal Permit & Transit Insights" />
                    <Link
                        to="/farmer/application/create"
                        onClick={handleRequestPermitClick}
                        className="w-full sm:w-auto px-5 py-2.5 bg-green-700 hover:bg-green-600 active:bg-green-800 text-white text-[10px] font-black uppercase tracking-widest transition-colors rounded-none flex items-center justify-center gap-2"
                    >
                        <FileText size={14} />
                        Request New Permit
                    </Link>
                </div>
            </div>

            {/* Verification Gate Modal */}
            {showGateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
                    <div className="bg-white border-2 border-stone-900 max-w-md w-full p-6 space-y-5 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div className="bg-amber-100 p-3 text-amber-800">
                                <ShieldAlert size={28} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-stone-900 uppercase tracking-tight">
                                    Document Verification Required
                                </h3>
                                <p className="text-xs text-stone-500 font-medium leading-relaxed">
                                    Before submitting livestock transport permits, municipal regulations require a verified Handler's License, Transport License, and Trader's Pass on file.
                                </p>
                            </div>
                        </div>

                        <div className="bg-stone-50 border border-stone-200 p-3 space-y-1.5 text-xs text-stone-700">
                            <p className="font-bold text-[10px] uppercase tracking-wider text-stone-500">Required Standing Licenses:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>Handler's License (BAI)</li>
                                <li>Transport License / Vehicle OR-CR</li>
                                <li>Trader's Pass (Sariaya LGU)</li>
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowGateModal(false)}
                                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-black uppercase tracking-widest hover:bg-stone-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowGateModal(false);
                                    navigate('/farmer/verification');
                                }}
                                className="px-5 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-black uppercase tracking-widest shadow-md"
                            >
                                Upload Documents Now →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards (2 columns on mobile, 3 on tablet/desktop) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <KPICard title="All Permits" value={kpis.total_applications} subtitle="Request history" icon={FileText} colorClass="bg-white text-stone-800 border-stone-200" />
                <KPICard title="Ready to Use" value={kpis.active_permits} subtitle="Approved/Active" icon={CircleCheck} colorClass="bg-green-50 text-green-700 border-green-600" />
                <div className="col-span-2 sm:col-span-1">
                    <KPICard title="Pending Pay" value={kpis.pending_payments} subtitle="Payment required" icon={Clock} colorClass="bg-amber-50 text-amber-700 border-amber-600" />
                </div>
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
                        <ChartTakeaway
                            takeaway={insightData?.chart_insights?.transport_volume}
                            isLoading={isInsightLoading}
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

                    {/* Status Distribution & Approval Takeaway */}
                    {insightData?.chart_insights?.status_distribution && (
                        <div className="p-3 bg-white border-t border-stone-100">
                            <ChartTakeaway
                                takeaway={insightData?.chart_insights?.status_distribution}
                                isLoading={isInsightLoading}
                                className="!mt-0"
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default FarmerDashboard;