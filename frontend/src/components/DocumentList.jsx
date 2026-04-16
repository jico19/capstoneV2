import { FileText, CheckCircle2, AlertCircle, FileSearch, FolderOpen } from 'lucide-react';

/**
 * Global Unified Document List Component
 * Used by Farmer, Agri, and OPV roles.
 * Strictly adheres to GEMINI.md: flat UI, no radius, no shadows.
 */
const DocumentList = ({ documents, fixData, documentView }) => {

    if (!documents || documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 flex items-center justify-center bg-gray-50 text-gray-300 mb-4 border border-gray-100">
                    <FolderOpen size={32} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Registry Empty</h3>
                <p className="text-xs font-bold text-gray-300 mt-1 uppercase italic tracking-tighter">No documents detected for this audit.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {documents.map((doc) => {
                const hasOcr = doc.ocr != null;
                const needsReview = hasOcr && (doc.ocr.status === 'MANUAL' || doc.ocr.status === 'FAILED');

                return (
                    <div
                        key={doc.id}
                        className={`
                            group flex flex-col md:flex-row md:items-center justify-between p-8 
                            rounded-none transition-all duration-75 border-l-8
                            ${!hasOcr
                                ? 'bg-white border-gray-200 hover:bg-gray-50'
                                : needsReview
                                    ? 'bg-amber-50/30 border-amber-600'
                                    : 'bg-white border-green-600 hover:bg-gray-50'}
                            border-t border-r border-b border-gray-100
                        `}
                    >
                        <div className="flex items-center gap-6">
                            <div className={`
                                w-14 h-14 flex items-center justify-center rounded-none border-2
                                ${!hasOcr ? 'bg-gray-50 border-gray-100 text-gray-300' : needsReview ? 'bg-white border-amber-200 text-amber-600' : 'bg-white border-green-100 text-green-600'}
                            `}>
                                <FileText size={28} />
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic leading-none">
                                    {doc.document_type_display}
                                </h3>
                                <div className="flex items-center gap-4">
                                    {!hasOcr ? (
                                        <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-200 px-2 py-0.5">
                                            Intelligence Unavailable
                                        </span>
                                    ) : needsReview ? (
                                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-700 uppercase tracking-widest border border-amber-200 px-2 py-0.5 bg-white">
                                            <AlertCircle size={10} /> Discrepancy Detected
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[9px] font-black text-green-700 uppercase tracking-widest border border-green-200 px-2 py-0.5 bg-white">
                                            <CheckCircle2 size={10} /> Cross Referenced
                                        </span>
                                    )}
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight italic opacity-60">
                                        {!hasOcr
                                            ? "OCR pipeline bypassed"
                                            : needsReview
                                                ? "Manual audit required"
                                                : "Verified by System"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 md:mt-0 flex items-center gap-0">
                            {hasOcr && needsReview && fixData && (
                                <button
                                    onClick={() => fixData({ ocr_id: doc.ocr.id, doc_id: doc.id })}
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest px-8 h-12 rounded-none transition-colors border border-amber-600"
                                >
                                    Fix Data
                                </button>
                            )}
                            {documentView && (
                                <button 
                                    onClick={() => documentView(doc.id)}
                                    className="bg-gray-900 hover:bg-green-600 text-white gap-3 px-8 h-12 flex items-center justify-center text-[10px] font-black uppercase tracking-widest rounded-none transition-all ml-[-1px]"
                                >
                                    <FileSearch size={16} strokeWidth={3} /> View Document
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