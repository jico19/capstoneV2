import { X, AlertCircle, ExternalLink, FileText, Info } from 'lucide-react';
import { useDocument } from '/src/hooks/useApplications';

/**
 * Global Document Review Modal
 * Strictly follows GEMINI.md: flat UI, no radius, no shadows, high-contrast typography.
 * Displays split view of the document image and its OCR/extracted data.
 */
const DocumentViewModal = ({ doc_id, onClose }) => {
    const { data: doc, isLoading, isError } = useDocument(doc_id);

    if (isLoading) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40">
            <div className="bg-white p-10 flex flex-col items-center gap-4 border border-gray-900">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 animate-pulse">Retrieving Evidence</p>
            </div>
        </div>
    );

    if (isError) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/60 p-4">
            <div className="bg-white border-2 border-red-600 p-8 max-w-md w-full flex flex-col items-center text-center space-y-4">
                <AlertCircle size={48} className="text-red-600" />
                <h3 className="text-lg font-black uppercase italic tracking-tighter">Access.Denied</h3>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                    Could not retrieve the requested document from the registry.
                </p>
                <button 
                    onClick={onClose} 
                    className="w-full bg-gray-900 text-white py-3 text-xs font-black uppercase tracking-[0.2em]"
                >
                    Back to Detail
                </button>
            </div>
        </div>
    );

    const extracted = doc?.ocr?.extracted_field || {};
    const remarks = doc?.ocr?.remarks || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 p-4 backdrop-grayscale-[0.5]">
            <div className="bg-white w-full max-w-7xl h-[90vh] flex flex-col border-none">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-2  bg-white">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FileText size={16} className="text-green-600" />
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">
                                {doc.document_type_display}
                            </h3>
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Audit ID: {doc.id} • Registered {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-3 border border-gray-200 hover:bg-red-600 hover:text-white transition-all rounded-none group"
                    >
                        <X size={24} strokeWidth={3} />
                    </button>
                </div>

                {/* Main Content: Split View */}
                <div className="flex-1 flex flex-col md:row overflow-hidden flex-row">

                    {/* Left: Document Preview (The Visual Evidence) */}
                    <div className="flex-1 bg-gray-100 overflow-auto p-8 flex flex-col border-r-2 ">
                        <div className="flex justify-between items-center mb-6">
                            <a 
                                href={doc.file} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="bg-white border  px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-green-600 hover:text-white transition-all flex items-center gap-2"
                            >
                                <ExternalLink size={12} /> View Full Detail
                            </a>
                        </div>
                        <div className="bg-white p-4 border border-gray-200 inline-block mx-auto min-w-[300px]">
                            <img
                                src={doc.file}
                                alt="Submitted Document"
                                className="w-full h-auto grayscale-[0.2] hover:grayscale-0 transition-all duration-300 cursor-zoom-in"
                            />
                        </div>
                    </div>

                    {/* Right: Data View (The Information) */}
                    <div className="w-full md:w-[450px] overflow-y-auto bg-white p-10">
                        <div className="mb-10 border-l-4  pl-6">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 leading-none">Intelligence Hub</h4>
                            <p className="text-lg font-black text-gray-900 uppercase italic tracking-tight">Extracted.Data</p>
                        </div>

                        <div className="space-y-8">
                            {Object.keys(extracted).length > 0 ? (
                                Object.entries(extracted).map(([key, value]) => (
                                    <div key={key} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">
                                                {key.replace(/_/g, '.')}
                                            </p>
                                            {remarks[key] && (
                                                <span className="bg-red-50 text-red-700 px-2 py-0.5 text-[8px] font-black uppercase border border-red-100 flex items-center gap-1">
                                                    <AlertCircle size={10} /> Discrepancy
                                                </span>
                                            )}
                                        </div>

                                        <div className={`p-4 border-l-4 transition-all ${remarks[key] 
                                            ? 'bg-red-50/30 border-red-600' 
                                            : 'bg-gray-50 border-gray-900'
                                        }`}>
                                            <p className="text-sm font-black text-gray-900 font-mono uppercase italic break-words leading-none">
                                                {value || <span className="text-gray-300">Null</span>}
                                            </p>
                                        </div>

                                        {remarks[key] && (
                                            <div className="flex items-start gap-2 mt-2 pl-1">
                                                <Info size={12} className="text-red-600 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-bold text-gray-500 italic uppercase tracking-tighter">
                                                    Observation: {remarks[key]}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200">
                                    <FileText className="mx-auto mb-4 text-gray-200" size={48} />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No OCR Intelligence Available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t-2 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-green-500 text-white px-16 py-4 text-xs font-black uppercase tracking-[0.3em] hover:bg-green-600 transition-all active:scale-[0.98]"
                    >
                        Exit Preview
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DocumentViewModal;