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

                    {/* Left Panel: Visual Document with Viewer Controls */}
                    <div className="flex-1 bg-stone-50 overflow-auto p-4 md:p-8 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-4 flex-wrap gap-2">
                            {!isPdf ? (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={handleZoomOut}
                                        title="Zoom Out"
                                        className="p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                                    >
                                        <ZoomOut size={14} />
                                    </button>
                                    <span className="text-[10px] font-mono text-stone-500 w-12 text-center select-none bg-white py-1.5 border border-stone-200">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleZoomIn}
                                        title="Zoom In"
                                        className="p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                                    >
                                        <ZoomIn size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRotate}
                                        title="Rotate Clockwise"
                                        className="p-1.5 bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                                    >
                                        <RotateCw size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-stone-600 bg-white border border-stone-200 hover:bg-stone-100"
                                    >
                                        Reset
                                    </button>
                                </div>
                            ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">PDF Document</span>
                            )}

                            <div className="flex items-center gap-1.5">
                                <a 
                                    href={fileUrl} 
                                    download
                                    title="Download File"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-600 hover:bg-stone-100 transition-colors rounded-none"
                                >
                                    <Download size={14} /> Download
                                </a>
                                <a 
                                    href={fileUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    title="Open in new window"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 text-[10px] font-black uppercase tracking-widest text-stone-600 hover:bg-stone-100 transition-colors rounded-none"
                                >
                                    <ExternalLink size={14} /> Full View
                                </a>
                            </div>
                        </div>

                        {/* Visual Canvas */}
                        <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
                            {isPdf ? (
                                <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-white border border-stone-200 shadow-sm space-y-4">
                                    <div className="p-4 bg-stone-900 text-white">
                                        <FileText size={44} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h4 className="text-sm font-black uppercase tracking-tight text-stone-900">
                                            Official PDF Document
                                        </h4>
                                        <p className="text-xs text-stone-500 font-medium leading-relaxed">
                                            This certificate is formatted as an official PDF. View it in your browser's built-in Google PDF viewer or download a local copy.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                                        <a
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-[11px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            <ExternalLink size={15} /> Open in Browser PDF Viewer
                                        </a>
                                        <a
                                            href={fileUrl}
                                            download
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-white text-[11px] font-black uppercase tracking-widest transition-colors"
                                        >
                                            <Download size={15} /> Download PDF
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    className="bg-white p-2 border border-stone-200 inline-block transition-transform duration-100 ease-out"
                                    style={{
                                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                        transformOrigin: 'center center',
                                    }}
                                >
                                    <img
                                        src={fileUrl}
                                        alt="Document Visual"
                                        className="max-w-full max-h-[60vh] object-contain"
                                    />
                                </div>
                            )}
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
                            ) : doc?.is_generated || doc?.document_type === 'aic' ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-green-50 border-l-4 border-green-700">
                                        <h5 className="text-xs font-black uppercase tracking-wider text-green-900">
                                            Official Municipal Certification
                                        </h5>
                                        <p className="text-xs text-green-800 mt-1.5 leading-relaxed font-medium">
                                            This Animal Inspection Certificate (AIC) was auto-generated and officially certified by the Municipal Agriculture Office (MAO) of Sariaya, Quezon.
                                        </p>
                                    </div>
                                    <div className="p-4 bg-stone-50 border border-stone-200 space-y-1.5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Inspection Status</p>
                                        <p className="text-xs font-bold text-stone-700">Verified apparently healthy at time of inspection with zero reported outbreak origin.</p>
                                    </div>
                                    <div className="p-4 bg-stone-50 border border-stone-200 space-y-1.5">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Validity Window</p>
                                        <p className="text-xs font-bold text-stone-700">Valid within 48 hours for animal movement within the Province of Quezon.</p>
                                    </div>
                                </div>
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