import { useNavigate } from "react-router-dom";
import { Eye, Inbox, FileText, AlertCircle, Clock, CheckCircle } from "lucide-react";
import DateFormatter from "/src/components/DateFormatter";
import ActionGroup from "/src/components/ActionButton";
import StatusBadge from "/src/components/StatusBadge";
import { useApplication } from "/src/hooks/useApplications";
import { useState, useMemo } from "react";
import Pagination from "/src/components/Pagination";
import KPICard from "/src/components/KPICard";

/**
 * Agri Application Dashboard
 * Redesigned for better workflow management and Farmer-Friendly simplicity.
 */
const ApplicationDashboard = () => {
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const { data, isLoading, isError } = useApplication(limit, offset);
    const navigate = useNavigate();

    const applications = data?.results || [];
    const count = data?.count || 0;

    // Workflow Summary logic
    const summary = useMemo(() => {
        if (!applications) return { needsReview: 0, pendingPayment: 0, completed: 0 };
        return {
            needsReview: applications.filter(app => ['MANUAL', 'PENDING_AGRI'].includes(app.status)).length,
            atHealthOffice: applications.filter(app => ['PENDING_OPV', 'OPV_VALIDATED'].includes(app.status)).length,
            readyForPermit: applications.filter(app => ['PAID', 'RELEASED'].includes(app.status)).length
        };
    }, [applications]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Opening Registry...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 text-red-600 border border-red-100 p-8 rounded-none flex items-center justify-center text-center font-black uppercase tracking-widest text-xs">
                    Failed to load application data. Please refresh.
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 md:p-8 space-y-8 bg-white min-h-full font-sans">
            
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Official Registry</p>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Permit Management</h1>
                    <p className="text-sm text-gray-500 font-medium">Review and process livestock transport requests</p>
                </div>
            </div>

            {/* 2. Workflow Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <KPICard
                    title="Needs Your Check"
                    value={summary.needsReview}
                    subtitle="Requires officer review"
                    icon={AlertCircle}
                    colorClass="bg-red-50 text-red-600"
                />
                <KPICard
                    title="At Health Office"
                    value={summary.atHealthOffice}
                    subtitle="Awaiting OPV validation"
                    icon={Clock}
                    colorClass="bg-blue-50 text-blue-600"
                />
                <KPICard
                    title="Permits Ready"
                    value={summary.readyForPermit}
                    subtitle="Finalized and released"
                    icon={CheckCircle}
                    colorClass="bg-green-50 text-green-600"
                />
            </div>

            {/* 3. Table Container */}
            <div className="bg-white border border-gray-100 rounded-none overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5">ID Number</th>
                                <th className="px-6 py-5">Farmer Name</th>
                                <th className="px-6 py-5 text-center">Permit Status</th>
                                <th className="px-6 py-5">Travel Date</th>
                                <th className="px-6 py-5 text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">

                            {/* Empty State */}
                            {applications.length === 0 && (
                                <tr>
                                    <td colSpan="5">
                                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50">
                                            <Inbox size={48} className="text-gray-300 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Registry is empty</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Data Mapping */}
                            {applications.map((data) => (
                                <tr key={data.id} className="hover:bg-gray-50 transition-colors group">
                                    {/* ID Badge */}
                                    <td className="px-6 py-5">
                                        <span className="text-[11px] font-black text-gray-900 font-mono tracking-tight bg-gray-50 px-2 py-1 border border-gray-200">
                                            {data.application_id}
                                        </span>
                                    </td>

                                    {/* Farmer Details */}
                                    <td className="px-6 py-5">
                                        <span className="text-sm font-black text-gray-900 uppercase leading-none">{data.farmer_name}</span>
                                    </td>

                                    {/* Status Badge */}
                                    <td className="px-6 py-5 text-center">
                                        <StatusBadge status={data.status} />
                                    </td>

                                    {/* Date */}
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                            <DateFormatter date={data.transport_date} />
                                        </span>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-5 text-right pr-8">
                                        <ActionGroup
                                            buttons={[
                                                {
                                                    icon: Eye,
                                                    label: "Check",
                                                    onclick: () => navigate(`detail/${data.id}`),
                                                    disable: false
                                                },
                                            ]}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    count={count} 
                    limit={limit} 
                    offset={offset} 
                    onPageChange={setOffset} 
                />
            </div>
        </div>
    );
};

export default ApplicationDashboard;