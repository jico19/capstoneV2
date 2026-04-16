import {
    CheckCircle,
    LayoutDashboard,
    Clock,
    TrendingUp,
    Eye,
    FileSignature,
    Search
} from "lucide-react";
import { useGetOPVDashboard } from "/src/hooks/useDashboard";
import KPICard from "/src/components/KPICard";
import BarChartComponent from "/src/components/charts/BarChart";
import { useApplication } from "/src/hooks/useApplications";
import { useNavigate } from "react-router-dom";
import StatusBadge from "/src/components/StatusBadge";
import DateFormatter from "/src/components/DateFormatter";
import ActionGroup from "/src/components/ActionButton";



/**
 * OPV Staff Dashboard
 * Flat UI implementation: sharp corners, strict typography, gray/white/semantic palette.
 * Now includes a fully flat Registry Table for application management.
 */
const OpvDashboard = () => {
    const { data: metrics, isLoading, isError } = useGetOPVDashboard();
    const { data: application, isLoading: ApplicationLoading, isError: ApplicationError } = useApplication();
    const navigate = useNavigate()


    if (isLoading || ApplicationLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4 animate-pulse">Syncing validation queue</p>
            </div>
        );
    }

    if (isError || !metrics || ApplicationError) {
        return (
            <div className="p-10 text-center text-red-700 bg-red-50 rounded-none border border-gray-200 font-black uppercase tracking-widest text-xs max-w-3xl mx-auto mt-10">
                Critical Error: Failed to fetch validation metrics.
            </div>
        );
    }

    const { kpis, charts } = metrics;

    return (
        <div className="p-8 space-y-12 font-sans rounded-none">
            {/* Flat Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 pb-10">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Veterinary Office Overview</p>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">OPV.Validation</h1>
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-none">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Current Cycle</p>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight mt-1">{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <KPICard
                    title="Awaiting Review"
                    value={kpis.waiting_for_opv}
                    subtitle="Applications in validation queue"
                    icon={Clock}
                    colorClass="bg-amber-50 text-amber-700"
                />
                <KPICard
                    title="Validated Today"
                    value={kpis.validated_today}
                    subtitle="Successfully processed within 24h"
                    icon={CheckCircle}
                    colorClass="bg-green-50 text-green-700"
                />
                <KPICard
                    title="Rejection Rate"
                    value={kpis.rejection_rate}
                    subtitle="Application quality tracking"
                    icon={TrendingUp}
                    colorClass="bg-red-50 text-red-700"
                    isPercent={true}
                />
            </div>

            {/* Validation History Chart */}
            <div className="bg-white border border-gray-200 p-10 rounded-none">
                <div className="mb-10 border-l-2 border-indigo-600 pl-6 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Workflow Statistics</p>
                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Daily.Throughput</h2>
                </div>
                <BarChartComponent
                    data={charts.validation_history}
                    xKey="date"
                    yKey="count"
                    height={350}
                    barColor="#16a34a"
                />
            </div>

            {/* Registry Table Section */}
            <div className="border  bg-white overflow-hidden rounded-none">
                {/* <div className="p-6 border-b  bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-900 text-white">
                            <Search size={16} />
                        </div>
                        <h3 className="font-black text-gray-900 uppercase tracking-tighter italic">Application.Registry</h3>
                    </div>
                </div> */}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="border-b text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5">System ID</th>
                                <th className="px-6 py-5">Payer.Name</th>
                                <th className="px-6 py-5 text-center">Status.Mix</th>
                                <th className="px-6 py-5 text-center">Schedule</th>
                                <th className="px-6 py-5 text-right pr-8">Audit.Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">

                            {(!application || application.length === 0) && (
                                <tr>
                                    <td colSpan="5">
                                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50">
                                            <FileSignature size={48} className="text-gray-200 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registry is empty</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {application?.map((data) => (
                                <tr key={data.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <span className="text-[11px] font-black text-gray-900 font-mono tracking-tight bg-gray-100 px-2 py-1 border border-gray-200">
                                            #{data.application_id}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-sm font-black text-gray-900 uppercase italic leading-none">{data.farmer_name}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Verified.Client</p>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <StatusBadge status={data.status} />
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">
                                                <DateFormatter date={data.transport_date} />
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right pr-8">
                                        <div className="flex justify-end">
                                            <ActionGroup
                                                buttons={[
                                                    {
                                                        icon: Eye,
                                                        label: "Review Audit",
                                                        onclick: () => navigate(`/opv/application/detail/${data.id}`),
                                                        disable: false
                                                    },
                                                ]}
                                            />
                                        </div>
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

export default OpvDashboard;