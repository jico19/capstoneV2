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
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Loading payment details...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-6">
                <div className="bg-red-50 text-red-600 border border-red-100 p-8 rounded-none flex items-center justify-center font-black uppercase tracking-widest text-xs text-center">
                    Failed to load application data. Please refresh the page.
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8 font-sans bg-white min-h-full">

            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-green-600 transition-all border-b-2 border-transparent hover:border-green-600 w-fit pb-1"
            >
                <ArrowLeft size={16} strokeWidth={3} /> Return to Dashboard
            </button>

            <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-6">
                <div className="p-4 bg-green-50 text-green-600 rounded-none border border-green-100">
                    <Wallet size={24} />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter">Payment Checkout</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Secure Municipal Fee Collection</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-none text-[10px] font-black uppercase tracking-widest text-center">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

                {/* Left Column: Order Summary */}
                <div className="bg-white border border-gray-100 rounded-none overflow-hidden flex flex-col">
                    <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <FileText size={14} /> Order Summary
                        </h2>
                    </div>
                    <div className="p-4 md:p-6 space-y-6 flex-1">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Permit Ref</span>
                            <span className="font-mono font-black text-gray-900 text-sm">#{application?.application_id}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Destination</span>
                            <span className="font-black text-gray-900 text-xs uppercase text-right max-w-[150px] truncate">{application?.destination}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Livestock</span>
                            <span className="font-black text-gray-900 text-xs uppercase">{application?.number_of_pigs} Heads</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-xs font-black uppercase tracking-widest text-gray-900">Total Amount</span>
                            <span className="text-2xl font-black text-green-600 font-mono">₱{amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Payment Action */}
                <div className="space-y-6 flex flex-col">
                    <div className="bg-white border border-gray-100 rounded-none p-4 md:p-6 space-y-6 flex-1">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <CreditCard size={14} /> Payment Method
                        </h2>
                        <p className="text-xs font-medium text-gray-500 leading-relaxed uppercase tracking-wider">
                            You will be redirected to our secure municipal gateway. We support digital wallets and major cards.
                        </p>

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-none">
                                <CheckCircle2 size={16} className="text-green-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Digital Wallets (GCash/Maya)</span>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-none">
                                <CheckCircle2 size={16} className="text-green-600" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Credit / Debit Cards</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleProceedToPayment}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700 text-white w-full py-5 rounded-none font-black text-sm uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
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

                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center flex items-center justify-center gap-2">
                        <ShieldCheck size={14} className="text-green-600" />
                        SECURED BY PAYMONGO
                    </p>
                </div>

            </div>
        </div>
    );
};

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