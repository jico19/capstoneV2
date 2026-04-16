import React, { useMemo } from 'react';
import { usePayment } from "/src/hooks/usePayment";
import {
    DollarSign,
    CheckCircle2,
    Clock,
    Inbox,
    AlertCircle,
    CreditCard,
    HandCoins
} from 'lucide-react';
import KPICard from '/src/components/KPICard';


const AgriPaymentPage = () => {
    const { data: payments, isLoading, isError } = usePayment();

    // Calculate aggregates for the top row
    const stats = useMemo(() => {
        if (!payments) return { total: 0, online: 0, offline: 0 };
        return {
            total: payments.reduce((acc, curr) => acc + curr.amount, 0),
            online: payments.filter(p => p.method === 'ONLINE').length,
            offline: payments.filter(p => p.method === 'OFFLINE').length
        };
    }, [payments]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest animate-pulse">
                    Syncing Financial Records...
                </p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto p-8">
                <div className="bg-red-50 border border-red-200 p-6 text-red-700 flex flex-col items-center gap-2">
                    <AlertCircle size={24} />
                    <p className="font-bold uppercase text-xs tracking-tighter">Data Connection Failed</p>
                    <p className="text-sm">Could not retrieve payment history. Please refresh the browser.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">

            {/* 1. Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-200 pb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Payment History</h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">Audit trail for all municipal livestock permit fees.</p>
                </div>
                {/* <div className="flex gap-2 w-full md:w-auto">
                    <button className="btn btn-outline flex-1 md:flex-none rounded-none normal-case border-gray-200 bg-white hover:bg-gray-50 gap-2 text-xs font-bold uppercase tracking-wider">
                        <Download size={14} /> Export CSV
                    </button>
                    <button className="btn btn-primary flex-1 md:flex-none rounded-none normal-case px-8 font-black uppercase tracking-wider text-xs">
                        Generate Daily Report
                    </button>
                </div> */}
            </div>

            {/* 2. KPI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Total collections"
                    value={`₱${stats.total.toLocaleString()}`}
                    subtitle="Total payments."
                    icon={DollarSign}
                    colorClass="bg-green-50 text-green-600"
                />

                <KPICard
                    title="Paymongo (Online)"
                    value={stats.online}
                    subtitle="Payments done through paymongo"
                    icon={CreditCard}
                    colorClass="bg-blue-50 text-blue-600"
                />

                <KPICard
                    title="Cashier (Offline)"
                    value={stats.offline}
                    subtitle="Payments done through cashier"
                    icon={HandCoins}
                    colorClass="bg-amber-50 text-amber-600"
                />

            </div>

            {/* 4. Main Ledger Table */}
            <div className="bg-white border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="table w-full border-collapse">
                        <thead>
                            <tr className="text-[11px] text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 bg-gray-50">
                                <th className="p-6 font-bold">Transaction Reference</th>
                                <th className="p-6 font-bold">Payer (Farmer)</th>
                                <th className="p-6 font-bold text-center">Gateway</th>
                                <th className="p-6 font-bold text-right">Amount</th>
                                <th className="p-6 font-bold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(!payments || payments.length === 0) ? (
                                <tr>
                                    <td colSpan="6" className="p-24 text-center">
                                        <Inbox className="mx-auto text-gray-200 mb-4" size={48} />
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">No records in current period</p>
                                    </td>s
                                </tr>
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-mono font-black text-gray-900">#TRX-{p.id}</span>
                                                {p.paymongo_session_id && (
                                                    <span className="text-[10px] text-gray-400 font-mono mt-0.5 truncate w-40">
                                                        {p.paymongo_session_id}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-sm font-black text-gray-700 uppercase tracking-tight">{p.farmer_name}</span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-2 py-1 text-[10px] font-black uppercase border ${p.method === 'ONLINE'
                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                : 'bg-green-50 text-green-700 border-green-100'
                                                }`}>
                                                {p.method}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className="text-sm font-black text-gray-900 font-mono">
                                                ₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center justify-center gap-2">
                                                {p.payment_status === 'success' ? (
                                                    <>
                                                        <CheckCircle2 size={14} className="text-green-600" />
                                                        <span className="text-[10px] font-black uppercase text-green-600">Cleared</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock size={14} className="text-yellow-600" />
                                                        <span className="text-[10px] font-black uppercase text-yellow-600">Processing</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AgriPaymentPage;