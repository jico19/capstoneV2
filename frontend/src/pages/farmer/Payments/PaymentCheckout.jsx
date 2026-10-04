import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CreditCard, Wallet, FileText, CheckCircle2, ChevronRight, AlertCircle, Download, Info, Clock, QrCode, Smartphone, Banknote } from 'lucide-react';
import { api } from '../../../lib/api';
import { useApplicationDetail } from '../../../hooks/useApplications';
import { toast } from 'sonner';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';

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
    const [totalPrice, setTotalPrice] = useState(0);
    const [showConfirm, setShowConfirm] = useState(false);
    
    // QR Ph related states
    const [paymentMode, setPaymentMode] = useState('online'); // 'online' or 'qrph'
    const [qrData, setQrData] = useState(null);
    const [isPolling, setIsPolling] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    // Sandbox (demo) checkout modal states
    const [showSandbox, setShowSandbox] = useState(false);
    const [sandboxStep, setSandboxStep] = useState(1); // 1: details, 2: otp/auth, 3: processing
    const [sandboxMethod, setSandboxMethod] = useState('gcash');
    const [sandboxPhone, setSandboxPhone] = useState('0917-555-0192');
    const [sandboxOtp, setSandboxOtp] = useState(['1', '2', '3', '4', '5', '6']);
    const [sandboxCardNum, setSandboxCardNum] = useState('4242 •••• •••• 4242');
    const [sandboxCardExpiry, setSandboxCardExpiry] = useState('12/28');
    const [sandboxCardCvv, setSandboxCardCvv] = useState('888');
    const [processingStepText, setProcessingStepText] = useState('');

    const { data: application, isLoading: isApplicationLoading, isError } = useApplicationDetail(id);

    const handleProceedToPayment = async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (paymentMode === 'online') {
                // Call backend endpoint to create real PayMongo checkout session
                const response = await api.post(`/payment/${id}/checkout_session/`);
                if (response.data && response.data.checkout_url) {
                    toast.success("Redirecting to PayMongo...", {
                        description: "Taking you to the secure payment gateway."
                    });
                    window.location.href = response.data.checkout_url;
                } else {
                    throw new Error("No checkout URL returned.");
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
            console.error("Payment initialization error:", err);
            const errorMsg = err?.response?.data?.error || "Could not initialize the payment gateway.";
            setError(errorMsg);
            toast.error("Payment Gateway Error", {
                description: `${errorMsg} You can use the Interactive Demo Simulator below.`
            });
            setIsLoading(false);
        }
    };

    const handleStartSandbox = (method = 'gcash') => {
        setSandboxMethod(method);
        setSandboxStep(1);
        setSandboxOtp(['1', '2', '3', '4', '5', '6']);
        setShowSandbox(true);
    };

    const handleSandboxSubmitStep1 = () => {
        setSandboxStep(2);
    };

    const handleSandboxExecutePayment = async () => {
        setSandboxStep(3);
        setProcessingStepText('1. Contacting payment gateway...');
        
        // Stage 1 realistic delay
        await new Promise((r) => setTimeout(r, 600));
        setProcessingStepText('2. Authorizing transaction & verifying credentials...');
        
        // Stage 2 realistic delay
        await new Promise((r) => setTimeout(r, 700));
        setProcessingStepText('3. Confirming settlement with Municipal Agriculture Office...');
        
        try {
            const res = await api.post(`/payment/${id}/farmer_simulate_payment/`, {
                payment_method: sandboxMethod,
            });
            
            await new Promise((r) => setTimeout(r, 500));
            
            if (res.data.verified) {
                setShowSandbox(false);
                toast.success("Payment Confirmed!", {
                    description: `${sandboxMethod.toUpperCase()} payment verified. Loading official receipt...`
                });
                navigate(`/farmer/payment/success/${id}`);
            }
        } catch (err) {
            setSandboxStep(2);
            const msg = err?.response?.data?.error || "Payment simulation failed. Please try again.";
            toast.error("Payment Failed", { description: msg });
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
            setTotalPrice(application.permit_fee || 150.00);
        }
    }, [application]);

    // Handle back-forward cache (bfcache) restore when navigating back from a redirect
    useEffect(() => {
        const handlePageShow = () => {
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

            {/* ── Realistic Interactive Sandbox Gateway Simulator Modal ───────────── */}
            {showSandbox && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-none shadow-2xl overflow-hidden border border-stone-300 animate-in fade-in zoom-in duration-200">

                        {/* Modal Header — mimics authentic gateway header */}
                        <div className="bg-stone-900 px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-green-500/20 text-green-400 rounded-none border border-green-500/30">
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        Demo Gateway Simulator
                                        <span className="text-[8px] bg-green-700 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider">
                                            Step {sandboxStep} of 3
                                        </span>
                                    </p>
                                    <p className="text-[9px] font-medium text-stone-400 uppercase tracking-wider">
                                        Bangko Sentral Compliant Simulation
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSandbox(false)}
                                disabled={sandboxStep === 3}
                                className="text-stone-400 hover:text-white text-xs font-mono font-bold uppercase px-2 py-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Step 1: Method Selection & Credentials */}
                        {sandboxStep === 1 && (
                            <div className="divide-y divide-stone-100">
                                {/* Amount Due Header */}
                                <div className="px-6 py-5 bg-stone-50/50 flex justify-between items-center">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Total Payable</p>
                                        <p className="text-2xl font-black text-stone-800 font-mono">₱{totalPrice}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Permit Ref</p>
                                        <p className="text-xs font-mono font-bold text-stone-700">#{application?.application_id}</p>
                                    </div>
                                </div>

                                {/* Method Tabs */}
                                <div className="p-6 space-y-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">1. Select Payment Channel</p>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {[
                                            { id: 'gcash', label: 'GCash', icon: <Smartphone size={14} /> },
                                            { id: 'paymaya', label: 'Maya', icon: <Wallet size={14} /> },
                                            { id: 'card', label: 'Card', icon: <CreditCard size={14} /> },
                                            { id: 'qrph', label: 'QR Ph', icon: <QrCode size={14} /> },
                                        ].map((m) => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setSandboxMethod(m.id)}
                                                className={`flex flex-col items-center justify-center p-2.5 border text-center transition-all rounded-none gap-1 ${
                                                    sandboxMethod === m.id
                                                        ? 'border-green-700 bg-green-50 text-green-800 font-black'
                                                        : 'border-stone-200 text-stone-500 hover:bg-stone-50 font-bold'
                                                }`}
                                            >
                                                <span className={sandboxMethod === m.id ? 'text-green-700' : 'text-stone-400'}>
                                                    {m.icon}
                                                </span>
                                                <span className="text-[9px] uppercase tracking-wider">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Method-specific credential fields */}
                                    <div className="space-y-3 pt-2">
                                        {(sandboxMethod === 'gcash' || sandboxMethod === 'paymaya') && (
                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black uppercase tracking-widest text-stone-500">
                                                    {sandboxMethod.toUpperCase()} Mobile Number
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-stone-400">+63</span>
                                                    <input
                                                        type="text"
                                                        value={sandboxPhone}
                                                        onChange={(e) => setSandboxPhone(e.target.value)}
                                                        placeholder="0917-000-0000"
                                                        className="w-full pl-12 pr-3 py-2 border border-stone-300 font-mono text-xs font-bold text-stone-800 focus:outline-none focus:border-green-700 rounded-none"
                                                    />
                                                </div>
                                                <p className="text-[9px] text-stone-400 font-medium">
                                                    Demo account: You can leave the mock phone number as is.
                                                </p>
                                            </div>
                                        )}

                                        {sandboxMethod === 'card' && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-stone-500">
                                                        Card Number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={sandboxCardNum}
                                                        onChange={(e) => setSandboxCardNum(e.target.value)}
                                                        className="w-full px-3 py-2 border border-stone-300 font-mono text-xs font-bold text-stone-800 focus:outline-none focus:border-green-700 rounded-none"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-widest text-stone-500">
                                                            Expiry Date
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={sandboxCardExpiry}
                                                            onChange={(e) => setSandboxCardExpiry(e.target.value)}
                                                            className="w-full px-3 py-2 border border-stone-300 font-mono text-xs font-bold text-stone-800 focus:outline-none focus:border-green-700 rounded-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[9px] font-black uppercase tracking-widest text-stone-500">
                                                            CVV / CVC
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={sandboxCardCvv}
                                                            onChange={(e) => setSandboxCardCvv(e.target.value)}
                                                            className="w-full px-3 py-2 border border-stone-300 font-mono text-xs font-bold text-stone-800 focus:outline-none focus:border-green-700 rounded-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {sandboxMethod === 'qrph' && (
                                            <div className="p-3 bg-stone-50 border border-stone-200 space-y-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-stone-700">
                                                    Local Cash Merchant Mode
                                                </p>
                                                <p className="text-[9px] text-stone-500 font-medium leading-relaxed">
                                                    Simulates the local store merchant receiving ₱{totalPrice} in cash and scanning your QR Ph payment code.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 1 Actions */}
                                <div className="p-6 bg-stone-50/30 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowSandbox(false)}
                                        className="w-1/3 border border-stone-300 hover:bg-stone-100 text-stone-600 py-3 font-black text-[10px] uppercase tracking-widest transition-colors rounded-none"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSandboxSubmitStep1}
                                        className="w-2/3 bg-green-700 hover:bg-green-600 text-white py-3 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors rounded-none"
                                    >
                                        Proceed to OTP Challenge <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: 6-Digit OTP / Security Challenge */}
                        {sandboxStep === 2 && (
                            <div className="p-6 space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="inline-flex p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-none mb-1">
                                        <Smartphone size={24} />
                                    </div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-stone-800">
                                        {sandboxMethod === 'card' ? '3D Secure Bank Verification' : 'Security OTP Verification'}
                                    </h3>
                                    <p className="text-[10px] text-stone-500 font-medium leading-relaxed">
                                        A 6-digit authentication passcode was sent to{' '}
                                        <span className="font-mono font-bold text-stone-800">{sandboxPhone}</span>.
                                    </p>
                                </div>

                                {/* 6-Digit OTP Boxes */}
                                <div className="space-y-3">
                                    <div className="flex justify-center gap-2">
                                        {sandboxOtp.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                type="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => {
                                                    const val = e.target.value.slice(-1);
                                                    const next = [...sandboxOtp];
                                                    next[idx] = val;
                                                    setSandboxOtp(next);
                                                }}
                                                className="w-10 h-12 text-center text-lg font-black font-mono border-2 border-stone-300 focus:border-green-700 focus:outline-none bg-stone-50/50 rounded-none"
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                        <span>Code expires in: <strong className="text-amber-700">00:54</strong></span>
                                        <button
                                            type="button"
                                            onClick={() => setSandboxOtp(['1', '2', '3', '4', '5', '6'])}
                                            className="text-green-700 hover:underline"
                                        >
                                            Auto-Fill 123456
                                        </button>
                                    </div>
                                </div>

                                {/* Security Badge */}
                                <div className="bg-amber-50 border border-amber-200 p-3 flex gap-2 items-start">
                                    <Info size={14} className="text-amber-700 shrink-0 mt-0.5" />
                                    <p className="text-[9px] text-amber-800 font-medium leading-relaxed uppercase">
                                        Simulated transaction for <strong>₱{totalPrice}</strong>. Clicking Authorize will confirm payment with the Municipal Agri Office.
                                    </p>
                                </div>

                                {/* Step 2 Actions */}
                                <div className="space-y-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleSandboxExecutePayment}
                                        className="w-full bg-green-700 hover:bg-green-600 text-white py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors rounded-none"
                                    >
                                        Authorize & Pay ₱{totalPrice} with {sandboxMethod.toUpperCase()}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSandboxStep(1)}
                                        className="w-full text-stone-400 hover:text-stone-700 text-[10px] font-black uppercase tracking-widest py-2 transition-colors"
                                    >
                                        ← Change Channel / Mobile Number
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Gateway Processing Spinner */}
                        {sandboxStep === 3 && (
                            <div className="p-8 text-center space-y-6">
                                <div className="relative flex justify-center">
                                    <div className="w-16 h-16 border-4 border-stone-200 border-t-green-700 rounded-full animate-spin" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-stone-800">
                                        Processing Payment
                                    </h3>
                                    <p className="text-[10px] font-mono font-bold text-green-700 transition-all">
                                        {processingStepText}
                                    </p>
                                </div>
                                <div className="p-3 bg-stone-50 border border-stone-100 text-[9px] text-stone-400 font-medium uppercase tracking-wider">
                                    Do not refresh or close this window while the transaction is being verified.
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
            {/* ── End Realistic Sandbox Gateway Modal ─────────────────────────────── */}
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
                                                <p className="text-xs font-black uppercase tracking-widest">Local Cash Merchant Payment</p>
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
                                <div className="space-y-4">
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
                                                {paymentMode === 'online' ? "Pay Online (PayMongo Gateway)" : "Get QR Code"} <ChevronRight size={18} />
                                            </>
                                        )}
                                    </button>

                                    {paymentMode === 'online' && (
                                        <button
                                            type="button"
                                            onClick={() => handleStartSandbox('gcash')}
                                            disabled={isLoading}
                                            className="border border-stone-300 hover:bg-stone-100 text-stone-700 w-full py-3.5 rounded-none font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ShieldCheck size={14} className="text-green-700" />
                                            Open Interactive Demo Simulator
                                        </button>
                                    )}

                                    <div className="flex items-center justify-center gap-2 py-2 grayscale opacity-50">
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
                                            <li>Go to your nearest local cash merchant that accepts GCash, Maya, or QR Ph.</li>
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
                                                type="button"
                                                onClick={() => handleStartSandbox('qrph')}
                                                disabled={isLoading}
                                                className="bg-amber-600 hover:bg-amber-500 text-white w-full py-3 rounded-none font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                            >
                                                Simulate Store Cash Payment (Demo)
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