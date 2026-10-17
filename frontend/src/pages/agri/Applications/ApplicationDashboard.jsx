import { useNavigate } from "react-router-dom";
import { Eye, Inbox, AlertCircle, Clock, CheckCircle, Search, Filter } from "lucide-react";
import DateFormatter from "../../../components/ui/DateFormatter";
import ActionGroup from '../../../components/ui/ActionButton';
import StatusBadge from "../../../components/ui/StatusBadge";
import { useApplication } from '../../../hooks/useApplications';
import { useState, useMemo, useEffect } from "react";
import DataTable from "../../../components/ui/DataTable";
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

    const { data, isLoading, isError, isFetching } = useApplication(limit, offset, undefined, searchQuery, {
        refetchInterval: 15000 // Automatically refresh review queue every 15s
    });
    const { data: unfilteredData } = useApplication(1000, 0, undefined, undefined, {
        refetchInterval: 30000
    });
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
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Opening Registry...</p>
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

    const columns = [
        {
            header: "ID Number",
            render: (data) => (
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-stone-900 font-mono tracking-tight bg-stone-100 px-2 py-1 border border-stone-200">
                        {data.application_id}
                    </span>
                    {isOverdue(data.created_at, data.status) && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-none animate-pulse">
                            OVERDUE
                        </span>
                    )}
                </div>
            )
        },
        {
            header: "Farmer Name",
            render: (data) => (
                <span className="text-sm font-black text-stone-800 uppercase leading-none">{data.farmer_name}</span>
            )
        },
        {
            header: "Permit Status",
            align: "center",
            render: (data) => <StatusBadge status={data.status} />
        },
        {
            header: "Travel Date",
            render: (data) => (
                <span className="text-xs font-black text-stone-800 uppercase tracking-tight">
                    <DateFormatter date={data.transport_date} />
                </span>
            )
        },
        {
            header: "Actions",
            align: "right",
            headerClassName: "pr-8",
            className: "pr-8",
            render: (data) => (
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
            )
        }
    ];

    return (
        <div className="flex-1 p-4 md:p-8 space-y-8 bg-white min-h-full font-sans">
            
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-stone-200 pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Official Registry</p>
                    <h1 className="text-3xl font-black text-stone-900 tracking-tight">Permit Management</h1>
                    <p className="text-sm text-stone-600 font-medium">Review and process livestock transport requests</p>
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
            <DataTable
                columns={columns}
                data={applications}
                minWidth="800px"
                emptyState={{
                    icon: Inbox,
                    title: "Registry is empty",
                    description: "No permit applications match your selected status and search filters."
                }}
                pagination={count > limit ? {
                    count,
                    limit,
                    offset,
                    onPageChange: setOffset
                } : null}
            />
        </div>
    );
};

export default ApplicationDashboard;