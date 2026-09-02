import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApplication } from '../../../hooks/useApplications';
import {
    Plus,
    MapPin, Inbox, FileText, CheckCircle, AlertCircle,
    HandCoins,
    Eye,
    Download,
    Search,
    X,
    Filter,
    Calendar
} from "lucide-react";
import ActionGroup from '../../../components/ui/ActionButton';
import DateFormatter from "../../../components/ui/DateFormatter";
import StatusBadge from "../../../components/ui/StatusBadge";
import KPICard from "../../../components/ui/KPICard";
import Pagination from "../../../components/ui/Pagination";

/**
 * Farmer Application List Dashboard
 * Strictly follows Design.MD: Stone neutrals, flat UI, square edges.
 * Optimized for responsiveness to remove unnecessary scrollbars.
 */
const FarmerApplicationDashboard = () => {
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // Debounce search query changes
    useEffect(() => {
        const handler = setTimeout(() => {
            setSearchQuery(searchInput);
            setOffset(0);
        }, 350);

        return () => {
            clearTimeout(handler);
        };
    }, [searchInput]);


    const { data, isLoading, isError, isFetching } = useApplication(limit, offset, statusFilter, searchQuery);
    const { data: unfilteredData } = useApplication(1000, 0);
    const navigate = useNavigate();
    const applications = data?.results || [];
    const count = data?.count || 0;



    const summary = useMemo(() => {
        const allApps = unfilteredData?.results || [];
        return {
            total: unfilteredData?.count || 0,
            active: allApps.filter(app => ['PAID', 'RELEASED'].includes(app.status) && !app.is_checked).length,
            pending: allApps.filter(app => ['PAYMENT_PENDING', 'DRAFT'].includes(app.status)).length
        };
    }, [unfilteredData]);

    const clearFilters = () => {
        setSearchInput("");
        setStatusFilter("");
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <div className="flex flex-col items-center gap-4">
                    <span className="loading loading-spinner loading-lg text-green-700"></span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 animate-pulse">
                        Opening your requests...
                    </p>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-8 text-center rounded-none">
                    <AlertCircle size={32} className="text-red-600 mx-auto mb-4" />
                    <h3 className="text-sm font-black text-red-700 uppercase tracking-widest">We couldn't load your list</h3>
                    <p className="text-xs font-medium text-red-600 mt-1">Please check your internet and refresh the page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8 bg-stone-50 min-h-full">

            {/* 1. Header Section with Quick Action */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-6">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-0.5">Your Records</p>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-800 uppercase tracking-tighter">Your Permit Requests</h1>
                </div>
                <Link
                    to="/farmer/application/create"
                    className="w-full sm:w-auto px-5 py-3 bg-green-700 hover:bg-green-600 active:bg-green-800 text-white text-[10px] font-black uppercase tracking-widest transition-colors rounded-none flex items-center justify-center gap-2"
                >
                    <Plus size={14} />
                    New Request
                </Link>
            </div>

            {/* 2. KPI Metrics (2 columns on mobile) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                <KPICard
                    title="Total Requests"
                    value={summary.total}
                    subtitle="Everything you've sent"
                    icon={FileText}
                    colorClass="bg-white text-stone-400 border-stone-200"
                />
                <KPICard
                    title="Ready Permits"
                    value={summary.active}
                    subtitle="Approved & active"
                    icon={CheckCircle}
                    colorClass="bg-green-50 text-green-700 border-green-200"
                />
                <div className="col-span-2 md:col-span-1">
                    <KPICard
                        title="Waiting for You"
                        value={summary.pending}
                        subtitle="Needs action or pay"
                        icon={AlertCircle}
                        colorClass="bg-amber-50 text-amber-700 border-amber-200"
                    />
                </div>
            </div>

            {/* 3. Main Content Area */}
            <div className="bg-white border border-stone-200 rounded-none">

                {/* 3.1 Unified Toolbar */}
                <div className="p-3 sm:p-4 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row gap-3 justify-between items-center w-full">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search Permit ID..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 border border-stone-200 text-xs font-semibold bg-white focus:outline-none focus:border-stone-500 rounded-none placeholder:text-stone-300 transition-colors"
                        />
                        {isFetching && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs text-stone-400"></span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 flex-1 sm:flex-none">
                            <Filter size={14} className="text-stone-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-xs font-black uppercase tracking-widest text-stone-600 bg-transparent focus:outline-none cursor-pointer w-full"
                            >
                                <option value="">All Permits</option>
                                <option value="DRAFT">Draft (Unsent)</option>
                                <option value="SUBMITTED">Sent (Received)</option>
                                <option value="RESUBMISSION">Needs Corrections</option>
                                <option value="OCR_VALIDATED">Checking Documents</option>
                                <option value="MANUAL">Under Office Review</option>
                                <option value="FORWARDED_TO_OPV">Under Vet Review</option>
                                <option value="OPV_VALIDATED">Approved by Vet</option>
                                <option value="OPV_REJECTED">Rejected by Vet</option>
                                <option value="PAYMENT_PENDING">Awaiting Payment</option>
                                <option value="RELEASED">Active / Released</option>
                            </select>
                        </div>

                        {(searchQuery || statusFilter !== "") && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-red-600 transition-colors"
                            >
                                <X size={14} /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* 3.2 Dedicated Mobile Permit Cards (< sm) */}
                <div className="sm:hidden divide-y divide-stone-100">
                    {applications.length === 0 ? (
                        <div className="py-16 text-center">
                            <Inbox size={40} className="text-stone-200 mx-auto mb-3" />
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                                No requests found
                            </p>
                        </div>
                    ) : (
                        applications.map((app) => (
                            <div 
                                key={app.id} 
                                className="p-4 space-y-3 bg-white active:bg-stone-50 transition-colors"
                                onClick={() => navigate(`/farmer/application/detail/${app.id}`)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-black text-stone-800 bg-stone-100 px-2 py-0.5 border border-stone-200">
                                        {app.application_id || `#${app.id}`}
                                    </span>
                                    <StatusBadge status={app.status} />
                                </div>
                                
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={13} className="text-stone-400 shrink-0" />
                                        <span className="text-xs font-bold text-stone-800 uppercase truncate">
                                            {app.destination || "Not specified"}
                                        </span>
                                    </div>
                                    {app.transport_date && (
                                        <div className="flex items-center gap-1.5 pl-0.5 text-stone-500">
                                            <Calendar size={12} className="text-stone-300 shrink-0" />
                                            <span className="text-[10px] font-medium">
                                                <DateFormatter date={app.transport_date} />
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div onClick={(e) => e.stopPropagation()} className="pt-1">
                                    {app.status === 'PAYMENT_PENDING' ? (
                                        <button
                                            onClick={() => navigate(`/farmer/payment/checkout/${app.id}`)}
                                            className="w-full py-2 bg-green-700 active:bg-green-800 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-none"
                                        >
                                            <HandCoins size={13} /> Pay Fee Now
                                        </button>
                                    ) : ['PAID', 'RELEASED'].includes(app.status) ? (
                                        <button
                                            onClick={() => navigate(`/farmer/application/download/${app.id}`)}
                                            className="w-full py-2 bg-stone-800 active:bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-none"
                                        >
                                            <Download size={13} /> Get Permit PDF
                                        </button>
                                    ) : ['RESUBMISSION', 'OPV_REJECTED'].includes(app.status) ? (
                                        <button
                                            onClick={() => navigate(`/farmer/application/resubmit/${app.id}`)}
                                            className="w-full py-2 bg-amber-600 active:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-none"
                                        >
                                            Fix / Resubmit
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate(`/farmer/application/detail/${app.id}`)}
                                            className="w-full py-2 bg-stone-50 border border-stone-200 active:bg-stone-100 text-stone-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 rounded-none"
                                        >
                                            <Eye size={13} /> View Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 3.3 Desktop Table (>= sm) */}
                <div className="hidden sm:block overflow-x-auto overflow-y-visible">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-stone-50 border-b border-stone-100">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Permit Info</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-500 text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-500">Travel Date</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-stone-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {applications.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-24 text-center">
                                        <div className="flex flex-col items-center">
                                            <Inbox size={48} className="text-stone-200 mb-4" />
                                            <p className="text-sm font-bold text-stone-400 uppercase tracking-widest">
                                                No requests found
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                applications.map((app) => (
                                    <tr
                                        key={app.id}
                                        className="hover:bg-stone-50 transition-all duration-100 group border-l-4 border-transparent hover:border-green-700 cursor-pointer"
                                        onClick={() => navigate(`/farmer/application/detail/${app.id}`)}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] w-fit font-mono font-black text-stone-800 bg-stone-100 px-2 py-0.5 border border-stone-200">
                                                    {app.application_id || `#${app.id}`}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={12} className="text-stone-400 group-hover:text-green-700" />
                                                    <span className="text-sm font-bold text-stone-800 uppercase tracking-tight">
                                                        {app.destination || "Not specified"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <StatusBadge status={app.status} />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-stone-300" />
                                                <span className="text-xs font-medium text-stone-800">
                                                    <DateFormatter date={app.transport_date} />
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                             <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-2">
                                                 {app.status === 'PAYMENT_PENDING' ? (
                                                     <>
                                                         <button
                                                             onClick={() => navigate(`/farmer/payment/checkout/${app.id}`)}
                                                             className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest transition-colors rounded-none inline-flex items-center gap-1.5"
                                                         >
                                                             <HandCoins size={12} /> Pay Fee
                                                         </button>
                                                         <button
                                                             onClick={() => navigate(`/farmer/application/detail/${app.id}`)}
                                                             className="px-3 py-1.5 border border-stone-200 hover:bg-stone-50 text-stone-700 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none inline-flex items-center gap-1.5"
                                                         >
                                                             <Eye size={12} /> View
                                                         </button>
                                                     </>
                                                 ) : ['PAID', 'RELEASED'].includes(app.status) ? (
                                                     <>
                                                         <button
                                                             onClick={() => navigate(`/farmer/application/download/${app.id}`)}
                                                             className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors rounded-none inline-flex items-center gap-1.5"
                                                         >
                                                             <Download size={12} /> Get Permit
                                                         </button>
                                                         <button
                                                             onClick={() => navigate(`/farmer/application/detail/${app.id}`)}
                                                             className="px-3 py-1.5 border border-stone-200 hover:bg-stone-50 text-stone-700 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none inline-flex items-center gap-1.5"
                                                         >
                                                             <Eye size={12} /> View
                                                         </button>
                                                     </>
                                                 ) : ['RESUBMISSION', 'OPV_REJECTED'].includes(app.status) ? (
                                                     <>
                                                         <button
                                                             onClick={() => navigate(`/farmer/application/resubmit/${app.id}`)}
                                                             className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors rounded-none inline-flex items-center gap-1.5"
                                                         >
                                                             Fix/Resubmit
                                                         </button>
                                                         <button
                                                             onClick={() => navigate(`/farmer/application/detail/${app.id}`)}
                                                             className="px-3 py-1.5 border border-stone-200 hover:bg-stone-50 text-stone-700 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none inline-flex items-center gap-1.5"
                                                         >
                                                             <Eye size={12} /> View
                                                         </button>
                                                     </>
                                                 ) : (
                                                     <button
                                                         onClick={() => navigate(`/farmer/application/detail/${app.id}`)}
                                                         className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none inline-flex items-center gap-1.5"
                                                     >
                                                         <Eye size={12} /> View Details
                                                     </button>
                                                 )}
                                             </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 3.3 Pagination */}
                <div className="border-t border-stone-100">
                    <Pagination
                        count={count}
                        limit={limit}
                        offset={offset}
                        onPageChange={setOffset}
                    />
                </div>
            </div>
        </div>
    );
};

export default FarmerApplicationDashboard;