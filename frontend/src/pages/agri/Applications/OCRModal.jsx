import Skeleton from 'react-loading-skeleton';
import { useState } from 'react';
import { X, AlertCircle, ExternalLink, ZoomIn, ZoomOut, RotateCw, FileText } from 'lucide-react';
import { useDocument } from '../../../hooks/useApplications';
import { useForm } from 'react-hook-form';
import { getAuthenticatedMediaUrl } from '../../../lib/utils';


/**
 * OCR Data Correction Modal
 * Redesigned for Farmer-Friendly simplicity and Minimalist Design System.
 */
const OCRModal = ({ doc_id, onClose, onSubmit, isSubmitting }) => {

    const { data: documentData, isLoading, isError } = useDocument(doc_id);
    const doc = documentData || {};
    const { register, handleSubmit, formState: { errors, isDirty } } = useForm();
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };



    if (isError) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
            <div className="bg-white p-8 max-w-md w-full border border-stone-200 flex flex-col items-center gap-4 text-center rounded-xl shadow-xl">
                <AlertCircle size={32} className="text-red-600" />
                <div>
                    <h3 className="text-lg font-black text-stone-900 tracking-tight">Could not load document</h3>
                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mt-1">Please try again.</p>
                </div>
                <button onClick={onClose} className="w-full bg-stone-800 text-white py-2.5 text-xs font-black uppercase tracking-widest rounded-lg shadow-xs hover:bg-stone-700 transition-colors">
                    Close
                </button>
            </div>
        </div>
    );

    const fileUrl = getAuthenticatedMediaUrl(doc?.file);

    const isPdf = typeof fileUrl === 'string' && (
        fileUrl.toLowerCase().endsWith('.pdf') || 
        fileUrl.includes('application/pdf') ||
        fileUrl.includes('.pdf?')
    );

    const extracted = doc?.ocr?.extracted_field || {};
    const remarks = doc?.ocr?.remarks || {};

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 sm:p-6 overflow-hidden">
            <div className="bg-white w-full max-w-6xl h-full max-h-[92vh] flex flex-col border border-stone-200 rounded-xl shadow-xl overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-stone-50/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none">Document Review</p>
                        <h3 className="text-2xl font-black text-stone-900 tracking-tight leading-none">
                            {isLoading ? <Skeleton width="20ch" /> : doc.document_type_display}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-900 rounded-lg transition-colors">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Main Content: Split View */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    
                    {/* Left: Document Preview with Controls */}
                    <div className="flex-1 bg-stone-50 overflow-auto p-4 sm:p-6 flex flex-col gap-3">
                        <div className="flex justify-between items-center flex-wrap gap-2">
                            {!isPdf ? (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleZoomOut}
                                        title="Zoom Out"
                                        className="p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg shadow-2xs transition-colors"
                                    >
                                        <ZoomOut size={14} />
                                    </button>
                                    <span className="text-[10px] font-mono text-stone-600 w-12 text-center bg-white py-1.5 border border-stone-200 rounded-md select-none">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleZoomIn}
                                        title="Zoom In"
                                        className="p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg shadow-2xs transition-colors"
                                    >
                                        <ZoomIn size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRotate}
                                        title="Rotate"
                                        className="p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg shadow-2xs transition-colors"
                                    >
                                        <RotateCw size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="px-2 py-1 text-[9px] font-black uppercase text-stone-600 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg shadow-2xs transition-colors"
                                    >
                                        Reset
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">PDF Viewer</span>
                            )}
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-green-700 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                                <ExternalLink size={14} /> Open Tab
                            </a>
                        </div>
                        <div className="flex-1 border border-stone-200 bg-white p-2 flex items-center justify-center overflow-auto rounded-xl shadow-xs">
                            {isLoading ? (
                                <div role="status" aria-label="Loading document..." className="w-full h-full min-h-[280px]"><Skeleton height="100%" containerClassName="block h-full leading-none" /></div>
                            ) : isPdf ? (
                                <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm space-y-3">
                                    <div className="p-3 bg-stone-900 text-white">
                                        <FileText size={36} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black uppercase tracking-tight text-stone-900">
                                             Official PDF Document
                                        </h4>
                                        <p className="text-[11px] text-stone-500 font-medium leading-relaxed">
                                            Open this document in Google Chrome / your browser's built-in PDF viewer in a new tab.
                                        </p>
                                    </div>
                                    <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                                    >
                                        <ExternalLink size={14} /> Open in Browser PDF Viewer
                                    </a>
                                </div>
                            ) : (
                                <div
                                    className="transition-transform duration-100 ease-out inline-block"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transformOrigin: 'center center',
                                    }}
                                >
                                    <img 
                                        src={fileUrl} 
                                        alt="Submitted Document" 
                                        className="max-w-full max-h-[55vh] object-contain"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Verification Form */}
                    <div className="lg:w-1/2 overflow-y-auto border-t lg:border-t-0 lg:border-l border-stone-200 bg-white p-8">
                        <div className="mb-8 border-l-4 border-stone-800 pl-6">
                            <h4 className="text-xl font-black text-stone-900 tracking-tight">Fix Document Details</h4>
                            <p className="text-sm text-stone-600 font-medium">Correct any mistakes found in the digital copy below.</p>
                        </div>

                        <form id="ocr-form" className="space-y-6">
                            {isLoading && <div aria-hidden="true" className="space-y-6">{[0, 1, 2, 3].map(i => <div key={i}><Skeleton width="40%" height={12} /><Skeleton height={40} /></div>)}</div>}
                            {Object.keys(extracted).map((key) => {
                                const hasError = remarks[key] || extracted[key] === null;
                                return (
                                    <div key={key} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-stone-800 uppercase tracking-widest">
                                                {key.replace(/_/g, ' ')}
                                            </label>
                                            {remarks[key] && (
                                                <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
                                                    <AlertCircle size={14} /> Auto-check Failed
                                                </span>
                                            )}
                                        </div>
                                        
                                        <input
                                            type="text"
                                            defaultValue={extracted[key] || ""}
                                            {...register(key, { required: "This info is required" })}
                                            className={`w-full h-10 px-4 bg-white border rounded-lg focus:outline-none focus:ring-1 transition-all text-sm font-medium ${
                                                hasError ? 'border-red-600 text-red-900 focus:border-red-600 focus:ring-red-600/20' : 'border-stone-200 text-stone-800 focus:border-green-700 focus:ring-green-700/20'
                                            }`}
                                        />
                                        
                                        {remarks[key] && (
                                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wide">Help: "{remarks[key]}"</p>
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
                <div className="p-6 border-t border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row justify-end gap-3">
                    <button 
                        onClick={onClose} 
                        className="w-full sm:w-auto px-6 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider rounded-lg shadow-2xs transition-colors"
                    >
                        {isDirty ? "Discard Changes" : "Close"}
                    </button>
                    <button 
                        onClick={handleSubmit(onSubmit)}
                        form="ocr-form"
                        disabled={isLoading || isSubmitting || !isDirty}
                        className="w-full sm:w-auto bg-green-700 hover:bg-green-600 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed text-white px-8 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
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
