import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CreditCard, Wallet, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '/src/lib/api';
import { useApplicationDetail } from '/src/hooks/useApplications';




const PaymentCheckout = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const { data: application, isLoading: isApplicationLoading, isError } = useApplicationDetail(id)

    // ==========================================
    // MOCK DATA: Replace with an API call to fetch specific application details
    // const { data: app } = useApplicationDetails(id);
    // ==========================================

    console.log(application)
    const app = {
        application_id: "APP-2026-004",
        destination: "Metro Manila",
        number_of_pigs: 50,
        amount: 500.00 // In PHP
    };

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
                window.location.href = checkoutUrl;
            } else {
                throw new Error("No checkout URL received from server.");
            }
        } catch (err) {
            console.error(err.response);
            setError("Failed to generate payment link. Please try again.");
            setIsLoading(false);
        }
    };

    if (isApplicationLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <span className="loading loading-spinner loading-lg text-blue-600"></span>
                <p className="text-slate-500 font-medium animate-pulse">Loading your applications...</p>
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
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">

            <button
                onClick={() => navigate(-1)}
                className="btn btn-ghost btn-sm text-slate-500 gap-2 pl-0 hover:bg-transparent hover:text-blue-600 mb-4"
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Wallet size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Payment Checkout</h1>
                    <p className="text-sm text-slate-500">Review your details and proceed to secure payment.</p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left Column: Order Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <FileText size={18} className="text-slate-400" />
                            Order Summary
                        </h2>
                    </div>
                    <div className="p-5 space-y-4 flex-1">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Permit Reference</span>
                            <span className="font-mono font-bold text-slate-700">{application?.application_id}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Destination</span>
                            <span className="font-bold text-slate-700">{application?.destination}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <span className="text-sm text-slate-500">Livestock Count</span>
                            <span className="font-bold text-slate-700">{application?.number_of_pigs} Heads</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="font-bold text-slate-800">Total Amount</span>
                            <span className="text-2xl font-black text-blue-600">₱{app.amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Payment Action */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <CreditCard size={18} className="text-slate-400" />
                            Payment Method
                        </h2>
                        <p className="text-sm text-slate-500">
                            You will be redirected to a secure payment gateway. We accept the following:
                        </p>

                        <div className="flex flex-col gap-2 pt-2">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span className="text-sm font-bold text-slate-700">GCash / Maya</span>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                <CheckCircle2 size={16} className="text-green-500" />
                                <span className="text-sm font-bold text-slate-700">Credit / Debit Cards</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleProceedToPayment}
                        disabled={isLoading}
                        className="btn btn-primary bg-blue-600 hover:bg-blue-700 border-none w-full h-14 rounded-xl text-white font-bold text-lg shadow-sm"
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Redirecting...
                            </>
                        ) : (
                            <>
                                Proceed to Pay ₱{app.amount.toFixed(2)}
                            </>
                        )}
                    </button>

                    <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1.5 mt-4">
                        <ShieldCheck size={14} className="text-green-600" />
                        Payments are securely processed by PayMongo.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default PaymentCheckout;