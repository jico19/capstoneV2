import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
    X, 
    ZoomIn, 
    ZoomOut, 
    RotateCw, 
    Download, 
    ExternalLink, 
    FileText, 
    Maximize2, 
    Minimize2 
} from 'lucide-react';
import { getAuthenticatedMediaUrl } from '../../lib/utils';

/**
 * Universal In-App Document Viewer Modal
 * Supports both Image and PDF files.
 * Provides controls for zoom, rotation, reset, download, and external view.
 * Uses React Portal to prevent CSS transform containing block trapping from parent modals.
 */
const FileViewerModal = ({ isOpen, onClose, fileUrl, title = "Document Preview", subtitle }) => {

    const [imageFailed, setImageFailed] = useState(false);
    const [imageAttempt, setImageAttempt] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen || !fileUrl || typeof document === 'undefined') return null;

    const resolvedUrl = getAuthenticatedMediaUrl(fileUrl);

    const isPdf = typeof resolvedUrl === 'string' && (
        resolvedUrl.toLowerCase().endsWith('.pdf') || 
        resolvedUrl.includes('application/pdf') ||
        resolvedUrl.includes('.pdf?')
    );

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };

    return createPortal(
        <div 
            onClick={onClose}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-2 sm:p-6 animate-in fade-in duration-150"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className={`bg-white border border-stone-200 flex flex-col shadow-xl transition-all ${
                    isFullscreen 
                        ? 'w-screen h-screen max-w-none max-h-none rounded-none' 
                        : 'w-full max-w-5xl h-[88vh] rounded-xl overflow-hidden'
                }`}
            >
                {/* Top Control Bar */}
                <div className="flex flex-wrap items-center justify-between px-4 py-3 border-b border-stone-200 bg-white gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText size={18} className="text-green-700 flex-shrink-0" />
                        <div className="min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold text-stone-900 uppercase tracking-tight truncate">
                                {title}
                            </h3>
                            {subtitle && (
                                <p className="text-[10px] text-stone-500 truncate">{subtitle}</p>
                            )}
                        </div>
                    </div>


                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {!isPdf && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleZoomOut}
                                    title="Zoom Out"
                                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors"
                                >
                                    <ZoomOut size={16} />
                                </button>
                                <span className="text-[10px] font-mono text-stone-500 w-10 text-center select-none">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={handleZoomIn}
                                    title="Zoom In"
                                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors"
                                >
                                    <ZoomIn size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRotate}
                                    title="Rotate Clockwise"
                                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors"
                                >
                                    <RotateCw size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors"
                                >
                                    Reset
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors hidden sm:inline-flex"
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>

                        <a
                            href={resolvedUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            title="Download Original"
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors"
                        >
                            <Download size={16} />
                        </a>

                        <a
                            href={resolvedUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in New Tab"
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 rounded-lg shadow-2xs transition-colors"
                        >
                            <ExternalLink size={16} />
                        </a>

                        <div className="h-5 w-px bg-stone-200 mx-1" />

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Canvas */}
                <div className="flex-1 overflow-auto bg-stone-100 flex items-center justify-center p-4 relative select-none">
                    {isPdf ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-white border border-stone-200 rounded-xl shadow-xs space-y-4">
                            <div className="p-4 bg-stone-900 text-white rounded-lg">
                                <FileText size={44} />
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-sm font-black uppercase tracking-tight text-stone-900">
                                    Official PDF Document
                                </h4>
                                <p className="text-xs text-stone-500 font-medium leading-relaxed">
                                    This document is formatted as a PDF. Open it directly in your browser's built-in Google PDF viewer or download a copy.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                                <a
                                    href={resolvedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white text-[11px] font-black uppercase tracking-widest transition-colors"
                                >
                                    <ExternalLink size={15} /> Open in Browser PDF Viewer
                                </a>
                                <a
                                    href={resolvedUrl}
                                    download
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-white text-[11px] font-black uppercase tracking-widest transition-colors"
                                >
                                    <Download size={15} /> Download
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div 
                            className="transition-transform duration-100 ease-out inline-block max-w-full max-h-full"
                            style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                transformOrigin: 'center center',
                            }}
                        >
                            {imageFailed && <div role="alert" className="bg-white p-6 text-stone-800"><p>{navigator.onLine ? 'The document could not be loaded.' : 'You?re offline. Check your internet connection.'}</p><button type="button" onClick={() => { setImageFailed(false); setImageAttempt(n => n + 1); }}>Try again</button></div>}
                            <img
                                key={`${resolvedUrl}-${imageAttempt}`}
                                onError={() => setImageFailed(true)}
                                onLoad={() => setImageFailed(false)}
                                hidden={imageFailed}
                                src={resolvedUrl}
                                alt={title}
                                className="max-w-full max-h-[70vh] object-contain shadow-md border border-stone-300 bg-white"
                                draggable={false}
                            />
                        </div>
                    )}
                </div>

                {/* Footer status */}
                <div className="px-4 py-2 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-500 font-mono">
                    <span>{isPdf ? "PDF Document" : "Image Document Viewer"}</span>
                    <span>Press ESC or click close to dismiss</span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FileViewerModal;

