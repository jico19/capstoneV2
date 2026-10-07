import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInspectorLogs } from '../../../hooks/useInspectorLogs';
import { ArrowLeft, Clock, MapPin, User, Calendar, Compass, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import DateFormatter from "../../../components/ui/DateFormatter";

/**
 * Inspection History Page
 * Displays a chronological list of all QR codes scanned by the current inspector.
 * Enhanced for mobile-first field use with high-signal minimalism.
 */
const InspectionHistory = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 5;

    const { logs, isLoading, isError } = useInspectorLogs(page, PAGE_SIZE);

    const totalCount = logs?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
    const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(page * PAGE_SIZE, totalCount);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
            <span className="loading loading-spinner loading-lg text-green-600"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Retrieving Logs...</p>
        </div>
    );

    if (isError) return (
        <div className="p-4 md:p-12 bg-white min-h-screen">
            <div className="bg-red-50 border border-red-100 p-8 flex flex-col items-center text-center space-y-4">
                <h2 className="text-lg font-black text-red-700 uppercase tracking-tighter">Connection Failure</h2>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-relaxed">Could not sync inspection history.</p>
                <button onClick={() => navigate(-1)} className="bg-stone-800 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest">Return</button>
            </div>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 min-h-screen bg-stone-50 font-sans pb-20">
            {/* Minimal Navigation */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-stone-800 transition-colors mb-8"
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            {/* Header */}
            <div className="mb-8 border-b border-stone-200 pb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-700 bg-green-50 px-2 py-0.5 border border-green-200">
                    Checkpoint Audit Trail
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-stone-800 uppercase tracking-tighter mt-2">
                    Inspection History
                </h1>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-widest mt-1">
                    Review your recent livestock transport QR scans.
                </p>
            </div>

            {/* History List */}
            <div className="space-y-4">
                {logs.results && logs.results.length > 0 ? (
                    logs.results.map((log) => (
                        <div key={log.id} className="border border-stone-200 p-5 space-y-4 bg-white hover:border-green-700 transition-all shadow-sm">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-green-700" />
                                        <span className="text-sm font-mono font-black text-stone-900 uppercase tracking-tight">
                                            {log.application_id_code}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-0.5">
                                        <User size={14} className="text-stone-400" />
                                        <span className="text-xs font-bold text-stone-800 uppercase tracking-tight">
                                            {log.farmer_name}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                        <Calendar size={12} />
                                        <DateFormatter date={log.scanned_at} />
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-black text-green-700 uppercase tracking-widest">
                                        <Clock size={12} />
                                        <DateFormatter date={log.scanned_at} showTime={true} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-stone-600">
                                    <MapPin size={14} className="text-stone-400 shrink-0" />
                                    <span className="text-xs font-bold uppercase tracking-wide truncate max-w-xs">
                                        {log.destination}
                                    </span>
                                </div>
                                {(log.lat || log.longi) && (
                                    <div className="flex items-center gap-1 text-[9px] font-mono text-stone-400">
                                        <Compass size={11} className="text-green-700" />
                                        <span>GPS: {Number(log.lat).toFixed(4)}, {Number(log.longi).toFixed(4)}</span>
                                    </div>
                                )}
                            </div>

                            {log.notes && (
                                <div className="bg-stone-50 p-3 border-l-2 border-stone-800">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Inspector Notes</p>
                                    <p className="text-xs text-stone-800 font-medium italic">"{log.notes}"</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-stone-200 bg-white">
                        <Clock size={32} className="text-stone-300 mb-4" />
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">No scans recorded yet.</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {totalCount > 0 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 border border-stone-200 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                        Showing {startItem}–{endItem} of {totalCount} records (Page {page} of {totalPages})
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-stone-100 text-stone-800 border border-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-200 transition-colors"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="flex items-center gap-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-stone-800 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-900 transition-colors"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InspectionHistory;
