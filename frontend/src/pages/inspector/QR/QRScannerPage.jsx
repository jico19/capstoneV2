import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ShieldCheck, Upload, ExternalLink, AlertCircle, Loader2, RefreshCw, QrCode } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';

import { stopAllMediaTracks } from '../../../lib/utils';

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
    const startingPromiseRef = useRef(null);
    const isMountedRef = useRef(true);

    const getCameras = async () => {
        try {
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0 && isMountedRef.current) {
                setCameras(devices);
                setHasMultipleCameras(devices.length > 1);
            }
        } catch (err) {
            console.error("Error getting cameras", err);
        }
    };

    const stopCamera = async () => {
        // Await any in-flight camera startup so we don't leave orphaned tracks
        if (startingPromiseRef.current) {
            try {
                await startingPromiseRef.current;
            } catch {
                // ignore
            }
        }

        const scanner = scannerRef.current;
        scannerRef.current = null;
        setIsScanning(false);

        if (scanner) {
            try {
                await scanner.stop();
            } catch {
                // ignore if already stopped or wasn't scanning
            }
            try {
                scanner.clear();
            } catch {
                // ignore
            }
        }

        // Hard-stop all media tracks on any video element
        stopAllMediaTracks();

        const readerEl = document.getElementById('reader');
        if (readerEl) readerEl.innerHTML = '';
    };

    const startCamera = async (cameraIdx = 0) => {
        if (!isMountedRef.current) return;
        setScanError(null);
        setScannedResult(null);

        // Ensure any previous scanner/tracks are fully stopped
        await stopCamera();
        if (!isMountedRef.current) return;

        try {
            const readerEl = document.getElementById('reader');
            if (!readerEl) return;
            readerEl.innerHTML = '';

            const qr = new Html5Qrcode('reader');
            scannerRef.current = qr;

            const config = {
                fps: 15,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrboxSize = Math.floor(minEdge * 0.75);
                    return { width: qrboxSize, height: qrboxSize };
                },
                aspectRatio: 1.0
            };

            const cameraIdOrConfig = (cameras.length > 0 && cameras[cameraIdx])
                ? cameras[cameraIdx].id
                : { facingMode: 'environment' };

            const startPromise = qr.start(
                cameraIdOrConfig,
                config,
                (decodedText) => handleScanSuccess(decodedText),
                () => { }
            );
            startingPromiseRef.current = startPromise;

            await startPromise;

            // If component unmounted while awaiting camera permission / stream start:
            if (!isMountedRef.current) {
                try {
                    await qr.stop();
                } catch {
                    // ignore
                }
                try {
                    qr.clear();
                } catch {
                    // ignore
                }
                stopAllMediaTracks();
                scannerRef.current = null;
                return;
            }

            setIsScanning(true);
            setCurrentCameraIndex(cameraIdx);
        } catch (err) {
            if (!isMountedRef.current) {
                stopAllMediaTracks();
                return;
            }
            console.error("Camera Start Error:", err);
            const msg = err?.message || '';
            if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                setScanError('Camera permission was denied. Please allow camera access in browser settings.');
            } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
                setScanError('No camera found on this device. You can upload a photo of the QR code instead.');
            } else {
                setScanError('Could not initialize the camera. Tap Try Again or upload a photo.');
            }
            setIsScanning(false);
        } finally {
            startingPromiseRef.current = null;
        }
    };

    const switchCamera = () => {
        if (!hasMultipleCameras) return;
        const nextIdx = (currentCameraIndex + 1) % cameras.length;
        startCamera(nextIdx);
    };

    const handleScanSuccess = async (result) => {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(100);
            } catch {
                // Ignore vibration failure
            }
        }
        await stopCamera();
        setScannedResult(result);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('File size cannot exceed 20MB');
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
            setScanError('No QR code detected in the uploaded image. Please ensure the code is clear and in focus.');
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
            } catch {
                const parts = scannedResult.split('/').filter(p => p !== '');
                token = parts[parts.length - 1];
            }
        }
        navigate(`/inspector/verify/${token}/`);
    };

    const handleScanAnother = () => {
        setScannedResult(null);
        setScanError(null);
        if (activeTab === 'camera') {
            startCamera(currentCameraIndex);
        }
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
        isMountedRef.current = true;

        const init = async () => {
            await getCameras();
            if (isMountedRef.current) {
                startCamera(0);
            }
        };
        init();

        const handlePageHide = () => {
            stopAllMediaTracks();
        };
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);

        return () => {
            isMountedRef.current = false;
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            stopCamera();
            stopAllMediaTracks();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-stone-50 font-sans flex flex-col">
            {/* Header with 44px+ touch target back button */}
            <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <button
                        onClick={async () => {
                            await stopCamera();
                            stopAllMediaTracks();
                            navigate(-1);
                        }}
                        className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-700 active:scale-95 transition-all"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-stone-900 leading-none">
                            QR Permit Scanner
                        </h1>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Checkpoint Verification
                        </span>
                    </div>
                </div>

                {hasMultipleCameras && activeTab === 'camera' && isScanning && (
                    <button
                        onClick={switchCamera}
                        className="h-11 px-3 flex items-center gap-1.5 text-xs font-bold text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors border border-stone-200"
                        title="Switch Camera"
                    >
                        <RefreshCw size={15} />
                        <span className="hidden sm:inline">Flip</span>
                    </button>
                )}
            </header>

            {/* Main Area: Centered, fluid width */}
            <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 sm:py-6 flex flex-col items-center gap-4">
                {/* Mode Selector Tabs (min 44px touch targets) */}
                <div className="w-full grid grid-cols-2 p-1 bg-stone-200/80 rounded-xl gap-1">
                    <button
                        onClick={() => switchTab('camera')}
                        className={`h-11 flex items-center justify-center gap-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                            activeTab === 'camera'
                                ? 'bg-white text-stone-900 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <Camera size={16} />
                        Live Camera
                    </button>
                    <button
                        onClick={() => switchTab('upload')}
                        className={`h-11 flex items-center justify-center gap-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                            activeTab === 'upload'
                                ? 'bg-white text-stone-900 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                        }`}
                    >
                        <Upload size={16} />
                        Upload Image
                    </button>
                </div>

                {/* Viewfinder Card */}
                <div className="w-full relative aspect-square max-h-[380px] bg-stone-900 rounded-xl overflow-hidden border border-stone-300 shadow-xs flex items-center justify-center">
                    {/* Camera Feed Target */}
                    <div id="reader" className="w-full h-full object-cover" />
                    <div id="reader-file" className="hidden" />

                    {/* Camera Corner Guides (Clean, non-slop tactile markers) */}
                    {activeTab === 'camera' && isScanning && !scannedResult && (
                        <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
                            <div className="flex justify-between">
                                <div className="w-8 h-8 border-t-3 border-l-3 border-green-500 rounded-tl-sm" />
                                <div className="w-8 h-8 border-t-3 border-r-3 border-green-500 rounded-tr-sm" />
                            </div>
                            <div className="flex justify-between">
                                <div className="w-8 h-8 border-b-3 border-l-3 border-green-500 rounded-bl-sm" />
                                <div className="w-8 h-8 border-b-3 border-r-3 border-green-500 rounded-br-sm" />
                            </div>
                        </div>
                    )}

                    {/* Camera Initializing Overlay */}
                    {!isScanning && !scanError && activeTab === 'camera' && !scannedResult && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-900 text-stone-300">
                            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
                                Starting Camera...
                            </span>
                        </div>
                    )}

                    {/* Upload Mode Prompt */}
                    {activeTab === 'upload' && !scannedResult && !scanError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                                <Upload size={28} />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-stone-800">
                                    Upload Permit Photo
                                </p>
                                <p className="text-[11px] text-stone-500 mt-1 max-w-xs">
                                    Select a screenshot or photo of the driver's transport permit QR code.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error Overlay */}
                    {scanError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white p-6 text-center z-20">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                <AlertCircle size={24} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
                                    Scanner Issue
                                </h3>
                                <p className="text-[11px] text-stone-600 leading-relaxed max-w-xs">
                                    {scanError}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setScanError(null);
                                    if (activeTab === 'camera') startCamera(currentCameraIndex);
                                }}
                                className="h-11 px-5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors mt-2"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                {/* Status indicator under camera */}
                {activeTab === 'camera' && isScanning && !scannedResult && (
                    <div className="flex items-center gap-2 text-stone-500 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                        <span>Center the permit QR code inside the frame</span>
                    </div>
                )}

                {/* Action Controls */}
                <div className="w-full space-y-3">
                    {/* Upload File Input & Trigger */}
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
                                className="w-full h-13 bg-green-700 hover:bg-green-600 active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Scanning Image...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} /> Select Image File
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {/* Result Card: When QR is Detected */}
                    {scannedResult && (
                        <div className="w-full bg-white border border-stone-200 rounded-xl p-5 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <QrCode size={18} className="text-green-700" />
                                    <span className="text-xs font-black uppercase tracking-wider text-stone-900">
                                        QR Code Detected
                                    </span>
                                </div>
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-black uppercase tracking-wider rounded-md border border-green-200">
                                    Ready
                                </span>
                            </div>

                            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                                <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block mb-0.5">
                                    Payload / Token
                                </span>
                                <p className="text-xs font-mono font-bold text-stone-800 break-all leading-relaxed">
                                    {scannedResult}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2.5">
                                <button
                                    onClick={handleOpenLink}
                                    className="flex-1 h-12 bg-green-700 hover:bg-green-600 active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all"
                                >
                                    Verify Permit <ExternalLink size={15} />
                                </button>
                                <button
                                    onClick={handleScanAnother}
                                    className="h-12 px-5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
                                >
                                    Scan Another
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                #reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }
                #reader > div { display: none !important; }
            `}</style>
        </div>
    );
};

export default QRScannerPage;