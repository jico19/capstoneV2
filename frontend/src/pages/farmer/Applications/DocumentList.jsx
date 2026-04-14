import { FileText, CheckCircle2, AlertCircle, FileSearch, FolderOpen } from 'lucide-react';

const DocumentList = ({ documents }) => {

    if (!documents || documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                    <FolderOpen size={28} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-700">No Documents Found</h3>
                <p className="text-xs text-slate-400 mt-1">No documents have been submitted for this application.</p>
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
                            group flex flex-col md:flex-row md:items-center justify-between p-6 
                            rounded-2xl transition-all duration-300 border
                            ${!hasOcr
                                ? 'bg-slate-50/50 border-slate-200'
                                : needsReview
                                    ? 'bg-amber-50/50 border-amber-300'
                                    : 'bg-green-50/50 border-green-300 hover:bg-slate-50'}
                        `}
                    >
                        <div className="flex items-center gap-5">
                            <div className={`
                                w-12 h-12 flex items-center justify-center rounded-xl shadow-sm
                                ${!hasOcr ? 'bg-white text-slate-300' : needsReview ? 'bg-white text-amber-600' : 'bg-white text-slate-400'}
                            `}>
                                <FileText size={24} />
                            </div>

                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                    {doc.document_type_display}
                                </h3>
                                <div className="flex items-center gap-3 mt-1.5">
                                    {!hasOcr ? (
                                        <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                            <AlertCircle size={12} /> OCR Unavailable
                                        </span>
                                    ) : needsReview ? (
                                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 uppercase tracking-tighter">
                                            <AlertCircle size={12} /> Needs Override
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10px] font-black text-green-600 uppercase tracking-tighter">
                                            <CheckCircle2 size={12} /> Validated
                                        </span>
                                    )}
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                    <span className="text-[11px] text-slate-400 font-medium italic">
                                        {!hasOcr
                                            ? "No OCR data available"
                                            : needsReview
                                                ? "Unreadable fields detected"
                                                : "Data cross-referenced"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 md:mt-0 flex items-center gap-3">
                            <button 
                                onClick={() => console.log('tite')}
                                className="btn btn-sm btn-ghost gap-2 text-slate-400 hover:text-green-700 hover:bg-green-50 rounded-lg text-[10px] font-black uppercase"
                            >
                                <FileSearch size={16} /> View File
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DocumentList;