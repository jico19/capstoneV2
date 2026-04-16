import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ShieldCheck, Upload, ExternalLink, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScannerPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('camera');
    const [cameraError, setCameraError] = useState(null);
    const [scannedResult, setScannedResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef(null);
    const scannerRef = useRef(null);

    const startCamera = async () => {
        setCameraError(null);
        setScannedResult(null);

        try {
            // Clean up any existing scanner instance first
            if (scannerRef.current) {
                await scannerRef.current.stop().catch(() => { });
                scannerRef.current = null;
            }

            const qr = new Html5Qrcode('reader');
            scannerRef.current = qr;

            await qr.start(
                { facingMode: 'environment' }, // rear camera
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                () => { } // suppress per-frame errors
            );

            setIsScanning(true);
        } catch (err) {
            const msg = err?.message || '';
            if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                setCameraError('Camera permission denied. Please allow access and try again.');
            } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
                setCameraError('No camera found on this device.');
            } else {
                setCameraError('Could not start camera. Please try again.');
            }
            setIsScanning(false);

            // Retry automatically after 2s if permission was the issue
            setTimeout(() => startCamera(), 2000);
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current) {
            await scannerRef.current.stop().catch(() => { });
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScanSuccess = async (result) => {
        await stopCamera();
        console.log(result)
        setScannedResult(result);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 30 * 1024 * 1024; // 30MB
        if (file.size > maxSize) {
            alert('File size cannot exceed 30MB');
            return;
        }

        setScannedResult(null);

        const qr = new Html5Qrcode('reader-file');
        qr.scanFile(file, true)
            .then(handleScanSuccess)
            .catch(() => alert('No QR code found in the selected image.'));
    };

    const handleOpenLink = () => {
        if (!scannedResult) return;
        const isUrl = /^https?:\/\//i.test(scannedResult);
        if (isUrl) {
            window.open(scannedResult, '_blank', 'noopener,noreferrer');
        } else {
            navigate(`/result/${encodeURIComponent(scannedResult)}`);
        }
    };

    const handleScanAnother = () => {
        setScannedResult(null);
        if (activeTab === 'camera') startCamera();
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
        setScannedResult(null);
        if (tab === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
    };

    // Auto-start camera on mount
    useEffect(() => {
        startCamera();
        return () => { stopCamera(); };
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col">

            {/* Top Navigation */}
            <div className="p-6 flex items-center gap-4">
                <button
                    onClick={() => { stopCamera(); navigate(-1); }}
                    className="p-2 hover:bg-gray-100 transition-colors text-gray-900 rounded-lg"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-black uppercase tracking-tighter text-gray-900">
                    QR Scanner
                </h1>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col items-center px-8 pb-20 gap-6">

                {/* Viewport */}
                <div className="relative w-full max-w-sm aspect-square">
                    <div className="absolute inset-0 border-2 border-dashed border-gray-200 bg-gray-50/50 rounded-[2.5rem]" />
                    <div className="absolute inset-8">
                        {/* Corners */}
                        <div className="absolute top-0 left-0 w-12 h-12 border-t-[6px] border-l-[6px] border-green-700 rounded-tl-2xl" />
                        <div className="absolute top-0 right-0 w-12 h-12 border-t-[6px] border-r-[6px] border-green-700 rounded-tr-2xl" />
                        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-[6px] border-l-[6px] border-green-700 rounded-bl-2xl" />
                        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-[6px] border-r-[6px] border-green-700 rounded-br-2xl" />

                        {/* Camera feed renders here — html5-qrcode injects video into #reader */}
                        <div
                            id="reader"
                            className="absolute inset-0 overflow-hidden rounded-xl"
                        />

                        {/* Hidden element for file scanning (html5-qrcode needs a DOM node) */}
                        <div id="reader-file" className="hidden" />

                        {/* Overlay: shown when camera is not active */}
                        {!isScanning && !cameraError && activeTab === 'camera' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50/80 rounded-xl">
                                <div className="text-green-700/30">
                                    <Camera size={64} strokeWidth={1.5} />
                                </div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center">
                                    Starting camera...
                                </p>
                            </div>
                        )}

                        {/* Overlay: upload tab placeholder */}
                        {activeTab === 'upload' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-xl">
                                <div className="text-green-700/20">
                                    <Upload size={64} strokeWidth={1.5} />
                                </div>
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center max-w-[140px]">
                                    Upload a QR image
                                </p>
                            </div>
                        )}

                        {/* Error overlay */}
                        {cameraError && activeTab === 'camera' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-50 rounded-xl px-4">
                                <AlertCircle size={32} className="text-red-400" />
                                <p className="text-red-500 text-xs font-bold text-center">
                                    {cameraError}
                                </p>
                                <p className="text-red-400 text-[10px] text-center">
                                    Retrying automatically...
                                </p>
                            </div>
                        )}

                        {/* Active scan line animation */}
                        {isScanning && (
                            <div className="absolute left-0 right-0 h-1 bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-scan-line pointer-events-none" />
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex w-full max-w-sm border border-gray-200 rounded-xl overflow-hidden">
                    <button
                        onClick={() => switchTab('camera')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors ${activeTab === 'camera'
                                ? 'bg-gray-100 text-gray-900'
                                : 'bg-white text-gray-400 hover:bg-gray-50'
                            }`}
                    >
                        <Camera size={15} />
                        Camera
                    </button>
                    <button
                        onClick={() => switchTab('upload')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-l border-gray-200 transition-colors ${activeTab === 'upload'
                                ? 'bg-gray-100 text-gray-900'
                                : 'bg-white text-gray-400 hover:bg-gray-50'
                            }`}
                    >
                        <Upload size={15} />
                        Upload
                    </button>
                </div>

                {/* Actions */}
                <div className="w-full max-w-sm space-y-3">

                    {/* Upload button */}
                    {activeTab === 'upload' && (
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
                                className="w-full h-14 border-2 border-gray-200 hover:bg-gray-50 text-gray-800 font-black text-base rounded-xl flex items-center justify-center gap-3 transition-colors"
                            >
                                <Upload size={20} /> Choose QR Image
                            </button>
                        </>
                    )}

                    {/* Camera status */}
                    {activeTab === 'camera' && isScanning && !scannedResult && (
                        <p className="text-center text-xs font-bold uppercase tracking-widest text-green-600">
                            Live — Point at a QR code
                        </p>
                    )}

                    {/* Result Card */}
                    {scannedResult && (
                        <div className="w-full border border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Scanned Result
                            </p>
                            <p className="text-sm text-green-700 font-semibold break-all">
                                {scannedResult}
                            </p>
                            <button
                                onClick={handleOpenLink}
                                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                Open Link <ExternalLink size={16} />
                            </button>
                            <button
                                onClick={handleScanAnother}
                                className="w-full h-11 border-2 border-gray-200 hover:bg-gray-100 text-gray-700 font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                            >
                                Scan Another
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-gray-400 pt-1">
                        <ShieldCheck size={15} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            Secure Permit Verification
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0%   { top: 0%;   opacity: 0; }
                    10%  { opacity: 1; }
                    90%  { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan 1.5s linear infinite;
                }
                /* Let html5-qrcode video fill the container cleanly */
                #reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 12px;
                }
                #reader > div { display: none !important; } /* hide default UI chrome */
            `}</style>
        </div>
    );
};

export default QRScannerPage;