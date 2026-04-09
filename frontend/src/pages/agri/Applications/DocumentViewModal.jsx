import { X, AlertCircle, ExternalLink, FileText, Info } from 'lucide-react';
import { useDocument } from '/src/hooks/useApplications';

const DocumentViewModal = ({ doc_id, onClose }) => {
    const { data: doc, isLoading, isError } = useDocument(doc_id);

    if (isLoading) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <span className="loading loading-spinner loading-lg text-green-700"></span>
        </div>
    );

    if (isError) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="alert alert-error max-w-md rounded-xl shadow-2xl">
                <AlertCircle />
                <span>Error loading document data.</span>
                <button onClick={onClose} className="btn btn-sm btn-ghost">Close</button>
            </div>
        </div>
    );

    const extracted = doc?.ocr?.extracted_field || {};
    const remarks = doc?.ocr?.remarks || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col border border-gray-300">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight">
                            {doc.document_type_display}
                        </h3>
                        <p className="text-xs text-gray-500">ID: {doc.id} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Main Content: Split View */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">

                    {/* Left: Document Preview (The Visual Evidence) */}
                    <div className="flex-1 bg-gray-100 overflow-auto p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase">Document Preview</span>
                            <a href={doc.file} target="_blank" rel="noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline">
                                <ExternalLink size={12} /> View Full Image
                            </a>
                        </div>
                        <img
                            src={doc.file}
                            alt="Submitted Document"
                            className="w-full h-auto border border-gray-200 shadow-sm"
                        />
                    </div>

                    {/* Right: Data View (The Information) */}
                    <div className="w-full md:w-[400px] overflow-y-auto bg-white p-8">
                        <div className="mb-8">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] mb-1">Extracted Information</h4>
                            <p className="text-xs text-slate-400">Validated data from the document via OCR.</p>
                        </div>

                        <div className="space-y-6">
                            {Object.keys(extracted).length > 0 ? (
                                Object.entries(extracted).map(([key, value]) => (
                                    <div key={key} className="group">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="label-text text-xs font-bold uppercase text-gray-600">
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            {remarks[key] && (
                                                <span className="label-text-alt text-error flex items-center gap-1">
                                                    <AlertCircle size={12} /> OCR Failed
                                                </span>
                                            )}
                                        </div>

                                        <div className={`p-3 rounded-xl border transition-colors ${remarks[key] ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50 border-slate-100 group-hover:bg-slate-100'
                                            }`}>
                                            <p className="text-sm font-bold text-slate-700 break-words">
                                                {value || <span className="text-slate-300 italic">No data detected</span>}
                                            </p>
                                        </div>

                                        {remarks[key] && (
                                            <p className="text-[10px] mt-2 text-slate-400 italic px-1 flex items-start gap-1">
                                                <Info size={12} className="shrink-0 mt-0.5" />
                                                <span>Note: {remarks[key]}</span>
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 opacity-50">
                                    <FileText className="mx-auto mb-2 text-slate-300" size={32} />
                                    <p className="text-xs font-bold uppercase tracking-widest">No OCR Data Available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn btn-error text-white px-12 font-bold uppercase tracking-widest text-xs"
                    >
                        Close Preview
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DocumentViewModal;