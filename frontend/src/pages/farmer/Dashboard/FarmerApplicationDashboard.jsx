import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import Pagination from "/src/components/Pagination";

/**
 * Farmer Application List Dashboard
 * Friendly-first design with simple language and high visibility.
 */
const FarmerApplicationDashboard = () => {
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const { data, isLoading, isError } = useApplication(limit, offset);
    const navigate = useNavigate();

    const applications = data?.results || [];
    const count = data?.count || 0;

    const summary = useMemo(() => {
        if (!applications) return { total: 0, active: 0, pending: 0 };

        return {
            total: count,
            active: applications.filter(app => ['PAID', 'RELEASED'].includes(app.status)).length,
            pending: applications.filter(app => ['PAYMENT_PENDING', 'DRAFT'].includes(app.status)).length
        };
    }, [applications, count]);


    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Opening your requests...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 md:p-8">
                <div className="bg-red-50 text-red-700 border border-red-100 p-8 rounded-none flex items-center justify-center text-center font-black uppercase tracking-widest text-xs">
                    Failed to load your requests. Please refresh.
                </div>
            </div>
        );
    }


    return (
        <div className="flex-1 p-4 md:p-8 space-y-8 bg-white min-h-full font-sans rounded-none">

            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-6 md:pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Your Records</p>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Your Permit Requests</h1>
                </div>
                <Link
                    to='/farmer/application/create/'
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-4 md:py-3 text-sm md:text-xs font-black uppercase tracking-widest rounded-none transition-colors flex justify-center items-center gap-2"
                >
                    <Plus size={18} strokeWidth={3} /> Start New Request
                </Link>
            </div>

            {/* 2. Dynamic Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <KPICard
                    title="Total Requests"
                    value={summary.total}
                    subtitle="Everything you submitted"
                    icon={FileText}
                    colorClass="bg-gray-50 text-gray-900"
                />

                <KPICard
                    title="Ready Permits"
                    value={summary.active}
                    subtitle="Approved and ready"
                    icon={CircleCheck}
                    colorClass="bg-green-50 text-green-700"
                />

                <KPICard
                    title="Waiting for You"
                    value={summary.pending}
                    subtitle="Needs your action"
                    icon={AlertCircle}
                    colorClass="bg-amber-50 text-amber-700"
                />
            </div>

            {/* 3. Table Container */}
            <div className="bg-white border border-gray-100 rounded-none overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5">ID Number</th>
                                <th className="px-6 py-5">Where & Who</th>
                                <th className="px-6 py-5 text-center">Permit Status</th>
                                <th className="px-6 py-5">Travel Date</th>
                                <th className="px-6 py-5 text-right pr-8">Options</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">

                            {/* Empty State Handle */}
                            {applications.length === 0 && (
                                <tr>
                                    <td colSpan="5">
                                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50">
                                            <Inbox size={48} className="text-gray-300 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No requests found</p>
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

                                    {/* Grouped Details */}
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col space-y-1">
                                            <span className="text-sm font-black text-gray-900 leading-none">{data.farmer_name}</span>
                                            {data.destination && (
                                                <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1 uppercase tracking-widest leading-none mt-1">
                                                    <MapPin size={12} className="text-green-600" /> {data.destination}
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
                                            <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
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

export default FarmerApplicationDashboard;