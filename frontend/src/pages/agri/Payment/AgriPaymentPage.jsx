import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    CreditCard,
    Receipt,
    User,
    CheckCircle2,
    Wallet,
    Banknote
} from 'lucide-react';

const AgriPaymentPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [referenceNumber, setReferenceNumber] = useState('');

    // --- DATA NEEDED FROM API ---
    // application_id: {id}
    // farmer_name: "Juan Dela Cruz"
    // total_fee: 250.00
    // breakdown: { permit: 150, inspection: 100 }
    // current_status: "APPROVED"

    const handleConfirmPayment = () => {
        // Logic to update status to "PAID" in your backend
        console.log("Processing payment for:", id, "via", paymentMethod);
        // On success: navigate(`/permit-generator/${id}`)
    };

    return (
        <div className="min-h-screen pb-20">
            {/* Header Navigation */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-green-700 transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Detail
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">Payment Module</span>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 md:p-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT: Payment Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                                <Wallet className="text-green-600" /> Select Payment Method
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {/* Cash Option */}
                                <div
                                    onClick={() => setPaymentMethod('cash')}
                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'cash' ? 'border-green-600 bg-green-50' : 'border-slate-100 bg-slate-50'
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl ${paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'bg-white text-slate-400'}`}>
                                        <Banknote size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">Cash / Over-counter</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">Pay at MAO Office</p>
                                    </div>
                                </div>

                                {/* Digital Option */}
                                <div
                                    onClick={() => setPaymentMethod('digital')}
                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'digital' ? 'border-green-600 bg-green-50' : 'border-slate-100 bg-slate-50'
                                        }`}
                                >
                                    <div className={`p-3 rounded-xl ${paymentMethod === 'digital' ? 'bg-green-600 text-white' : 'bg-white text-slate-400'}`}>
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">Digital Payment</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">GCash / PayMaya</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="label">
                                    <span className="label-text font-bold text-slate-600">OR Number / Transaction Reference</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter Official Receipt Number..."
                                    className="input input-bordered w-full rounded-xl bg-slate-50"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400 italic">
                                    * Required for auditing and permit generation.
                                </p>
                            </div>
                        </section>

                        <button
                            onClick={handleConfirmPayment}
                            disabled={!referenceNumber}
                            className="btn btn-success w-full rounded-2xl h-16 text-white font-black uppercase tracking-widest text-lg shadow-lg shadow-green-200"
                        >
                            Confirm Payment & Issue Permit
                        </button>
                    </div>

                    {/* RIGHT: Bill Summary (The Receipt Look) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                            <div className="bg-slate-800 p-6 text-white text-center">
                                <Receipt className="mx-auto mb-2 opacity-50" size={32} />
                                <h3 className="text-xs font-black uppercase tracking-widest">Bill Summary</h3>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Farmer Info */}
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-400">
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Applicant</p>
                                        <p className="text-sm font-bold text-slate-700">Juan Dela Cruz</p>
                                    </div>
                                </div>

                                <div className="divider my-0"></div>

                                {/* Breakdown */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Permit Fee</span>
                                        <span className="font-mono font-bold text-slate-700">₱ 150.00</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Inspection Fee</span>
                                        <span className="font-mono font-bold text-slate-700">₱ 100.00</span>
                                    </div>
                                </div>

                                <div className="bg-green-50 p-4 rounded-2xl flex justify-between items-center border border-green-100">
                                    <span className="text-xs font-black text-green-700 uppercase">Total Amount</span>
                                    <span className="text-xl font-black text-green-800">₱ 250.00</span>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase justify-center pt-4 border-t border-slate-100">
                                    <CheckCircle2 size={12} className="text-green-500" />
                                    Authorized by MAO Sariaya
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AgriPaymentPage;