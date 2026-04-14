import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApplication } from "/src/hooks/useApplications";
import {
    ArrowDown, Eye, HandCoins, Plus,
    MapPin, Inbox, FileText, CircleCheck, AlertCircle
} from "lucide-react";
import ActionGroup from "/src/components/ActionButton";
import DateFormatter from "/src/components/DateFormatter";
import StatusBadge from "/src/components/StatusBadge";
import KPICard from "/src/components/KPICard";

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

    // ==========================================
    // Loading & Error States
    // ==========================================
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
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">

            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Overview</h1>
                    <p className="text-sm text-slate-500 mt-1">Welcome back. Here is the status of your transport permits.</p>
                </div>
                <Link
                    to='/farmer/application/create/'
                    className="btn bg-green-600 hover:bg-green-700 text-white border-none gap-2 px-6"
                >
                    <Plus size={18} /> New Application
                </Link>
            </div>

            {/* 2. Dynamic Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

                <KPICard
                    title="Total Applications"
                    value={summary.total}
                    subtitle="Your applications"
                    icon={FileText}
                    colorClass="bg-green-50 text-green-600"
                />

                <KPICard
                    title="Active Permits"
                    value={summary.active}
                    subtitle="Your active applications"
                    icon={CircleCheck}
                    colorClass="bg-green-50 text-green-600"
                />

                <KPICard
                    title="Pernding Applications"
                    value={summary.pending}
                    subtitle="Your applications"
                    icon={AlertCircle}
                    colorClass="bg-amber-100 text-amber-600"
                />

            </div>

            {/* 3. Table Container */}
            <div className="bg-white border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                            <tr>
                                <th className="p-5 font-bold">Application ID</th>
                                <th className="p-5 font-bold">Details</th>
                                <th className="p-5 font-bold text-center">Status</th>
                                <th className="p-5 font-bold">Transport Date</th>
                                <th className="p-5 font-bold text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">

                            {/* Empty State Handle */}
                            {(!application || application.length === 0) && (
                                <tr>
                                    <td colSpan="5">
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                            <Inbox size={48} className="mb-4 opacity-20" />
                                            <p className="text-sm font-medium">No applications found.</p>
                                            <p className="text-xs mt-1">Click "New Application" to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {/* Data Mapping */}
                            {application?.map((data) => (
                                <tr key={data.id} className="hover:bg-slate-50 transition-colors group">

                                    {/* Styled ID Badge */}
                                    <td className="p-5">
                                        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-mono text-xs font-bold rounded-md border border-slate-200">
                                            {data.application_id}
                                        </span>
                                    </td>

                                    {/* Grouped Details (Farmer + Destination if available) */}
                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{data.farmer_name}</span>
                                            {data.destination && (
                                                <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <MapPin size={12} className="text-slate-400" /> {data.destination}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Status Badge */}
                                    <td className="p-5 text-center">
                                        <StatusBadge status={data.status} />
                                    </td>

                                    {/* Date */}
                                    <td className="p-5 text-sm font-semibold text-slate-600">
                                        <DateFormatter date={data.transport_date} />
                                    </td>

                                    {/* Actions */}
                                    <td className="p-5 text-right pr-6">
                                        <div className="flex justify-end">
                                            <ActionGroup
                                                buttons={[
                                                    {
                                                        icon: Eye,
                                                        label: "View",
                                                        onclick: () => navigate(`application/detail/${data.id}`),
                                                        disable: false
                                                    },
                                                    {
                                                        icon: HandCoins,
                                                        label: "Pay",
                                                        // Actually route to the payment page we created!
                                                        onclick: () => navigate(`payment/checkout/${data.id}`),
                                                        disable: data.status !== 'PAYMENT_PENDING'
                                                    },
                                                    {
                                                        icon: ArrowDown,
                                                        label: "Permit",
                                                        onclick: () =>  navigate(`applicaation/download/${data.id}`),
                                                        disable: !['PAID', 'RELEASED'].includes(data.status)
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

export default FarmerApplicationDashboard;