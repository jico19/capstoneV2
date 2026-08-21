import React, { useState } from 'react';
import { 
    X, 
    Copy, 
    Check, 
    Clock, 
    User, 
    ShieldCheck, 
    FileText, 
    Activity, 
    Calendar,
    Hash
} from 'lucide-react';

/**
 * Audit Entry Detail Inspection Modal
 * Adheres strictly to the FarmPass Design System: Flat UI, stone neutrals, square edges.
 */
const AuditDetailModal = ({ isOpen, onClose, log, categoryInfo }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !log) return null;

    const handleCopyId = () => {
        if (log.id) {
            navigator.clipboard.writeText(String(log.id));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown Date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }) + ' at ' + date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    };

    const getRelativeTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return diffMins + ' min' + (diffMins > 1 ? 's' : '') + ' ago';
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
        const diffDays = Math.floor(diffHours / 24);
        return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    };

    const IconComponent = categoryInfo?.icon || Activity;

    return (
        <div 
            className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-100"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white w-full max-w-xl border border-stone-200 shadow-2xl rounded-none overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-200 bg-stone-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 border ${categoryInfo?.bg || 'bg-stone-100 text-stone-700 border-stone-200'}`}>
                            <IconComponent size={18} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest leading-none">
                                Audit Event #{log.id}
                            </h3>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-1">
                                Operational Trace Details
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors rounded-none"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Primary Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Performed By */}
                        <div className="bg-stone-50/70 border border-stone-200 p-3.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-stone-400">
                                <User size={12} />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    Actor / Origin
                                </span>
                            </div>
                            <p className="text-sm font-bold text-stone-900">
                                {log.who_performed_name || 'System / Automated'}
                            </p>
                            <p className="text-[10px] text-stone-500 font-mono">
                                User ID: {log.who_performed || 'N/A'}
                            </p>
                        </div>

                        {/* Timestamp */}
                        <div className="bg-stone-50/70 border border-stone-200 p-3.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-stone-400">
                                <Clock size={12} />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    Logged Timestamp
                                </span>
                            </div>
                            <p className="text-xs font-bold text-stone-900">
                                {formatDate(log.when_performed)}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                                {getRelativeTime(log.when_performed)}
                            </p>
                        </div>
                    </div>

                    {/* Category Classification */}
                    <div className="flex items-center justify-between p-3 bg-stone-50/40 border border-stone-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                            Functional Module
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[10px] font-black uppercase tracking-wider ${categoryInfo?.bg || 'bg-stone-100 text-stone-700 border-stone-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${categoryInfo?.dot || 'bg-stone-400'}`} />
                            {categoryInfo?.label || 'General Event'}
                        </span>
                    </div>

                    {/* Verbatim Action Narrative */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
                            <FileText size={12} />
                            Verbatim Action Narrative
                        </label>
                        <div className="p-4 bg-stone-900 text-stone-100 border border-stone-800 text-xs font-mono leading-relaxed rounded-none select-all break-words">
                            {log.what_performed}
                        </div>
                    </div>

                    {/* Raw System ID & Copy */}
                    <div className="flex items-center justify-between text-stone-400 text-[10px] font-mono pt-2 border-t border-stone-100">
                        <div className="flex items-center gap-1.5">
                            <Hash size={12} />
                            <span>Unique Ref: AUDIT-TR-{log.id}</span>
                        </div>
                        <button
                            onClick={handleCopyId}
                            className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-sans font-bold uppercase text-[9px] tracking-wider transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check size={12} className="text-emerald-600" />
                                    <span className="text-emerald-600">Copied Ref</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={12} />
                                    <span>Copy Reference ID</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-200 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-black uppercase tracking-widest transition-colors rounded-none cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditDetailModal;
