import { useMemo } from "react";
import { Link, replace, useNavigate } from "react-router-dom";
import { useApplication } from "/src/hooks/useApplications";
import {
    Plus,
    MapPin, Inbox, FileText, CircleCheck, AlertCircle,
    HandCoins,
    Eye,
    ArrowDown
} from "lucide-react";
import ActionGroup from "/src/components/ActionButton";
import DateFormatter from "/src/components/DateFormatter";
import StatusBadge from "/src/components/StatusBadge";
import KPICard from "/src/components/KPICard";



/**
 * Farmer Application List Dashboard
 * Refined to follow strict Flat UI guidelines: no rounded corners, plain Tailwind buttons.
 */
const FarmerApplicationDashboard = () => {
    const { data: application, isLoading, isError } = useApplication();
    const navigate = useNavigate();


    const summary = useMemo(() => {
        if (!application) return { total: 0, active: 0, pending: 0 };

        return {
            total: application.length,
            // Considers PAID or RELEASED as an active permit
            active: application.filter(app => ['PAID', 'RELEASED'].includes(app.status)).length,
            // Considers PAYMENT_PENDING or DRAFT as requiring user action
            pending: application.filter(app => ['PAYMENT_PENDING', 'DRAFT'].includes(app.status)).length
        };
    }, [application]);


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4 animate-pulse">Syncing applications</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-red-50 text-red-700 border border-gray-200 p-8 rounded-none flex items-center justify-center font-black uppercase tracking-widest text-xs">
                    Failed to load application data.
                </div>
            </div>
        );
    }


    return (
        <div className="max-w-7xl mx-auto p-8 space-y-12 bg-white min-h-screen font-sans rounded-none">

            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-gray-200 pb-10">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none">Management Registry</p>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">Applications.Registry</h1>
                </div>
                <Link
                    to='/farmer/application/create/'
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-xs font-black uppercase tracking-wider rounded-none transition-colors flex items-center gap-2"
                >
                    <Plus size={14} strokeWidth={3} /> New Application
                </Link>
            </div>

            {/* 2. Dynamic Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Total History"
                    value={summary.total}
                    subtitle="All time submissions"
                    icon={FileText}
                    colorClass="bg-gray-100 text-gray-900"
                />

                <KPICard
                    title="Active.Permits"
                    value={summary.active}
                    subtitle="Valid and released documents"
                    icon={CircleCheck}
                    colorClass="bg-green-50 text-green-700"
                />

                <KPICard
                    title="Pending.Action"
                    value={summary.pending}
                    subtitle="Requiring your attention"
                    icon={AlertCircle}
                    colorClass="bg-amber-50 text-amber-700"
                />
            </div>

            {/* 3. Table Container */}
            <div className="bg-white border border-gray-200 rounded-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5">System ID</th>
                                <th className="px-6 py-5">Transport Details</th>
                                <th className="px-6 py-5 text-center">Status</th>
                                <th className="px-6 py-5">Schedule</th>
                                <th className="px-6 py-5 text-right pr-8">Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">

                            {/* Empty State Handle */}
                            {(!application || application.length === 0) && (
                                <tr>
                                    <td colSpan="5">
                                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50">
                                            <Inbox size={48} className="text-gray-200 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registry is empty</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Data Mapping */}
                            {application?.map((data) => (
                                <tr key={data.id} className="hover:bg-gray-50/50 transition-colors group border-gray-100">

                                    {/* ID Badge */}
                                    <td className="px-6 py-5">
                                        <span className="text-[11px] font-black text-gray-900 font-mono tracking-tight bg-gray-100 px-2 py-1 border border-gray-200">
                                            {data.application_id}
                                        </span>
                                    </td>

                                    {/* Grouped Details */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-sm font-black text-gray-900 uppercase italic leading-none">{data.farmer_name}</span>
                                            {data.destination && (
                                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-widest leading-none">
                                                    <MapPin size={10} className="text-green-600" /> {data.destination}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Status Badge */}
                                    <td className="px-6 py-5 text-center">
                                        <StatusBadge status={data.status} />
                                    </td>

                                    {/* Date */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-gray-700 uppercase tracking-tight">
                                                <DateFormatter date={data.transport_date} />
                                            </span>
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-5 text-right pr-8">
                                        <ActionGroup
                                            buttons={[
                                                {
                                                    icon: Eye,
                                                    label: "View",
                                                    onclick: () => navigate(`/farmer/application/detail/${data.id}`),
                                                    disable: false
                                                },
                                                {
                                                    icon: HandCoins,
                                                    label: "Pay",
                                                    onclick: () => navigate(`/farmer/payment/checkout/${data.id}`),
                                                    disable: data.status !== 'PAYMENT_PENDING'
                                                },
                                                {
                                                    icon: ArrowDown,
                                                    label: "Permit",
                                                    onclick: () => navigate(`/farmer/application/download/${data.id}`),
                                                    disable: !['PAID', 'RELEASED'].includes(data.status)
                                                },
                                            ]}

                                        />
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

export default FarmerApplicationDashboard;