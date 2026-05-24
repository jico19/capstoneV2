import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CreditCard, Wallet, FileText, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { api } from '/src/lib/api';
import { useApplicationDetail } from '/src/hooks/useApplications';
import { toast } from 'sonner';

// Checkout page for permit payments.
// Connects to PayMongo for secure municipal fee collection.
const PaymentCheckout = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalPrice, setTotalprice] = useState(0)

    const { data: application, isLoading: isApplicationLoading, isError } = useApplicationDetail(id)

    console.log(application)

    const document_price = [
        { "doc_name": "Veterinary Health Certificate", "price": 50.00 },
        { "doc_name": "Transportation Pass", "price": 50.00 },
        { "doc_name": "Sariaya Transportation Permit", "price": 50.00 },
    ]


    const handleProceedToPayment = async () => {
        setIsLoading(true);
        setError(null);

        try {
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
        } catch (err) {
            console.error(err.response);
            setError("Failed to generate payment link. Please try again.");
            setIsLoading(false);
            toast.error("Payment Error", {
                description: "Could not initialize the payment session. Please try again later."
            });
        }
    };

    useEffect(() => {
        setTotalprice(document_price.reduce((total_price, curr) => total_price + curr.price, 0))
    }, [])

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

                <div className="flex flex-col space-y-5">

                    {/* Left: Summary */}
                    <div className="lg:col-span-3 space-y-6">
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
                                {document_price.map((data, idx) => (
                                    <div className="flex justify-between py-4 last:pb-0" key={idx}>
                                        <span className="text-xs font-black uppercase tracking-widest text-stone-800">{data.doc_name}</span>
                                        <span className="text-2xl font-black text-green-700 font-mono">₱{data.price}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between py-4 last:pb-0">
                                    <span className="text-xs font-black uppercase tracking-widest text-stone-800">Total Due</span>
                                    <span className="text-2xl font-black text-green-700 font-mono">₱{totalPrice}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 p-5 bg-stone-100 border border-stone-200">
                            <ShieldCheck size={20} className="text-stone-400 shrink-0" />
                            <p className="text-[10px] font-medium text-stone-500 leading-relaxed uppercase tracking-widest">
                                Your payment is processed through a secure gateway. No sensitive card information is stored on our servers.
                            </p>
                        </div>
                    </div>

                    {/* Right: Payment Action */}
                    <div className="lg:col-span-2 space-y-6">
                        <button
                            onClick={handleProceedToPayment}
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
                                    Pay ₱{totalPrice} <ChevronRight size={18} />
                                </>
                            )}
                        </button>

                        <div className="flex items-center justify-center gap-2 py-4 grayscale opacity-50">
                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em]">Powered by PayMongo</span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PaymentCheckout;