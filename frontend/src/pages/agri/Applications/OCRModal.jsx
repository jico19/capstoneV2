import { X, AlertCircle, ExternalLink } from 'lucide-react';
import { useDocument } from '/src/hooks/useApplications';
import { useForm } from 'react-hook-form';

/**
 * OCR Data Correction Modal
 * Redesigned for Farmer-Friendly simplicity and Minimalist Design System.
 */
const OCRModal = ({ doc_id, title = "Check Document", onClose, onSubmit, isSubmitting }) => {

    const { data: doc, isLoading, isError } = useDocument(doc_id);
    const { register, handleSubmit, formState: { errors } } = useForm();


    if (isLoading) return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <span className="loading loading-spinner loading-lg text-green-600"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Opening Document...</p>
        </div>
    );

    if (isError) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white p-8 max-w-md w-full border border-red-100 flex flex-col items-center gap-4 text-center rounded-none">
                <AlertCircle size={32} className="text-red-600" />
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Could not load document data.</p>
                <button onClick={onClose} className="w-full bg-gray-900 text-white py-3 text-xs font-black uppercase tracking-widest rounded-none">Close</button>
            </div>
        </div>
    );

    const extracted = doc?.ocr?.extracted_field || {};
    const remarks = doc?.ocr?.remarks || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] flex flex-col border border-gray-100 rounded-none overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Document Review</p>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                            {doc.document_type_display}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                        <X size={28} strokeWidth={3} />
                    </button>
                </div>

                {/* Main Content: Split View */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    
                    {/* Left: Document Preview */}
                    <div className="flex-1 bg-gray-50 overflow-auto p-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Preview</span>
                            <a href={doc.file} target="_blank" rel="noreferrer" className="text-green-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:underline">
                                <ExternalLink size={14} /> Full Image
                            </a>
                        </div>
                        <div className="border border-gray-200 bg-white p-2">
                            <img 
                                src={doc.file} 
                                alt="Submitted Document" 
                                className="w-full h-auto"
                            />
                        </div>
                    </div>

                    {/* Right: Verification Form */}
                    <div className="lg:w-1/2 overflow-y-auto border-t lg:border-t-0 lg:border-l border-gray-100 bg-white p-8">
                        <div className="mb-8 border-l-4 border-gray-900 pl-6">
                            <h4 className="text-xl font-black text-gray-900 tracking-tight">Fix Document Details</h4>
                            <p className="text-sm text-gray-500 font-medium">Correct any mistakes found in the digital copy below.</p>
                        </div>

                        <form id="ocr-form" className="space-y-6">
                            {Object.keys(extracted).map((key) => {
                                const hasError = remarks[key] || extracted[key] === null;
                                return (
                                    <div key={key} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
                                                {key.replace(/_/g, ' ')}
                                            </label>
                                            {remarks[key] && (
                                                <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
                                                    <AlertCircle size={12} /> Auto-check Failed
                                                </span>
                                            )}
                                        </div>
                                        
                                        <input
                                            type="text"
                                            defaultValue={extracted[key] || ""}
                                            {...register(key, { required: "This info is required" })}
                                            className={`w-full p-4 bg-gray-50 border rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${
                                                hasError ? 'border-red-600 text-red-900 focus:border-red-600' : 'border-gray-200 text-gray-900 focus:border-green-600'
                                            }`}
                                        />
                                        
                                        {remarks[key] && (
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Help: "{remarks[key]}"</p>
                                        )}
                                        {errors[key] && (
                                            <p className="text-red-600 text-[10px] font-black uppercase tracking-widest">{errors[key].message}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-end gap-4">
                    <button onClick={onClose} className="w-full sm:w-auto px-10 py-4 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-black uppercase tracking-widest rounded-none transition-colors">
                        Cancel Changes
                    </button>
                    <button 
                        onClick={handleSubmit(onSubmit)}
                        form="ocr-form"
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-12 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="loading loading-spinner loading-xs"></span>
                                SAVING...
                            </>
                        ) : "Confirm & Save Info"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OCRModal;