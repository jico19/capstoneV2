import { X, AlertCircle, ExternalLink, FileText, Info, Loader2 } from 'lucide-react';
import { useDocument } from '/src/hooks/useApplications';

/**
 * Global Document Review Modal
 * Strictly adheres to Design.MD: Stone neutrals, flat UI, square edges, no shadows.
 * Displays a split view of the document image and its extracted information.
 * 
 * Props:
 *   doc_id — The ID of the document to view
 *   onClose — Callback function to close the modal
 */
const DocumentViewModal = ({ doc_id, onClose }) => {
    const { data: doc, isLoading, isError } = useDocument(doc_id);

    // Loading State
    if (isLoading) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 backdrop-blur-sm">
            <div className="bg-white p-12 flex flex-col items-center gap-4 border border-stone-200 rounded-none">
                <Loader2 size={32} className="text-green-700 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Loading document...</p>
            </div>
        </div>
    );

    // Error State
    if (isError) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4">
            <div className="bg-white border border-stone-200 p-10 max-w-md w-full flex flex-col items-center text-center space-y-6 rounded-none">
                <div className="w-16 h-16 bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                    <AlertCircle size={32} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-stone-800 uppercase tracking-tight">We couldn't open this document</h3>
                    <p className="text-sm font-medium text-stone-500">
                        There was a problem reaching the server. Please try again.
                    </p>
                </div>
                <button 
                    onClick={onClose} 
                    className="w-full bg-stone-800 hover:bg-stone-900 text-white py-3 text-xs font-black uppercase tracking-widest rounded-none transition-colors"
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    const extracted = doc?.ocr?.extracted_field || {};
    const remarks = doc?.ocr?.remarks || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 md:p-12 overflow-hidden">
            <div className="bg-white w-full max-w-7xl h-full flex flex-col border border-stone-200 rounded-none overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileText size={20} className="text-green-700" />
                            <h3 className="text-xl font-bold text-stone-800 uppercase tracking-tight leading-none">
                                {doc.document_type_display}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                ID: {doc.id}
                            </span>
                            <span className="text-stone-200">|</span>
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                Added on {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-stone-400 hover:text-stone-800 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Main Content: Split View */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                    {/* Left Panel: Visual Document */}
                    <div className="flex-1 bg-stone-50 overflow-auto p-8 flex flex-col items-center">
                        <div className="w-full flex justify-end mb-4">
                            <a 
                                href={doc.file} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-600 hover:bg-stone-100 transition-colors rounded-none"
                            >
                                <ExternalLink size={14} /> View Original
                            </a>
                        </div>
                        <div className="bg-white p-2 border border-stone-200 max-w-full inline-block">
                            <img
                                src={doc.file}
                                alt="Document Visual"
                                className="max-w-full h-auto cursor-zoom-in"
                            />
                        </div>
                    </div>

                    {/* Right Panel: Data Summary */}
                    <div className="w-full md:w-[450px] overflow-y-auto bg-white p-8 border-t md:border-t-0 md:border-l border-stone-200">
                        <div className="mb-8">
                            <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Document Details</h4>
                            <p className="text-lg font-bold text-stone-800 uppercase tracking-tight">Information Found</p>
                        </div>

                        <div className="space-y-6">
                            {Object.keys(extracted).length > 0 ? (
                                Object.entries(extracted).map(([key, value]) => (
                                    <div key={key} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            {remarks[key] && (
                                                <span className="bg-red-50 text-red-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border border-red-600">
                                                    Check this
                                                </span>
                                            )}
                                        </div>

                                        <div className={`p-4 border-l-2 ${remarks[key] 
                                            ? 'bg-red-50 border-red-600' 
                                            : 'bg-stone-50 border-stone-200'
                                        }`}>
                                            <p className="text-sm font-bold text-stone-800 font-mono break-words leading-none">
                                                {value || <span className="text-stone-300">No info</span>}
                                            </p>
                                        </div>

                                        {remarks[key] && (
                                            <div className="flex items-start gap-2 mt-2 px-1">
                                                <Info size={14} className="text-red-600 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-medium text-stone-600 italic leading-snug">
                                                    Note: {remarks[key]}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16 bg-stone-50 border border-stone-200 border-dashed">
                                    <FileText className="mx-auto mb-4 text-stone-200" size={40} />
                                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">No details found for this document</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-stone-200 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-green-700 hover:bg-green-600 text-white px-8 py-2 text-xs font-black uppercase tracking-widest rounded-none transition-colors"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DocumentViewModal;