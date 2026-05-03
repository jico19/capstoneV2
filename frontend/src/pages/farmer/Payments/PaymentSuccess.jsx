import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '/src/lib/api';
import { CheckCircle2, AlertCircle, Clock, FileCheck2, ArrowRight } from 'lucide-react';

const MAX_RETRIES = 10;
const POLL_INTERVAL = 3000;

// Page shown after a farmer completes a payment session.
// Polls the backend to verify the PayMongo transaction status.
const PaymentSuccess = () => {
    const [status, setStatus] = useState('verifying');
    const { issued_permit_id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (!issued_permit_id) return;

        let attempts = 0;
        let timeoutId;

        const verify = async () => {
            try {
                const res = await api.post(`/payment/${issued_permit_id}/verify_paymongo_session/`);
                
                if (res.data.verified) {
                    setStatus('success');
                    // Automatically redirect to dashboard after a short delay
                    setTimeout(() => navigate('/farmer/'), 4000);
                } else {
                    attempts++;
                    if (attempts < MAX_RETRIES) {
                        timeoutId = setTimeout(verify, POLL_INTERVAL);
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

        return () => clearTimeout(timeoutId);
    }, [issued_permit_id, navigate]);

    return (
        <div className="min-h-screen bg-stone-50/50 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white border border-stone-200 rounded-none p-8 lg:p-12 space-y-8">
                
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
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="p-4 bg-green-50 border border-green-600 text-green-700">
                            <CheckCircle2 size={40} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-black text-stone-800 uppercase tracking-tighter">
                                Payment Received
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-700">
                                Transaction Successful
                            </p>
                            <p className="text-xs text-stone-600 font-medium leading-relaxed pt-2">
                                Your payment has been confirmed. Your official transport permit is now being generated and will be available in your dashboard shortly.
                            </p>
                        </div>
                        
                        <div className="w-full pt-4 space-y-4">
                            <button 
                                onClick={() => navigate('/farmer/')}
                                className="w-full bg-green-700 hover:bg-green-600 text-white py-4 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                                Go to Dashboard <ArrowRight size={14} />
                            </button>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                Redirecting automatically...
                            </p>
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

                <div className="pt-4 border-t border-stone-100 flex items-center justify-center gap-2">
                    <FileCheck2 size={14} className="text-stone-300" />
                    <span className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em]">LivestockPass Secure Payment</span>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;