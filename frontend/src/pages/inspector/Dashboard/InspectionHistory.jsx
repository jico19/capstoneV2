import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useInspectorLogs } from '../../../hooks/useInspectorLogs';
import {
    ArrowLeft,
    Clock,
    MapPin,
    User,
    Calendar,
    Compass,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    QrCode
} from "lucide-react";
import DateFormatter from "../../../components/ui/DateFormatter";

const InspectionHistory = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 6;

    const { logs, isLoading, isError } = useInspectorLogs(page, PAGE_SIZE);

    const totalCount = logs?.count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
    const startItem = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(page * PAGE_SIZE, totalCount);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[360px] bg-white rounded-xl border border-stone-200 m-4 p-8">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4 animate-pulse">
                    Retrieving inspection records...
                </p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 sm:p-6 max-w-xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 sm:p-8 flex flex-col items-center text-center space-y-3">
                    <h2 className="text-base font-black text-red-700 uppercase tracking-tight">
                        Connection Error
                    </h2>
                    <p className="text-xs text-stone-600 leading-relaxed">
                        Could not synchronize checkpoint inspection history.
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="h-11 px-6 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors mt-2"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const results = logs?.results || [];

    return (
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 min-h-screen bg-stone-50 font-sans space-y-4 sm:space-y-6">
            {/* Top Navigation & Actions Bar */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-stone-200/60 text-stone-700 active:scale-95 transition-all"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-stone-900 uppercase tracking-tight leading-none">
                            Inspection Logs
                        </h1>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Checkpoint Audit Trail
                        </span>
                    </div>
                </div>

                <Link
                    to="/inspector/scan/"
                    className="h-11 px-4 bg-green-700 hover:bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                >
                    <QrCode size={16} />
                    <span className="hidden sm:inline">Scan QR</span>
                </Link>
            </div>

            {/* Sub-Header / Summary Info */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                    <p className="text-xs font-bold text-stone-800">
                        Livestock Transport Verification Log
                    </p>
                    <p className="text-[11px] text-stone-500">
                        Chronological record of official QR code checks conducted at this station.
                    </p>
                </div>
                <span className="text-[10px] font-mono font-black text-stone-700 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200 shrink-0">
                    {totalCount} Total Scans
                </span>
            </div>

            {/* History List */}
            <div className="space-y-3">
                {results.length > 0 ? (
                    results.map((log) => (
                        <div
                            key={log.id}
                            className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 space-y-3 shadow-xs hover:border-green-600/50 transition-colors"
                        >
                            {/* Card Header: Application Code + Date/Time */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-green-700 shrink-0" />
                                    <span className="text-xs sm:text-sm font-mono font-black text-stone-900 uppercase">
                                        {log.application_id_code}
                                    </span>
                                    <span className="text-[9px] font-black uppercase bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-md">
                                        Verified
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} className="text-stone-400" />
                                        <DateFormatter date={log.scanned_at} />
                                    </div>
                                    <span>•</span>
                                    <div className="flex items-center gap-1 text-green-700 font-bold">
                                        <Clock size={12} />
                                        <DateFormatter date={log.scanned_at} showTime={true} />
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid: Farmer & Destination */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-stone-400 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block leading-tight">
                                            Farmer / Shipper
                                        </span>
                                        <span className="font-bold text-stone-800 uppercase truncate block">
                                            {log.farmer_name || 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-green-700 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block leading-tight">
                                            Destination
                                        </span>
                                        <span className="font-bold text-stone-800 uppercase truncate block">
                                            {log.destination || 'Unspecified'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* GPS Chip */}
                            {(log.lat || log.longi) && (
                                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500">
                                    <div className="flex items-center gap-1.5 font-mono">
                                        <Compass size={13} className="text-green-700 shrink-0" />
                                        <span>GPS: {Number(log.lat).toFixed(4)}, {Number(log.longi).toFixed(4)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {log.notes && (
                                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block mb-0.5">
                                        Checkpoint Observation
                                    </span>
                                    <p className="text-xs text-stone-800 font-medium italic">
                                        "{log.notes}"
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="bg-white border border-stone-200 rounded-xl p-8 sm:p-12 text-center space-y-3 shadow-xs">
                        <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                            <Clock size={24} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-stone-800">
                            No Inspection Records
                        </h3>
                        <p className="text-xs text-stone-500 max-w-sm mx-auto">
                            Inspection logs will be created automatically when you scan transport permits at checkpoints.
                        </p>
                        <Link
                            to="/inspector/scan/"
                            className="inline-flex items-center gap-2 h-11 px-5 bg-green-700 hover:bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-colors mt-2"
                        >
                            <QrCode size={15} /> Start First Scan
                        </Link>
                    </div>
                )}
            </div>

            {/* Pagination Controls (44px+ touch targets) */}
            {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-stone-200 shadow-xs">
                    <span className="text-[11px] font-bold text-stone-500 text-center sm:text-left">
                        Showing {startItem}–{endItem} of {totalCount} records (Page {page} of {totalPages})
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex-1 sm:flex-initial h-11 px-4 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-stone-100 text-stone-800 rounded-lg border border-stone-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-200 transition-colors"
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="flex-1 sm:flex-initial h-11 px-4 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider bg-stone-900 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InspectionHistory;
