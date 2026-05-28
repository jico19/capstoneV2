import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '/src/lib/api';
import { CheckCircle2, AlertCircle, Clock, FileCheck2, ArrowRight } from 'lucide-react';

const MAX_RETRIES = 10;
const POLL_INTERVAL = 3000;

// Page shown after a farmer completes a payment session.
// Displays a GCash-style receipt (Option C) upon successful verification.
const PaymentSuccess = () => {
    const [status, setStatus] = useState('verifying');
    const [paymentData, setPaymentData] = useState(null);
    const { issued_permit_id } = useParams();
    const navigate = useNavigate();

    const attemptsRef = useRef(0);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (!issued_permit_id) return;

        const verify = async () => {
            try {
                const res = await api.post(`/payment/${issued_permit_id}/verify_paymongo_session/`);

                if (res.data.verified) {
                    clearTimeout(timeoutRef.current); // ✅ explicitly cancel any pending timeout
                    setStatus('success');
                    setPaymentData(res.data.data);
                } else {
                    attemptsRef.current++;
                    if (attemptsRef.current < MAX_RETRIES) {
                        timeoutRef.current = setTimeout(verify, POLL_INTERVAL);
                    } else {
                        setStatus('error');
                    }
                }
            } catch (err) {
                console.error(err.response);
                setStatus('error');
            }
        };

        verify();

        return () => clearTimeout(timeoutRef.current); // now actually clears the right timeout
    }, [issued_permit_id]);

    return (
        <div className="min-h-screen bg-stone-50/50 flex items-center justify-center p-6">
            <div className={`max-w-md w-full bg-white border border-stone-200 rounded-none ${status === 'success' ? 'p-0 shadow-2xl' : 'p-8 lg:p-12'} space-y-8 overflow-hidden transition-all duration-500`}>

                {status === 'verifying' && (
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="relative">
                            <Clock size={48} className="text-stone-200 animate-pulse" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="loading loading-spinner loading-md text-green-700"></span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-sm font-black uppercase tracking-widest text-stone-800">
                                Verifying Payment
                            </h2>
                            <p className="text-xs text-stone-500 font-medium leading-relaxed">
                                We are confirming your transaction with the payment gateway. This usually takes a few moments.
                            </p>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col animate-in fade-in zoom-in duration-500">
                        {/* Receipt Header */}
                        <div className="bg-green-700 p-8 text-center space-y-4">
                            <div className="inline-flex p-3 bg-white/20 backdrop-blur-sm rounded-full text-white ring-4 ring-white/10">
                                <CheckCircle2 size={32} />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-xl font-black text-white uppercase tracking-widest">
                                    Payment Successful
                                </h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-100/70">
                                    LivestockPass Secure Transaction
                                </p>
                            </div>
                        </div>

                        {/* Amount Section */}
                        <div className="p-8 text-center border-b border-stone-100 space-y-1 bg-white">
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Total Amount Paid</p>
                            <div className="text-4xl font-black text-stone-800 tracking-tighter">
                                <span className="text-2xl mr-1 font-sans">₱</span>{paymentData?.amount?.toLocaleString() || '0.00'}
                            </div>
                        </div>

                        {/* Transaction Details */}
                        <div className="p-8 space-y-6 bg-stone-50/30">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Recipient</span>
                                    <span className="text-[11px] font-black text-stone-800 uppercase text-right">Sariaya Municipal<br />Agriculture Office</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Date & Time</span>
                                    <span className="text-[11px] font-black text-stone-800 uppercase">
                                        {paymentData?.created_at ? new Date(paymentData.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-stone-100">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Reference No.</span>
                                    <span className="text-[11px] font-mono font-black text-stone-800 uppercase">
                                        {paymentData?.paymongo_session_id?.split('_').pop() || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Payment Method</span>
                                    <span className="text-[11px] font-black text-stone-800 uppercase">{paymentData?.method || 'ONLINE'}</span>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button
                                    onClick={() => navigate('/farmer/')}
                                    className="w-full bg-green-700 hover:bg-green-600 text-white py-4 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 group"
                                >
                                    Done <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            <div className="flex flex-col items-center gap-2 pt-2">
                                <p className="text-[9px] font-medium text-stone-400 text-center uppercase tracking-wider">
                                    Your permit is being generated and will be available in your dashboard shortly.
                                </p>
                            </div>
                        </div>

                        {/* Footer Logo */}
                        <div className="p-6 border-t border-stone-100 bg-white flex items-center justify-center gap-2 opacity-30 grayscale">
                            <FileCheck2 size={16} className="text-stone-800" />
                            <span className="text-[10px] font-black text-stone-800 uppercase tracking-[0.3em]">LivestockPass</span>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="p-4 bg-red-50 border border-red-600 text-red-600">
                            <AlertCircle size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-stone-800 uppercase tracking-tighter">
                                Verification Timeout
                            </h2>
                            <p className="text-xs text-red-600 font-medium leading-relaxed pt-2">
                                We couldn't confirm your payment status in time. If you were charged, don't worry—your permit will be updated once the gateway syncs.
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 py-4 text-xs font-black uppercase tracking-widest transition-colors"
                        >
                            Try Verifying Again
                        </button>
                        <Link
                            to="/farmer/"
                            className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-800 transition-colors"
                        >
                            Return to Dashboard
                        </Link>
                    </div>
                )}

                {status !== 'success' && (
                    <div className="pt-4 border-t border-stone-100 flex items-center justify-center gap-2">
                        <FileCheck2 size={14} className="text-stone-300" />
                        <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">LivestockPass Secure Payment</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;