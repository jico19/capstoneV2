import LoadingLayout from '../../../components/ui/LoadingLayout';
import { useState, useEffect } from "react";
import { 
    FileSignature, 
    Eye, 
    Search, 
    LayoutDashboard
} from "lucide-react";
import { useApplication } from '../../../hooks/useApplications';
import { useNavigate } from "react-router-dom";
import StatusBadge from "../../../components/ui/StatusBadge";
import DateFormatter from "../../../components/ui/DateFormatter";
import DataTable from "../../../components/ui/DataTable";

/**
 * OPV Application Management Dashboard
 * High-signal minimalist registry for the Veterinary Office validation queue.
 * Conforms to FarmPass Design 2.0 with universal DataTable.
 */
const OpvApplicationDashboard = () => {
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
    
    // We fetch only applications relevant to OPV. 
    // The backend ViewSet handles the role-based filtering.
    const { data: application, isLoading, isError, isFetching } = useApplication(limit, offset, undefined, searchQuery, {
        refetchInterval: 15000 // Automatically sync validation queue every 15 seconds
    });
    const navigate = useNavigate();

    if (isError) {
        return (
            <div className="max-w-5xl mx-auto p-12 bg-white">
                <div className="bg-red-50 border border-red-100 p-10 flex flex-col items-center text-center space-y-4">
                    <h2 className="text-xl font-black text-red-700 uppercase tracking-tighter">Sync Failure</h2>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-relaxed">Could not retrieve the applications registry.</p>
                    <button onClick={() => window.location.reload()} className="bg-stone-800 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest">Retry Connection</button>
                </div>
            </div>
        );
    }

    const applications = application?.results || [];
    const count = application?.count || 0;

    const columns = [
        {
            header: "Permit ID",
            render: (app) => (
                <span className="text-[11px] font-black text-stone-900 font-mono tracking-tight bg-stone-100 px-2 py-1 border border-stone-200">
                    #{app.application_id}
                </span>
            ),
        },
        {
            header: "Applicant",
            render: (app) => (
                <div>
                    <p className="text-sm font-black text-stone-800 uppercase tracking-tight">{app.farmer_name}</p>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Verified Livestock Owner</p>
                </div>
            ),
        },
        {
            header: "Current Status",
            align: "center",
            render: (app) => <StatusBadge status={app.status} />,
        },
        {
            header: "Transport Date",
            align: "center",
            render: (app) => (
                <div className="text-xs font-bold text-stone-600 uppercase tracking-tighter">
                    <DateFormatter date={app.transport_date} />
                </div>
            ),
        },
        {
            header: "Actions",
            align: "right",
            headerClassName: "pr-8",
            className: "pr-8",
            render: (app) => (
                <button 
                    onClick={() => navigate(`/opv/application/detail/${app.id}`)}
                    className="bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ml-auto"
                >
                    <Eye size={14} /> Review
                </button>
            ),
        },
    ];

    return (
        <LoadingLayout loading={isLoading}>
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-white min-h-screen font-sans">
            {/* Minimalist Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-100 pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Veterinary Office</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none">Permit Applications</h1>
                </div>                    
            </div>

            {/* Search Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
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
            </div>

            {/* Registry Table Section */}
            <DataTable
                columns={columns}
                data={applications}
                minWidth="800px"
                emptyState={{
                    icon: FileSignature,
                    title: "No applications in queue",
                    description: "All pending permits have been validated or none match your search."
                }}
                pagination={count > limit ? {
                    count,
                    limit,
                    offset,
                    onPageChange: setOffset
                } : null}
            />

            {/* Quick Navigation Footer */}
            <div className="pt-8 border-t border-stone-100">
                <button 
                    onClick={() => navigate('/opv/')}
                    className="flex items-center gap-2 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-green-700 transition-colors"
                >
                    <LayoutDashboard size={14} /> Back to Overview
                </button>
            </div>
        </div>
        </LoadingLayout>
    );
};

export default OpvApplicationDashboard;
