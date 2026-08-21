import { FileText, CheckCircle, AlertTriangle, Search, Pencil, FolderOpen } from 'lucide-react';

/**
 * Global Unified Document List Component
 * Used to display and manage documents across various roles (Farmer, Agri, OPV).
 * Strictly adheres to Design.MD: Stone neutrals, flat UI, square edges, no shadows.
 * 
 * Props:
 *   documents — Array of document objects to display
 *   fixData — Callback function to handle data correction (usually for OCR issues)
 *   documentView — Callback function to view the full document
 */
const DocumentList = ({ documents, fixData, documentView }) => {

    // Empty state when no documents are provided or the list is empty
    if (!documents || documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center border border-stone-200 bg-white rounded-none">
                <div className="w-10 h-10 flex items-center justify-center bg-stone-50 text-stone-300 mb-3 border border-stone-200">
                    <FolderOpen size={20} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400">No documents yet</h3>
                <p className="text-xs font-medium text-stone-500 mt-1">We couldn't find any documents for this request.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {documents.map((doc) => {
                const hasOcr = doc.ocr != null;
                const needsReview = hasOcr && (doc.ocr.status === 'MANUAL' || doc.ocr.status === 'FAILED');

                // Determine border and status styles based on the document state
                let stateStyles = {
                    border: 'border-l-4 border-stone-200',
                    badge: 'bg-stone-50 text-stone-600 border-stone-200',
                    statusText: 'Pending Review',
                    helperText: 'Awaiting office verification.',
                    icon: <FileText size={16} className="text-stone-400" />,
                    iconBg: 'bg-stone-50 border-stone-200'
                };

                if (hasOcr) {
                    if (needsReview) {
                        stateStyles = {
                            border: 'border-l-4 border-amber-500',
                            badge: 'bg-amber-50 text-amber-700 border-amber-500',
                            statusText: 'Needs Attention',
                            helperText: 'Issue requires manual check.',
                            icon: <AlertTriangle size={16} className="text-amber-600" />,
                            iconBg: 'bg-amber-50 border-amber-200'
                        };
                    } else if (doc.ocr.status === "OVERRIDDEN") {
                        stateStyles = {
                            border: 'border-l-4 border-green-600',
                            badge: 'bg-green-50 text-green-700 border-green-600',
                            statusText: 'Manually Checked',
                            helperText: 'Verified by agriculture office.',
                            icon: <CheckCircle size={16} className="text-green-600" />,
                            iconBg: 'bg-green-50 border-green-200'
                        };
                    }
                    else {
                        stateStyles = {
                            border: 'border-l-4 border-green-600',
                            badge: 'bg-green-50 text-green-700 border-green-600',
                            statusText: 'Verified',
                            helperText: 'Checked and confirmed valid.',
                            icon: <CheckCircle size={16} className="text-green-600" />,
                            iconBg: 'bg-green-50 border-green-200'
                        };
                    }
                }

                return (
                    <div
                        key={doc.id}
                        className={`
                            group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-5 
                            bg-white border-t border-r border-b border-stone-200 rounded-none 
                            transition-colors duration-100 ease-out hover:bg-stone-50 gap-3
                            ${stateStyles.border}
                        `}
                    >
                        <div className="flex items-start gap-3 min-w-0">
                            {/* Square Icon Container */}
                            <div className={`
                                w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-none border shrink-0
                                ${stateStyles.iconBg}
                            `}>
                                {stateStyles.icon}
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                                <h3 className="text-xs sm:text-sm font-black text-stone-800 uppercase tracking-tight leading-snug truncate">
                                    {doc.document_type_display}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-1.5 py-0.5 border rounded-none text-[8px] sm:text-[9px] font-black uppercase tracking-wider inline-block shrink-0 ${stateStyles.badge}`}>
                                        {stateStyles.statusText}
                                    </span>
                                    <span className="text-[10px] text-stone-500 font-medium truncate hidden xs:inline">
                                        {stateStyles.helperText}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                            {hasOcr && (needsReview || doc.ocr.status === 'OVERRIDDEN') && fixData && (
                                <button
                                    onClick={() => fixData({ ocr_id: doc.ocr.id, doc_id: doc.id })}
                                    className={`
                                        ${doc.ocr.status === 'OVERRIDDEN' ? 'bg-stone-800 hover:bg-stone-700' : 'bg-amber-600 hover:bg-amber-700'} 
                                        text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-none transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none`
                                    }
                                >
                                    <Pencil size={12} /> {doc.ocr.status === 'OVERRIDDEN' ? 'Edit' : 'Fix'}
                                </button>
                            )}
                            {documentView && (
                                <button
                                    onClick={() => documentView(doc.id)}
                                    className="bg-green-700 hover:bg-green-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-none transition-colors flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
                                >
                                    <Search size={12} /> View Document
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DocumentList;