import {
    CreditCard,
    AlertCircle,
    Clock,
    TrendingUp
} from 'lucide-react';
import KPICard from '/src/components/KPICard';
import { useGetAgriDashboard } from '/src/hooks/useDashboard';



const AgriOfficerKPIDashboard = () => {
    const { data: agri_metrics, isLoading, isError } = useGetAgriDashboard()

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <span className="loading loading-spinner loading-lg text-blue-600"></span>
                <p className="text-slate-500 font-medium animate-pulse">Loading your applications...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl flex items-center justify-center font-semibold">
                    Failed to load application data. Please refresh the page.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-scree p-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase">Operations Overview</h1>
                    <p className="text-gray-500 text-sm">Sariaya LivestockPass Management System</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">System Date</p>
                    <p className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* KPI Grid - Based on Model Statuses */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="OCR Manual Review"
                    value={agri_metrics.total_manual_ocr}
                    subtitle="Requires human verification of documents"
                    icon={AlertCircle}
                    colorClass="bg-red-50 text-red-600"
                />
                <KPICard
                    title="At OPV Stage"
                    value={agri_metrics.total_at_opv}
                    subtitle="Applications forwarded to OPV office"
                    icon={Clock}
                    colorClass="bg-blue-50 text-blue-600"
                />
                <KPICard
                    title="Awaiting Payment"
                    value={agri_metrics.total_awaiting_payment}
                    subtitle="Permit issued, waiting for fee"
                    icon={CreditCard}
                    colorClass="bg-yellow-50 text-yellow-600"
                />
                <KPICard
                    title="Automation Rate"
                    value={agri_metrics.automation_rate}
                    subtitle="Documents passed without override"
                    icon={TrendingUp}
                    colorClass="bg-green-50 text-green-600"
                    isPercent={true}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Breakdown Sidebar */}
            </div>
        </div>
    );
};

export default AgriOfficerKPIDashboard;