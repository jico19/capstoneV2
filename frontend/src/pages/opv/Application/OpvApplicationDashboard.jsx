import { useState } from "react";
import { 
    FileSignature, 
    Eye, 
    Search, 
    Filter,
    LayoutDashboard
} from "lucide-react";
import { useApplication } from "/src/hooks/useApplications";
import { useNavigate } from "react-router-dom";
import StatusBadge from "/src/components/StatusBadge";
import DateFormatter from "/src/components/DateFormatter";
import ActionGroup from "/src/components/ActionButton";
import Pagination from "/src/components/Pagination";

/**
 * OPV Application Management Dashboard
 * High-signal minimalist registry for the Veterinary Office validation queue.
 */
const OpvApplicationDashboard = () => {
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [search, setSearch] = useState("");
    
    // We fetch only applications relevant to OPV. 
    // The backend ViewSet handles the role-based filtering, 
    // but we can pass status filters if needed.
    const { data, isLoading, isError } = useApplication(limit, offset);
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Syncing Validation Queue...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-5xl mx-auto p-12 bg-white">
                <div className="bg-red-50 border border-red-100 p-10 flex flex-col items-center text-center space-y-4">
                    <h2 className="text-xl font-black text-red-700 uppercase tracking-tighter">Sync Failure</h2>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-relaxed">Could not retrieve the validation registry.</p>
                    <button onClick={() => window.location.reload()} className="bg-stone-800 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest">Retry Connection</button>
                </div>
            </div>
        );
    }

    const applications = data?.results || [];
    const count = data?.count || 0;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-white min-h-screen font-sans">
            {/* Minimalist Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-100 pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Veterinary Office</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none">Validation Registry</h1>
                </div>
                
                {/* Search & Filter - Industrial Style */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="SEARCH BY ID OR FARMER..." 
                            className="bg-stone-50 border border-stone-200 px-10 py-3 text-[10px] font-black uppercase tracking-widest focus:border-green-700 outline-none w-64 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="bg-stone-50 border border-stone-200 p-3 text-stone-400 hover:text-stone-900 transition-colors">
                        <Filter size={16} />
                    </button>
                </div>
            </div>

            {/* Registry Table Section */}
            <div className="border border-stone-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-500">
                            <tr>
                                <th className="px-6 py-5">Permit ID</th>
                                <th className="px-6 py-5">Applicant</th>
                                <th className="px-6 py-5 text-center">Current Status</th>
                                <th className="px-6 py-5 text-center">Transport Date</th>
                                <th className="px-6 py-5 text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {applications.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="flex flex-col items-center justify-center py-24 bg-stone-50/30">
                                            <FileSignature size={48} className="text-stone-200 mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">No applications in queue</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                applications.map((app) => (
                                    <tr key={app.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-5">
                                            <span className="text-[11px] font-black text-stone-900 font-mono tracking-tight bg-stone-100 px-2 py-1 border border-stone-200">
                                                #{app.application_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-black text-stone-800 uppercase tracking-tight">{app.farmer_name}</p>
                                            <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">Verified Livestock Owner</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <StatusBadge status={app.status} />
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="text-xs font-bold text-stone-600 uppercase tracking-tighter">
                                                <DateFormatter date={app.transport_date} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            <button 
                                                onClick={() => navigate(`/opv/application/detail/${app.id}`)}
                                                className="bg-white border border-stone-200 hover:bg-stone-100 text-stone-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ml-auto"
                                            >
                                                <Eye size={14} /> Review
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
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

            {/* Quick Navigation Footer (Optional) */}
            <div className="pt-8 border-t border-stone-100">
                <button 
                    onClick={() => navigate('/opv/')}
                    className="flex items-center gap-2 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-green-700 transition-colors"
                >
                    <LayoutDashboard size={14} /> Back to Overview
                </button>
            </div>
        </div>
    );
};

export default OpvApplicationDashboard;