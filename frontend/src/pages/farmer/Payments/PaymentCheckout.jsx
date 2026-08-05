import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CreditCard, Wallet, FileText, CheckCircle2, ChevronRight, AlertCircle, Download, Info, Clock, QrCode } from 'lucide-react';
import { api } from '../../../lib/api';
import { useApplicationDetail } from '/src/hooks/useApplications';
import { toast } from 'sonner';
import ConfirmationModal from '/src/components/ui/ConfirmationModal';

// Timer component for QR Ph code expiration countdown
const QRCountDown = ({ expiresAt, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const expiry = new Date(expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft('EXPIRED');
                if (onExpire) onExpire();
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [expiresAt, onExpire]);

    return (
        <span className="font-mono text-sm font-bold text-amber-700">{timeLeft}</span>
    );
};

const PaymentCheckout = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalPrice, setTotalprice] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    
    // QR Ph related states
    const [paymentMode, setPaymentMode] = useState('online'); // 'online' or 'qrph'
    const [qrData, setQrData] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    const { data: application, isLoading: isApplicationLoading, isError } = useApplicationDetail(id);

    const handleProceedToPayment = async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (paymentMode === 'online') {
                // Call backend endpoint that triggers create_checkout_session()
                const response = await api.post(`/payment/${id}/checkout_session/`, { total_price: totalPrice });
                const checkoutUrl = response.data.checkout_url;

                if (checkoutUrl) {
                    toast.info("Redirecting to Secure Payment", {
                        description: "Please complete the transaction on the payment gateway."
                    });
                    window.location.href = checkoutUrl;
                } else {
                    throw new Error("No checkout URL received from server.");
                }
            } else {
                // Call backend endpoint to generate QR Ph payment
                const response = await api.post(`/payment/${id}/create_qrph_payment/`, { total_price: totalPrice });
                setQrData(response.data);
                setIsExpired(false);
                setIsPolling(true);
                setIsLoading(false);
                toast.success("QR Code Generated", {
                    description: "Save this QR code and present it at any local store."
                });
            }
        } catch (err) {
            console.error(err);
            setError("Failed to initialize payment. Please try again.");
            toast.error("Payment Error", {
                description: "Could not initialize the payment session. Please try again later."
            });
            setIsLoading(false);
        }
    };

    // Polling effect for QR Ph status checks
    useEffect(() => {
        if (!isPolling || !id) return;

        const checkStatus = async () => {
            try {
                const res = await api.post(`/payment/${id}/verify_paymongo_session/`);
                if (res.data && res.data.verified) {
                    setIsPolling(false);
                    toast.success("Payment Received!", {
                        description: "Your payment has been successfully verified."
                    });
                    navigate(`/farmer/payment/success/${id}`);
                }
            } catch (err) {
                console.error("Polling status check failed:", err);
            }
        };

        // Initial check
        checkStatus();
        const intervalId = setInterval(checkStatus, 5000); // Check every 5 seconds

        return () => clearInterval(intervalId);
    }, [isPolling, id, navigate]);

    useEffect(() => {
        if (application) {
            setTotalprice(application.permit_fee || 150.00);
        }
    }, [application]);

    // Handle back-forward cache (bfcache) restore when navigating back from a redirect
    useEffect(() => {
        const handlePageShow = (event) => {
            setIsLoading(false);
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    const handleSaveQR = () => {
        if (!qrData?.qr_image_url) return;
        const link = document.createElement('a');
        link.href = qrData.qr_image_url;
        link.download = `FarmPass_QRPH_Payment_${totalPrice}PHP.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Saved!", {
            description: "QR code saved to your phone. You can find it in your Gallery."
        });
    };

    const handleCancelQR = () => {
        setQrData(null);
        setIsPolling(false);
        setIsExpired(false);
        setIsLoading(false);
    };

    if (isApplicationLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Loading payment details...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-3xl mx-auto p-8 mt-12">
                <div className="bg-red-50 border border-red-200 p-8 flex flex-col items-center text-center gap-4 rounded-none">
                    <AlertCircle size={32} className="text-red-600" />
                    <p className="text-xs font-black uppercase tracking-widest text-red-700">Failed to load application data</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-xs font-bold text-red-600 underline uppercase"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {showConfirm && (
                <ConfirmationModal
                    isOpen={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    onYes={async () => {
                        setShowConfirm(false);
                        await handleProceedToPayment();
                    }}
                    title={paymentMode === 'online' ? "Confirm Fee Payment?" : "Generate Payment QR?"}
                    message={
                        paymentMode === 'online'
                            ? `Are you sure you want to proceed to pay the permit fee of ₱${totalPrice}? This will open the secure PayMongo checkout gateway.`
                            : `Generate a dynamic QR Ph code for ₱${totalPrice}? You can save this code and show it at any local store to pay in cash.`
                    }
                    yesText={paymentMode === 'online' ? "Proceed to Pay" : "Generate QR"}
                    yesVariant="success"
                    type="success"
                    isSubmitting={isLoading}
                />
            )}
            <div className="min-h-screen bg-stone-50/50 p-6 lg:p-12">
                <div className="max-w-4xl mx-auto space-y-10">

                    {/* Navigation */}
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-800 font-black text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to Application
                    </button>

                    {/* Header */}
                    <div className="flex items-center gap-5 border-b border-stone-200 pb-10">
                        <div className="p-4 bg-white border border-stone-200 text-stone-800 rounded-none shrink-0">
                            <Wallet size={24} />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none">
                                Payment Checkout
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                Secure Municipal Fee Collection
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-600 p-4 flex gap-3 rounded-none">
                            <AlertCircle size={18} className="text-red-600 shrink-0" />
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

                        {/* Left Column: Summary and Options / QR Info */}
                        <div className="lg:col-span-3 space-y-6">
                            
                            {/* Summary Card */}
                            <div className="bg-white border border-stone-200 rounded-none overflow-hidden">
                                <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50">
                                    <h2 className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={14} /> Application Summary
                                    </h2>
                                </div>
                                <div className="p-6 divide-y divide-stone-100">
                                    <div className="flex justify-between py-4 first:pt-0">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Reference ID</span>
                                        <span className="font-mono font-black text-stone-800 text-sm">{application?.application_id}</span>
                                    </div>
                                    <div className="flex justify-between py-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Destination</span>
                                        <span className="font-black text-stone-800 text-xs uppercase text-right max-w-[200px]">
                                            {application?.destination}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-4">
                                        <span className="text-xs font-black uppercase tracking-widest text-stone-800">Official Permit Fee</span>
                                        <span className="text-2xl font-black text-green-700 font-mono">₱{totalPrice}</span>
                                    </div>
                                    <div className="flex justify-between py-4 last:pb-0 border-t border-stone-100">
                                        <span className="text-xs font-black uppercase tracking-widest text-stone-800">Total Due</span>
                                        <span className="text-2xl font-black text-green-700 font-mono">₱{totalPrice}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method Selector (Only shown if QR has not been generated yet) */}
                            {!qrData && (
                                <div className="bg-white border border-stone-200 p-6 space-y-4">
                                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                        Select Payment Method
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setPaymentMode('online')}
                                            className={`p-4 border text-left flex flex-col justify-between h-32 rounded-none transition-all ${
                                                paymentMode === 'online'
                                                    ? 'border-green-700 bg-green-50/20 text-stone-800'
                                                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                                            }`}
                                        >
                                            <CreditCard size={20} className={paymentMode === 'online' ? 'text-green-700' : 'text-stone-400'} />
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase tracking-widest">Pay Online</p>
                                                <p className="text-[9px] font-semibold text-stone-400 leading-normal uppercase">GCash, Maya, cards online</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setPaymentMode('qrph')}
                                            className={`p-4 border text-left flex flex-col justify-between h-32 rounded-none transition-all ${
                                                paymentMode === 'qrph'
                                                    ? 'border-green-700 bg-green-50/20 text-stone-800'
                                                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                                            }`}
                                        >
                                            <QrCode size={20} className={paymentMode === 'qrph' ? 'text-green-700' : 'text-stone-400'} />
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase tracking-widest">Sari-Sari Store Cash Payment</p>
                                                <p className="text-[9px] font-semibold text-stone-400 leading-normal uppercase">Save QR code & pay cash at any store</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Secure gateway trust text */}
                            {!qrData && (
                                <div className="flex gap-4 p-5 bg-stone-100 border border-stone-200">
                                    <ShieldCheck size={20} className="text-stone-400 shrink-0" />
                                    <p className="text-[10px] font-medium text-stone-500 leading-relaxed uppercase tracking-widest">
                                        Your payment is processed through a secure gateway. No sensitive card information is stored on our servers.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Checkout actions / QR Ph Instructions */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {!qrData ? (
                                <div className="space-y-6">
                                    <button
                                        onClick={() => setShowConfirm(true)}
                                        disabled={isLoading}
                                        className="bg-green-700 hover:bg-green-600 text-white w-full py-5 rounded-none font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="loading loading-spinner loading-sm"></span>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                {paymentMode === 'online' ? "Pay Online" : "Get QR Code"} <ChevronRight size={18} />
                                            </>
                                        )}
                                    </button>

                                    <div className="flex items-center justify-center gap-2 py-4 grayscale opacity-50">
                                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em]">Powered by PayMongo</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-stone-200 p-6 space-y-6 rounded-none">
                                    
                                    {/* Timer/Status Banner */}
                                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 flex justify-between items-center">
                                        <div className="flex gap-2 items-center">
                                            <Clock size={16} className="text-amber-700 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">Time to Pay</span>
                                        </div>
                                        {isExpired ? (
                                            <span className="text-xs font-black uppercase text-red-600">Expired</span>
                                        ) : (
                                            <QRCountDown 
                                                expiresAt={qrData.expires_at} 
                                                onExpire={() => {
                                                    setIsExpired(true);
                                                    setIsPolling(false);
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* QR Code Container */}
                                    <div className="flex flex-col items-center justify-center p-4 border border-stone-100 bg-stone-50/30 gap-4">
                                        {!isExpired ? (
                                            <>
                                                <img 
                                                    src={qrData.qr_image_url} 
                                                    alt="QR Ph Code" 
                                                    className="w-48 h-48 border-4 border-white"
                                                />
                                                <button
                                                    onClick={handleSaveQR}
                                                    className="inline-flex items-center gap-2 border border-stone-800 bg-stone-800 hover:bg-stone-700 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none"
                                                >
                                                    <Download size={12} /> Save QR to Phone
                                                </button>
                                            </>
                                        ) : (
                                            <div className="text-center py-6 space-y-3">
                                                <AlertCircle size={32} className="text-red-500 mx-auto" />
                                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">This payment code has expired</p>
                                                <button
                                                    onClick={handleProceedToPayment}
                                                    className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none"
                                                >
                                                    Create New Payment Code
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Steps for Farmer */}
                                    <div className="space-y-4">
                                        <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2 border-b border-stone-100 pb-2">
                                            <Info size={14} /> How to pay with cash:
                                        </h3>
                                        <ol className="text-[10px] text-stone-600 space-y-3 list-decimal pl-4 leading-relaxed uppercase tracking-wider font-semibold">
                                            <li>Save the QR code picture to your phone using the button above.</li>
                                            <li>Go to your nearest local Sari-Sari store that accepts GCash, Maya, or QR Ph.</li>
                                            <li>Show the saved QR code picture to the store keeper.</li>
                                            <li>Pay the store keeper <strong>₱{totalPrice}</strong> in cash.</li>
                                            <li>Ask the store keeper to scan the QR code using their GCash/Maya app to send the payment.</li>
                                        </ol>
                                        <p className="text-[9px] text-stone-400 font-bold leading-normal uppercase">
                                            *Store keepers may charge a small convenience fee (e.g., ₱5 to ₱10) for this service.
                                        </p>
                                    </div>

                                    {/* Action footer */}
                                    <div className="pt-4 border-t border-stone-100 flex flex-col gap-3">
                                        {isPolling && (
                                            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                                <span className="loading loading-spinner loading-xs text-green-700"></span>
                                                Checking payment status...
                                            </div>
                                        )}
                                        
                                        {!isExpired && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setIsLoading(true);
                                                        await api.post(`/payment/${id}/simulate_payment/`);
                                                        toast.success("Simulation Complete", {
                                                            description: "Simulated store keeper scanning and paying QR Ph."
                                                       });
                                                    } catch (err) {
                                                        toast.error("Simulation failed");
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                disabled={isLoading}
                                                className="bg-amber-600 hover:bg-amber-500 text-white w-full py-3 rounded-none font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                            >
                                                Simulate Store Payment (Demo)
                                            </button>
                                        )}
                                        
                                        <button
                                            onClick={handleCancelQR}
                                            className="text-stone-400 hover:text-stone-800 text-[10px] font-black uppercase tracking-widest text-center py-2 underline"
                                        >
                                            Cancel & Change Payment Method
                                        </button>
                                    </div>
                                    
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentCheckout;