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
            <div className="flex flex-col items-center justify-center py-20 text-center border border-stone-200 bg-white rounded-none">
                <div className="w-12 h-12 flex items-center justify-center bg-stone-50 text-stone-300 mb-4 border border-stone-100">
                    <FolderOpen size={24} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400">No documents yet</h3>
                <p className="text-sm font-medium text-stone-500 mt-1">We couldn't find any documents for this request.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {documents.map((doc) => {
                const hasOcr = doc.ocr != null;
                const needsReview = hasOcr && (doc.ocr.status === 'MANUAL' || doc.ocr.status === 'FAILED');

                // Determine border and status styles based on the document state
                let stateStyles = {
                    border: 'border-l-4 border-stone-200',
                    badge: 'bg-stone-50 text-stone-600 border-stone-200',
                    statusText: 'Waiting for Review',
                    helperText: 'We are waiting to check this document.',
                    icon: <FileText size={20} className="text-stone-400" />,
                    iconBg: 'bg-stone-50 border-stone-100'
                };

                if (hasOcr) {
                    if (needsReview) {
                        stateStyles = {
                            border: 'border-l-4 border-amber-500',
                            badge: 'bg-amber-50 text-amber-700 border-amber-500',
                            statusText: 'Needs Attention',
                            helperText: 'There is a small issue that needs a manual check.',
                            icon: <AlertTriangle size={20} className="text-amber-600" />,
                            iconBg: 'bg-amber-50 border-amber-100'
                        };
                    } else {
                        stateStyles = {
                            border: 'border-l-4 border-green-600',
                            badge: 'bg-green-50 text-green-700 border-green-600',
                            statusText: 'Verified',
                            helperText: 'This document has been checked and verified.',
                            icon: <CheckCircle size={20} className="text-green-600" />,
                            iconBg: 'bg-green-50 border-green-100'
                        };
                    }
                }

                return (
                    <div
                        key={doc.id}
                        className={`
                            group flex flex-col md:flex-row md:items-center justify-between p-6 
                            bg-white border-t border-r border-b border-stone-200 rounded-none 
                            transition-colors duration-100 ease-out hover:bg-stone-50
                            ${stateStyles.border}
                        `}
                    >
                        <div className="flex items-start md:items-center gap-6">
                            {/* Square Icon Container */}
                            <div className={`
                                w-12 h-12 flex items-center justify-center rounded-none border 
                                ${stateStyles.iconBg}
                            `}>
                                {stateStyles.icon}
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-stone-800 uppercase tracking-tight leading-none">
                                    {doc.document_type_display}
                                </h3>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <span className={`px-2 py-0.5 border rounded-none text-[10px] font-black uppercase tracking-widest inline-block ${stateStyles.badge}`}>
                                        {stateStyles.statusText}
                                    </span>
                                    <span className="text-xs text-stone-500 font-medium">
                                        {stateStyles.helperText}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 md:mt-0 flex flex-wrap items-center gap-2">
                            {hasOcr && needsReview && fixData && (
                                <button
                                    onClick={() => fixData({ ocr_id: doc.ocr.id, doc_id: doc.id })}
                                    className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-none transition-colors flex items-center gap-2"
                                >
                                    <Pencil size={14} /> Fix Info
                                </button>
                            )}
                            {documentView && (
                                <button 
                                    onClick={() => documentView(doc.id)}
                                    className="bg-green-700 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-none transition-colors flex items-center gap-2"
                                >
                                    <Search size={14} /> See Details
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