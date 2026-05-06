import { useNavigate } from "react-router-dom";
import { useInspectorLogs } from "/src/hooks/useInspectorLogs";
import { ArrowLeft, Clock, MapPin, User, FileText, Calendar } from "lucide-react";
import DateFormatter from "/src/components/DateFormatter";

/**
 * Inspection History Page
 * Displays a chronological list of all QR codes scanned by the current inspector.
 * Designed for mobile-first field use with high-signal minimalism.
 */
const InspectionHistory = () => {
    const navigate = useNavigate();
    const { logs, isLoading, isError } = useInspectorLogs();

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
        <div className="max-w-xl mx-auto p-4 md:p-8 min-h-screen bg-white font-sans">
            {/* Minimal Navigation */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-green-700 transition-colors mb-8"
            >
                <ArrowLeft size={16} /> Dashboard
            </button>

            {/* Header */}
            <div className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-700 mb-1">Archive</p>
                <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter">Inspection History</h1>
                <p className="text-xs text-stone-500 font-medium uppercase tracking-widest mt-1">Review your recent checkpoint scans.</p>
            </div>

            {/* History List */}
            <div className="space-y-4">
                {logs.results && logs.results.length > 0 ? (
                    logs.results.map((log) => (
                        <div key={log.id} className="border border-stone-200 p-5 space-y-4 bg-white hover:bg-stone-50 transition-colors cursor-pointer">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-stone-400" />
                                        <span className="text-xs font-black text-stone-800 uppercase tracking-tight">{log.application_id_code}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-stone-400" />
                                        <span className="text-sm font-bold text-stone-700 uppercase tracking-tighter">{log.farmer_name}</span>
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

                            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-stone-500">
                                    <MapPin size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[150px]">{log.destination}</span>
                                </div>
                            </div>

                            {log.notes && (
                                <div className="bg-stone-50 p-3 border-l-2 border-stone-200">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Inspector Notes</p>
                                    <p className="text-xs text-stone-600 font-medium italic">"{log.notes}"</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-stone-100">
                        <Clock size={32} className="text-stone-200 mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">No scans recorded yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InspectionHistory;
