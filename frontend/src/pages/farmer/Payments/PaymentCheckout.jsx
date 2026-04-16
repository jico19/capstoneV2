import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CreditCard, Wallet, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '/src/lib/api';
import { useApplicationDetail } from '/src/hooks/useApplications';
import { toast } from 'sonner';




const PaymentCheckout = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { data: application, isLoading: isApplicationLoading, isError } = useApplicationDetail(id)

    // Using amount from settings or application if available, fallback to mock for prototype
    const amount = 500.00; 

    const handleProceedToPayment = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Call your Django backend endpoint that triggers create_checkout_session()
            const response = await api.post(`/payment/${id}/checkout_session/`);

            // The backend should return the PayMongo URL
            const checkoutUrl = response.data.checkout_url;

            // Redirect the user's browser to the PayMongo secure page
            if (checkoutUrl) {
                toast.info("Redirecting to Secure Payment", {
                    description: "Please complete the transaction on the payment gateway."
                });
                window.location.href = checkoutUrl;
            } else {
                throw new Error("No checkout URL received from server.");
            }
        } catch (err) {
            console.error(err);
            setError("Failed to generate payment link. Please try again.");
            setIsLoading(false);
            toast.error("Payment Error", {
                description: "Could not initialize the payment session. Please try again later."
            });
        }
    };

    if (isApplicationLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <span className="loading loading-spinner loading-lg text-blue-600"></span>
                <p className="text-slate-500 font-medium animate-pulse">Loading payment details...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl flex items-center justify-center font-semibold">
                    Failed to load application data. Please refresh the page.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 font-sans">

            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-blue-600 transition-colors mb-4"
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-none border border-blue-100">
                    <Wallet size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Payment.Checkout</h1>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secure Municipal Fee Collection</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-none text-xs font-black uppercase tracking-widest">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left Column: Order Summary */}
                <div className="bg-white border border-gray-200 rounded-none overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText size={14} /> Order Summary
                        </h2>
                    </div>
                    <div className="p-6 space-y-6 flex-1">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Permit Ref</span>
                            <span className="font-mono font-black text-gray-900 text-sm italic">#{application?.application_id}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Destination</span>
                            <span className="font-black text-gray-700 text-xs uppercase italic">{application?.destination}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Livestock</span>
                            <span className="font-black text-gray-700 text-xs uppercase italic">{application?.number_of_pigs} Heads</span>
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Total Amount</span>
                            <span className="text-2xl font-black text-blue-600 font-mono italic">₱{amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Payment Action */}
                <div className="space-y-8">
                    <div className="bg-white border border-gray-200 rounded-none p-6 space-y-6">
                        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <CreditCard size={14} /> Payment Method
                        </h2>
                        <p className="text-xs font-medium text-gray-500 leading-relaxed">
                            You will be redirected to our secure municipal gateway. We support digital wallets and major cards.
                        </p>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-none">
                                <CheckCircle2 size={16} className="text-green-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Digital Wallets (GCash/Maya)</span>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-none">
                                <CheckCircle2 size={16} className="text-green-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-700">Credit / Debit Cards</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleProceedToPayment}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full h-16 rounded-none font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                INITIALIZING...
                            </>
                        ) : (
                            <>
                                PAY ₱{amount.toFixed(2)} <ChevronRight size={20} strokeWidth={3} />
                            </>
                        )}
                    </button>

                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 text-center flex items-center justify-center gap-2">
                        <ShieldCheck size={14} className="text-green-600" />
                        SECURED BY PAYMONGO GATEWAY
                    </p>
                </div>

            </div>
        </div>
    );
};

// Simple ChevronRight since it was missing in imports but needed for the button
const ChevronRight = ({ size, strokeWidth }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth={strokeWidth} 
        strokeLinecap="square" 
        strokeLinejoin="miter"
    >
        <path d="M9 18l6-6-6-6" />
    </svg>
);

export default PaymentCheckout;