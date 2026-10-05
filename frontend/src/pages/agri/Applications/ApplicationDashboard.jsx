import { useNavigate } from "react-router-dom";
import { Eye, Inbox, FileText, AlertCircle, Clock, CheckCircle, Search, Filter } from "lucide-react";
import DateFormatter from "../../../components/ui/DateFormatter";
import ActionGroup from '../../../components/ui/ActionButton';
import StatusBadge from "../../../components/ui/StatusBadge";
import { useApplication } from '../../../hooks/useApplications';
import { useState, useMemo, useEffect } from "react";
import Pagination from "../../../components/ui/Pagination";
import KPICard from "../../../components/ui/KPICard";

const STATUS_FILTER_OPTIONS = [
    { value: 'ALL', label: 'All Permit Statuses' },
    { value: 'NEEDS_REVIEW', label: 'Needs Action (MAO)' },
    { value: 'SUBMITTED', label: 'Submitted (New)' },
    { value: 'MANUAL', label: 'Needs Manual Review' },
    { value: 'OPV_REVIEW', label: 'At Health Office (OPV)' },
    { value: 'FORWARDED_TO_OPV', label: 'Forwarded to OPV' },
    { value: 'OPV_APPROVED', label: 'OPV Validated' },
    { value: 'OPV_REJECTED', label: 'OPV Rejected' },
    { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
    { value: 'READY', label: 'Permits Ready (Paid/Released)' },
    { value: 'RELEASED', label: 'Released Permits' },
    { value: 'CANCELLED', label: 'Cancelled Requests' },
];

/**
 * Agri Application Dashboard
 * Redesigned for better workflow management and Farmer-Friendly simplicity.
 */
const ApplicationDashboard = () => {
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

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

    const { data, isLoading, isError, isFetching } = useApplication(limit, offset, undefined, searchQuery);
    const { data: unfilteredData } = useApplication(1000, 0);
    const navigate = useNavigate();
    
    const [activeFilter, setActiveFilter] = useState('ALL');
    // Filter application list based on active KPI or status dropdown filter
    const applications = useMemo(() => {
        const rawApps = data?.results || [];
        if (activeFilter === 'NEEDS_REVIEW') {
            return rawApps.filter(app => ['SUBMITTED', 'MANUAL', 'OCR_VALIDATED'].includes(app.status));
        }
        if (activeFilter === 'OPV_REVIEW') {
            return rawApps.filter(app => ['FORWARDED_TO_OPV', 'OPV_REJECTED'].includes(app.status));
        }
        if (activeFilter === 'OPV_APPROVED') {
            return rawApps.filter(app => ['OPV_VALIDATED'].includes(app.status));
        }
        if (activeFilter === 'READY') {
            return rawApps.filter(app => ['PAID', 'RELEASED'].includes(app.status));
        }
        if (activeFilter !== 'ALL') {
            return rawApps.filter(app => app.status === activeFilter);
        }
        return rawApps;
    }, [data?.results, activeFilter]);
  
    const count = applications.length;

    // Workflow Summary logic
    const summary = useMemo(() => {
        const allApps = unfilteredData?.results || [];
        return {
            needsReview: allApps.filter(app => ['SUBMITTED', 'MANUAL', 'OCR_VALIDATED'].includes(app.status)).length,
            atHealthOffice: allApps.filter(app => ['FORWARDED_TO_OPV', 'OPV_REJECTED'].includes(app.status)).length,
            opvApproved: allApps.filter(app => ['OPV_VALIDATED'].includes(app.status)).length,
            readyForPermit: allApps.filter(app => ['PAID', 'RELEASED'].includes(app.status)).length
        };
    }, [unfilteredData]);

    const isOverdue = (createdAt, status) => {
        if (!['SUBMITTED', 'MANUAL', 'OCR_VALIDATED'].includes(status)) return false;
        if (!createdAt) return false;
        const diffHours = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
        return diffHours >= 48;
    };

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

            {/* 2. Workflow Summary Cards (Clickable Filter Controls) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KPICard
                    title="Needs Action"
                    value={summary.needsReview}
                    subtitle="Click to view unreviewed requests"
                    icon={AlertCircle}
                    colorClass={`bg-red-50 text-red-600 ${activeFilter === 'NEEDS_REVIEW' ? 'ring-2 ring-red-600' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'NEEDS_REVIEW' ? 'ALL' : 'NEEDS_REVIEW')}
                />
                <KPICard
                    title="At Health Office"
                    value={summary.atHealthOffice}
                    subtitle="Click to view OPV pending"
                    icon={Clock}
                    colorClass={`bg-blue-50 text-blue-600 ${activeFilter === 'OPV_REVIEW' ? 'ring-2 ring-blue-600' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'OPV_REVIEW' ? 'ALL' : 'OPV_REVIEW')}
                />
                <KPICard
                    title="OPV Approved"
                    value={summary.opvApproved}
                    subtitle="Click to set fee & issue permit"
                    icon={CheckCircle}
                    colorClass={`bg-amber-50 text-amber-700 ${activeFilter === 'OPV_APPROVED' ? 'ring-2 ring-amber-600' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'OPV_APPROVED' ? 'ALL' : 'OPV_APPROVED')}
                />
                <KPICard
                    title="Permits Ready"
                    value={summary.readyForPermit}
                    subtitle="Click to view finalized permits"
                    icon={CheckCircle}
                    colorClass={`bg-green-50 text-green-600 ${activeFilter === 'READY' ? 'ring-2 ring-green-600' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'READY' ? 'ALL' : 'READY')}
                />
            </div>

            {/* Search & Permit Status Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pb-2">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search ID, Farmer name..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 border border-stone-200 text-xs font-semibold bg-white focus:outline-none focus:border-stone-500 rounded-none placeholder:text-stone-300 transition-colors"
                        />
                        {isFetching && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 loading loading-spinner loading-xs text-stone-400"></span>
                        )}
                    </div>

                    {/* Permit Status Filter Dropdown */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter size={15} className="text-stone-400 shrink-0 hidden sm:block" />
                        <select
                            value={activeFilter}
                            onChange={(e) => {
                                setActiveFilter(e.target.value);
                                setOffset(0);
                            }}
                            className="w-full sm:w-auto py-2 px-3 border border-stone-200 text-xs font-bold bg-white text-stone-800 focus:outline-none focus:border-green-700 rounded-none cursor-pointer"
                        >
                            {STATUS_FILTER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {activeFilter !== 'ALL' && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-600 uppercase">
                            Filtered by: <span className="text-green-800 font-black">{activeFilter.replace(/_/g, ' ')}</span>
                        </span>
                        <button
                            type="button"
                            onClick={() => setActiveFilter('ALL')}
                            className="text-[10px] font-black uppercase text-red-600 hover:text-red-800 bg-red-50 border border-red-200 px-2 py-1"
                        >
                            Reset Filter
                        </button>
                    </div>
                )}
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black text-gray-900 font-mono tracking-tight bg-gray-50 px-2 py-1 border border-gray-200">
                                                {data.application_id}
                                            </span>
                                            {isOverdue(data.created_at, data.status) && (
                                                <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-none animate-pulse">
                                                    OVERDUE
                                                </span>
                                            )}
                                        </div>
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
                                                    onClick: () => navigate(`detail/${data.id}`),
                                                    disabled: false
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