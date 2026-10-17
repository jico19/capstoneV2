import { useState } from 'react';
import { 
    X, 
    AlertCircle, 
    ExternalLink, 
    FileText, 
    Info, 
    Loader2, 
    ZoomIn, 
    ZoomOut, 
    RotateCw, 
    Download 
} from 'lucide-react';
import { useDocument } from '../../hooks/useApplications';

/**
 * Global Document Review Modal
 * Strictly adheres to Design.MD: Stone neutrals, flat UI, square edges, no shadows.
 * Displays a split view of the document image/PDF and its extracted information.
 * 
 * Props:
 *   doc_id — The ID of the document to view
 *   onClose — Callback function to close the modal
 */
const DocumentViewModal = ({ doc_id, onClose }) => {
    const { data: doc, isLoading, isError } = useDocument(doc_id);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);



    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };

    // Loading State
    if (isLoading) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs">
            <div className="bg-white p-10 flex flex-col items-center gap-4 border border-stone-200 rounded-xl shadow-xl modal-enter">
                <Loader2 size={32} className="text-emerald-700 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Loading document...</p>
            </div>
        </div>
    );

    // Error State
    if (isError) return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
            <div className="bg-white border border-stone-200 p-8 max-w-md w-full flex flex-col items-center text-center space-y-5 rounded-xl shadow-xl modal-enter">
                <div className="w-14 h-14 bg-red-50 text-red-600 flex items-center justify-center rounded-xl border border-red-100">
                    <AlertCircle size={28} />
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-stone-800 tracking-tight">We couldn't open this document</h3>
                    <p className="text-xs text-stone-500 font-normal">
                        There was a problem reaching the server. Please try again.
                    </p>
                </div>
                <button 
                    type="button"
                    onClick={onClose} 
                    className="btn-tactile w-full bg-stone-800 hover:bg-stone-900 text-white py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-all"
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    const extracted = doc?.ocr?.extracted_field || {};
    const remarks = doc?.ocr?.remarks || {};

    const resolveFileUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
            return url;
        }
        const base = (import.meta.env.VITE_BASE_URL || '').replace(/\/$/, '');
        return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    const fileUrl = resolveFileUrl(doc?.file);

    const isPdf = typeof fileUrl === 'string' && (
        fileUrl.toLowerCase().endsWith('.pdf') || 
        fileUrl.includes('application/pdf') ||
        fileUrl.includes('.pdf?') ||
        doc?.document_type === 'aic'
    );

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-3 sm:p-6 md:p-10 overflow-hidden">
            <div className="bg-white w-full max-w-7xl h-full max-h-[92vh] flex flex-col border border-stone-200 rounded-2xl shadow-2xl overflow-hidden modal-enter">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileText size={20} className="text-emerald-700" />
                            <h3 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight leading-none">
                                {doc.document_type_display}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                                ID: {doc.id}
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="text-[10px] font-medium text-stone-500">
                                Added on {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="btn-tactile p-2 text-stone-400 hover:text-stone-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content: Split View */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

                    {/* Left Panel: Visual Document with Viewer Controls */}
                    <div className="flex-1 bg-stone-50 overflow-auto p-4 md:p-6 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-4 flex-wrap gap-2">
                            {!isPdf ? (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleZoomOut}
                                        title="Zoom Out"
                                        className="btn-tactile p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg shadow-2xs transition-all"
                                    >
                                        <ZoomOut size={14} />
                                    </button>
                                    <span className="text-[10px] font-mono text-stone-600 w-12 text-center select-none bg-white py-1.5 border border-stone-200 rounded-md">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleZoomIn}
                                        title="Zoom In"
                                        className="btn-tactile p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg shadow-2xs transition-all"
                                    >
                                        <ZoomIn size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRotate}
                                        title="Rotate Clockwise"
                                        className="btn-tactile p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg shadow-2xs transition-all"
                                    >
                                        <RotateCw size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="btn-tactile px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-600 bg-white border border-stone-200 hover:bg-stone-100 rounded-lg shadow-2xs transition-all"
                                    >
                                        Reset
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">PDF Document</span>
                            )}

                            <div className="flex items-center gap-2">
                                <a 
                                    href={fileUrl} 
                                    download
                                    title="Download File"
                                    className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-lg shadow-2xs transition-all"
                                >
                                    <Download size={13} /> Download
                                </a>
                                <a 
                                    href={fileUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    title="Open in new window"
                                    className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 rounded-lg shadow-2xs transition-all"
                                >
                                    <ExternalLink size={13} /> Full View
                                </a>
                            </div>
                        </div>

                        {/* Visual Canvas */}
                        <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
                            {isPdf ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-white border border-stone-200 rounded-xl shadow-xs space-y-4">
                                    <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl">
                                        <FileText size={36} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold uppercase tracking-tight text-stone-900">
                                            Official PDF Document
                                        </h4>
                                        <p className="text-xs text-stone-500 font-normal leading-relaxed">
                                            This certificate is formatted as an official PDF. View it in your browser's PDF viewer or download a copy.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                                        <a
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn-tactile flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-all"
                                        >
                                            <ExternalLink size={14} /> Open in Browser
                                        </a>
                                        <a
                                            href={fileUrl}
                                            download
                                            className="btn-tactile flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs font-semibold border border-stone-200 rounded-lg transition-all"
                                        >
                                            <Download size={14} /> Download PDF
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="bg-white p-2 border border-stone-200 rounded-lg inline-block transition-transform duration-100 ease-out shadow-xs"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transformOrigin: 'center center',
                                    }}
                                >
                                    <img
                                        src={fileUrl}
                                        alt="Document Visual"
                                        className="max-w-full max-h-[60vh] object-contain rounded"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Data Summary */}
                    <div className="w-full md:w-[450px] overflow-y-auto bg-white p-6 sm:p-8 border-t md:border-t-0 md:border-l border-stone-200">
                        <div className="mb-6">
                            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Document Details</h4>
                            <p className="text-base font-bold text-stone-800 uppercase tracking-tight">Information Found</p>
                        </div>

                        <div className="space-y-5">
                            {(doc?.is_generated || doc?.document_type === 'aic') && (
                                <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-xl mb-4">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                                        Official Municipal Certification
                                    </h5>
                                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed font-normal">
                                        This Animal Inspection Certificate (AIC) was auto-generated and officially certified by the Municipal Agriculture Office (MAO) of Sariaya, Quezon.
                                    </p>
                                </div>
                            )}

                            {Object.keys(extracted).length > 0 ? (
                                Object.entries(extracted).map(([key, value]) => (
                                    <div key={key} className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            {remarks[key] && (
                                                <span className="bg-red-50 text-red-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-red-200 rounded-md">
                                                    Check this
                                                </span>
                                            )}
                                        </div>

                                        <div className={`p-3.5 rounded-lg border ${remarks[key] 
                                            ? 'bg-red-50/50 border-red-200' 
                                            : 'bg-stone-50 border-stone-200'
                                        }`}>
                                            <p className="text-xs font-semibold text-stone-800 font-mono break-words leading-normal">
                                                {value || <span className="text-stone-300">No info</span>}
                                            </p>
                                        </div>

                                        {remarks[key] && (
                                            <div className="flex items-start gap-1.5 mt-1 px-1">
                                                <Info size={13} className="text-red-600 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-medium text-stone-600 italic leading-snug">
                                                    Note: {remarks[key]}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : doc?.is_generated || doc?.document_type === 'aic' ? (
                                <div className="space-y-3">
                                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Inspection Status</p>
                                        <p className="text-xs font-medium text-stone-700">Verified apparently healthy at time of inspection with zero reported outbreak origin.</p>
                                    </div>
                                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Validity Window</p>
                                        <p className="text-xs font-medium text-stone-700">Valid within 48 hours for animal movement within the Province of Quezon.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-stone-50 border border-stone-200 rounded-xl border-dashed">
                                    <FileText className="mx-auto mb-3 text-stone-300" size={32} />
                                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">No details found for this document</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-stone-200 bg-white flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-tactile bg-emerald-700 hover:bg-emerald-600 text-white px-7 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DocumentViewModal;