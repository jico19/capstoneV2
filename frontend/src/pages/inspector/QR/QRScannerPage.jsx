import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ShieldCheck, Upload, ExternalLink, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

const QRScannerPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('camera');
    const [scanError, setScanError] = useState(null);
    const [scannedResult, setScannedResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [cameras, setCameras] = useState([]);
    
    const fileInputRef = useRef(null);
    const scannerRef = useRef(null);
    const isStartingRef = useRef(false);

    const getCameras = async () => {
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                setCameras(devices);
                setHasMultipleCameras(devices.length > 1);
            }
        } catch (err) {
            console.error("Error getting cameras", err);
        }
    };

    const startCamera = async (cameraIdx = 0) => {
        if (isStartingRef.current) return;
        
        isStartingRef.current = true;
        setScanError(null);
        setScannedResult(null);

        try {
            // Stop existing if any
            if (scannerRef.current?.isScanning) {
                await scannerRef.current.stop();
            }

            const readerEl = document.getElementById('reader');
            if (readerEl) readerEl.innerHTML = '';

            const qr = new Html5Qrcode('reader');
            scannerRef.current = qr;

            const config = { 
                fps: 15, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            // If we have specific cameras, use the ID, otherwise fallback to environment
            if (cameras.length > 0) {
                await qr.start(
                    cameras[cameraIdx].id,
                    config,
                    (decodedText) => handleScanSuccess(decodedText),
                    () => { }
                );
            } else {
                await qr.start(
                    { facingMode: 'environment' },
                    config,
                    (decodedText) => handleScanSuccess(decodedText),
                    () => { }
                );
            }

            setIsScanning(true);
            setCurrentCameraIndex(cameraIdx);
        } catch (err) {
            console.error("Camera Start Error:", err);
            const msg = err?.message || '';
            if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                setScanError('Please allow camera access in your settings to scan codes.');
            } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
                setScanError('We couldn\'t find a camera on your device.');
            } else {
                setScanError('Something went wrong starting the camera. Please try again.');
            }
            setIsScanning(false);
        } finally {
            isStartingRef.current = false;
        }
    };

    const switchCamera = () => {
        if (!hasMultipleCameras) return;
        const nextIdx = (currentCameraIndex + 1) % cameras.length;
        startCamera(nextIdx);
    };

    const stopCamera = async () => {
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
            } catch (e) {
                console.warn("Camera Stop Warning:", e);
            }
            const readerEl = document.getElementById('reader');
            if (readerEl) readerEl.innerHTML = '';
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScanSuccess = async (result) => {
        // Haptic feedback if supported
        if ('vibrate' in navigator) {
            navigator.vibrate(100);
        }
        await stopCamera();
        setScannedResult(result);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 30 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File size cannot exceed 30MB');
            return;
        }

        setScannedResult(null);
        setScanError(null);
        setIsUploading(true);

        try {
            const qrScanner = new Html5Qrcode('reader-file');
            const result = await qrScanner.scanFile(file, true);
            handleScanSuccess(result);
        } catch (err) {
            console.error("File Scan Error:", err);
            setScanError('We couldn\'t find a QR code in that image. Please try a clearer photo.');
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleOpenLink = () => {
        if (!scannedResult) return;
        let token = scannedResult;
        if (/^https?:\/\//i.test(scannedResult)) {
            try {
                const url = new URL(scannedResult);
                const pathParts = url.pathname.split('/').filter(p => p !== '');
                token = pathParts[pathParts.length - 1];
            } catch (e) {
                const parts = scannedResult.split('/').filter(p => p !== '');
                token = parts[parts.length - 1];
            }
        }
        navigate(`/inspector/verify/${token}/`);
    };

    const handleScanAnother = () => {
        setScannedResult(null);
        setScanError(null);
        if (activeTab === 'camera') startCamera(currentCameraIndex);
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setScannedResult(null);
        setScanError(null);
        if (tab === 'camera') {
            startCamera(currentCameraIndex);
        } else {
            stopCamera();
        }
    };

    useEffect(() => {
        const init = async () => {
            await getCameras();
            startCamera(0);
        };
        init();
        return () => { stopCamera(); };
    }, []);

    return (
        <div className="min-h-screen bg-stone-50 font-sans flex flex-col overflow-x-hidden">

            {/* Top Navigation */}
            <div className="p-6 pb-2 flex items-center gap-4 bg-white">
                <button
                    onClick={() => { stopCamera(); navigate(-1); }}
                    className="p-2 hover:bg-stone-100 transition-colors text-stone-900"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-stone-800">
                    QR Scanner
                </h1>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col items-center px-6 py-8 gap-8">

                {/* Viewport Container */}
                <div className="relative w-full max-w-[340px] aspect-square bg-white shadow-sm border border-stone-200">
                    
                    {/* Corner accents */}
                    <div className="absolute -top-[1px] -left-[1px] w-12 h-12 border-t-4 border-l-4 border-green-700 z-20" />
                    <div className="absolute -top-[1px] -right-[1px] w-12 h-12 border-t-4 border-r-4 border-green-700 z-20" />
                    <div className="absolute -bottom-[1px] -left-[1px] w-12 h-12 border-b-4 border-l-4 border-green-700 z-20" />
                    <div className="absolute -bottom-[1px] -right-[1px] w-12 h-12 border-b-4 border-r-4 border-green-700 z-20" />

                    <div className="absolute inset-0 overflow-hidden bg-stone-100">
                        {/* Camera feed */}
                        <div id="reader" className="w-full h-full object-cover" />
                        
                        {/* Hidden file reader node */}
                        <div id="reader-file" className="hidden" />

                        {/* Scan Line Animation */}
                        {isScanning && !scannedResult && (
                            <div className="absolute left-0 right-0 h-[2px] bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-scan-line z-10" />
                        )}

                        {/* Starting Overlay */}
                        {!isScanning && !scanError && activeTab === 'camera' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-50">
                                <Loader2 className="w-8 h-8 text-stone-300 animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                    Initializing...
                                </span>
                            </div>
                        )}

                        {/* Upload Placeholder */}
                        {activeTab === 'upload' && !scannedResult && !scanError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-stone-50">
                                <Upload size={48} className="text-stone-200" strokeWidth={1.5} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 text-center px-12">
                                    Upload a photo of the permit QR code
                                </p>
                            </div>
                        )}

                        {/* Error Overlay */}
                        {scanError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/95 px-8 z-30">
                                <AlertCircle size={32} className="text-red-600" />
                                <div className="text-center">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-stone-800 mb-1">
                                        Scan Failed
                                    </h3>
                                    <p className="text-[11px] font-medium text-stone-500 leading-relaxed">
                                        {scanError}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setScanError(null);
                                        if (activeTab === 'camera') startCamera(currentCameraIndex);
                                    }}
                                    className="px-6 py-2 bg-stone-900 text-white text-[10px] font-black uppercase tracking-widest rounded-none"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Camera Switcher */}
                    {isScanning && hasMultipleCameras && activeTab === 'camera' && (
                        <button 
                            onClick={switchCamera}
                            className="absolute bottom-4 right-4 p-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-none hover:bg-white/40 transition-colors z-20"
                        >
                            <RefreshCw size={20} />
                        </button>
                    )}
                </div>

                {/* Navigation Tabs */}
                <div className="flex w-full max-w-[340px] bg-white border border-stone-200">
                    <button
                        onClick={() => switchTab('camera')}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-colors ${
                            activeTab === 'camera' 
                            ? 'bg-stone-900 text-white' 
                            : 'text-stone-400 hover:bg-stone-50'
                        }`}
                    >
                        <Camera size={14} />
                        Live Camera
                    </button>
                    <button
                        onClick={() => switchTab('upload')}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest border-l border-stone-200 transition-colors ${
                            activeTab === 'upload' 
                            ? 'bg-stone-900 text-white' 
                            : 'text-stone-400 hover:bg-stone-50'
                        }`}
                    >
                        <Upload size={14} />
                        Upload File
                    </button>
                </div>

                {/* Action Area */}
                <div className="w-full max-w-[340px] space-y-4">
                    
                    {/* Upload Interaction */}
                    {activeTab === 'upload' && !scannedResult && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full h-16 bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 font-black text-xs uppercase tracking-widest rounded-none flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Analyzing Image...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} /> Choose QR Image
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {/* Scan Status */}
                    {activeTab === 'camera' && isScanning && !scannedResult && (
                        <div className="flex items-center justify-center gap-2 py-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                Scanning for permits...
                            </span>
                        </div>
                    )}

                    {/* Result Card */}
                    {scannedResult && (
                        <div className="w-full bg-white border border-stone-200 p-6 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                    Code Detected
                                </span>
                                <div className="px-2 py-0.5 bg-green-50 text-green-700 text-[8px] font-black uppercase tracking-widest border border-green-100">
                                    Valid Format
                                </div>
                            </div>
                            
                            <div className="bg-stone-50 p-3 border border-stone-100">
                                <p className="text-xs font-mono font-black text-stone-600 break-all leading-relaxed">
                                    {scannedResult}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={handleOpenLink}
                                    className="w-full h-12 bg-green-700 hover:bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-none flex items-center justify-center gap-2 transition-colors"
                                >
                                    Verify Permit <ExternalLink size={14} />
                                </button>
                                <button
                                    onClick={handleScanAnother}
                                    className="w-full h-12 border border-stone-200 hover:bg-stone-50 text-stone-600 font-black text-xs uppercase tracking-widest rounded-none flex items-center justify-center gap-2 transition-colors"
                                >
                                    Scan Another
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex flex-col items-center gap-1 pt-4 opacity-50">
                        <div className="flex items-center gap-2 text-stone-400">
                            <ShieldCheck size={14} />
                            <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                                Sariaya Municipal Agriculture
                            </span>
                        </div>
                        <p className="text-[8px] font-medium text-stone-400 uppercase tracking-widest">
                            Secure Inspection System v2.0
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0%   { top: 5%;   opacity: 0; }
                    20%  { opacity: 1; }
                    80%  { opacity: 1; }
                    100% { top: 95%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                /* Let html5-qrcode video fill the container cleanly */
                #reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }
                #reader > div { display: none !important; } /* hide default UI chrome */
            `}</style>
        </div>
    );
};

export default QRScannerPage;