import { useState } from 'react';
import { X, AlertCircle, ExternalLink, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useDocument } from '../../../hooks/useApplications';
import { useForm } from 'react-hook-form';

/**
 * OCR Data Correction Modal
 * Redesigned for Farmer-Friendly simplicity and Minimalist Design System.
 */
const OCRModal = ({ doc_id, title = "Check Document", onClose, onSubmit, isSubmitting }) => {

    const { data: doc, isLoading, isError } = useDocument(doc_id);
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };


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
                <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Could not load document</h3>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Please try again.</p>
                </div>
                <button onClick={onClose} className="w-full bg-gray-900 text-white py-3 text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors">
                    Close
                </button>
            </div>
        </div>
    );

    const isPdf = typeof doc?.file === 'string' && (
        doc.file.toLowerCase().endsWith('.pdf') || 
        doc.file.includes('application/pdf') ||
        doc.file.includes('.pdf?')
    );

    const extracted = doc?.ocr?.extracted_field || {};
    const remarks = doc?.ocr?.remarks || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 sm:p-6 overflow-hidden">
            <div className="bg-white w-full max-w-6xl h-full max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden">
                
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
                    
                    {/* Left: Document Preview with Controls */}
                    <div className="flex-1 bg-gray-50 overflow-auto p-4 sm:p-6 flex flex-col gap-3">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            {!isPdf ? (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={handleZoomOut}
                                        title="Zoom Out"
                                        className="p-1.5 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    >
                                        <ZoomOut size={14} />
                                    </button>
                                    <span className="text-[10px] font-mono text-gray-500 w-12 text-center bg-white py-1.5 border border-gray-200 select-none">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleZoomIn}
                                        title="Zoom In"
                                        className="p-1.5 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    >
                                        <ZoomIn size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRotate}
                                        title="Rotate"
                                        className="p-1.5 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                    >
                                        <RotateCw size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="px-2 py-1 text-[9px] font-black uppercase text-gray-600 bg-white border border-gray-200 hover:bg-gray-100"
                                    >
                                        Reset
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PDF Viewer</span>
                            )}
                            <a href={doc.file} target="_blank" rel="noreferrer" className="text-green-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                                <ExternalLink size={14} /> Open Tab
                            </a>
                        </div>
                        <div className="flex-1 border border-gray-200 bg-white p-2 flex items-center justify-center overflow-auto">
                            {isPdf ? (
                                <iframe
                                    src={doc.file}
                                    title={doc.document_type_display}
                                    className="w-full h-full min-h-[400px] border-0"
                                />
                            ) : (
                                <div
                                    className="transition-transform duration-100 ease-out inline-block"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transformOrigin: 'center center',
                                    }}
                                >
                                    <img 
                                        src={doc.file} 
                                        alt="Submitted Document" 
                                        className="max-w-full max-h-[55vh] object-contain"
                                    />
                                </div>
                            )}
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