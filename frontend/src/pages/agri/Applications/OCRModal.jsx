import { X, AlertCircle, ExternalLink } from 'lucide-react';
import { useDocument } from '/src/hooks/useApplications';
import { useForm } from 'react-hook-form';


const OCRModal = ({ doc_id, title = "Document Verification", onClose, onSubmit, isSubmitting }) => {
    const { data: doc, isLoading, isError } = useDocument(doc_id);

    const { register, handleSubmit, formState: { errors } } = useForm();


    if (isLoading) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
    );

    if (isError) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="alert alert-error max-w-md rounded-none shadow-none">
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
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left: Document Preview */}
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

                    {/* Right: Verification Form */}
                    <div className="w-1/2 overflow-y-auto border-l border-gray-200 bg-white p-6">
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-gray-900 uppercase mb-1">OCR Data Verification</h4>
                            <p className="text-sm text-gray-500">Review and correct extracted data below.</p>
                        </div>

                        <form id="ocr-form" className="space-y-4">
                            {Object.keys(extracted).map((key) => {
                                const hasError = remarks[key] || extracted[key] === null;
                                return (
                                    <div key={key} className="form-control w-full">
                                        <label className="label py-1">
                                            <span className="label-text text-xs font-bold uppercase text-gray-600">
                                                {key.replace(/_/g, ' ')}
                                            </span>
                                            {remarks[key] && (
                                                <span className="label-text-alt text-error flex items-center gap-1">
                                                    <AlertCircle size={12} /> OCR Failed
                                                </span>
                                            )}
                                        </label>
                                        
                                        <input
                                            type="text"
                                            defaultValue={extracted[key] || ""}
                                            {...register(key, { required: "This field is required" })}
                                            className={`input input-bordered rounded-none w-full bg-gray-50 focus:bg-white transition-colors ${
                                                hasError ? 'border-yellow-500 ring-1 ring-yellow-500/20' : 'border-gray-200'
                                            }`}
                                        />
                                        
                                        {remarks[key] && (
                                            <p className="text-[10px] mt-1 text-gray-400 italic">"{remarks[key]}"</p>
                                        )}
                                        {errors[key] && (
                                            <p className="text-error text-[10px] mt-1">{errors[key].message}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-warning text-zinc-800 rounded-none font-medium">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit(onSubmit)}
                        form="ocr-form"
                        disabled={isSubmitting}
                        className="btn btn-success rounded-none px-10 text-white"
                    >
                        {isSubmitting ? <span className="loading loading-spinner"></span> : "Confirm & Save"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OCRModal;