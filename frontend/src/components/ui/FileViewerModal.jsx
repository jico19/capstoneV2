import { useState } from 'react';
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

/**
 * Universal In-App Document Viewer Modal
 * Supports both Image and PDF files.
 * Provides controls for zoom, rotation, reset, download, and external view.
 */
const FileViewerModal = ({ isOpen, onClose, fileUrl, title = "Document Preview", subtitle }) => {

    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    if (!isOpen || !fileUrl) return null;

    const isPdf = typeof fileUrl === 'string' && (
        fileUrl.toLowerCase().endsWith('.pdf') || 
        fileUrl.includes('application/pdf') ||
        fileUrl.includes('.pdf?')
    );

    const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
    const handleReset = () => {
        setZoom(1);
        setRotation(0);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-6 animate-in fade-in duration-150">
            <div 
                className={`bg-white border-2 border-stone-800 flex flex-col shadow-2xl transition-all ${
                    isFullscreen 
                        ? 'w-screen h-screen max-w-none max-h-none rounded-none' 
                        : 'w-full max-w-5xl h-[88vh] rounded-none'
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
                                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors"
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
                                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors"
                                >
                                    <ZoomIn size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRotate}
                                    title="Rotate Clockwise"
                                    className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors"
                                >
                                    <RotateCw size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200"
                                >
                                    Reset
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors hidden sm:inline-flex"
                        >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>

                        <a
                            href={fileUrl}
                            download
                            target="_blank"
                            rel="noreferrer"
                            title="Download Original"
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors"
                        >
                            <Download size={16} />
                        </a>

                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in New Tab"
                            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200 transition-colors"
                        >
                            <ExternalLink size={16} />
                        </a>

                        <div className="h-5 w-px bg-stone-200 mx-1" />

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Canvas */}
                <div className="flex-1 overflow-auto bg-stone-100 flex items-center justify-center p-4 relative select-none">
                    {isPdf ? (
                        <iframe
                            src={fileUrl}
                            title={title}
                            className="w-full h-full border-0 bg-white"
                        />
                    ) : (
                        <div 
                            className="transition-transform duration-100 ease-out inline-block max-w-full max-h-full"
                            style={{
                                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                transformOrigin: 'center center',
                            }}
                        >
                            <img
                                src={fileUrl}
                                alt={title}
                                className="max-w-full max-h-[70vh] object-contain shadow-md border border-stone-300 bg-white"
                                draggable={false}
                            />
                        </div>
                    )}
                </div>

                {/* Footer status */}
                <div className="px-4 py-2 bg-stone-50 border-t border-stone-200 flex justify-between items-center text-[10px] text-stone-500 font-mono">
                    <span>{isPdf ? "PDF Document Viewer" : "Image Document Viewer"}</span>
                    <span>Press ESC or click close to dismiss</span>
                </div>
            </div>
        </div>
    );
};

export default FileViewerModal;

