import React from "react";
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  QrCode,
  Building2,
  Printer,
  ShieldCheck,
} from "lucide-react";

const TransactionDetailModal = ({ isOpen, onClose, transaction }) => {
  if (!isOpen || !transaction) return null;

  const isCleared = transaction.raw_status === "SUCCESS" || transaction.raw_status === "CONFIRMED" || transaction.payment_status?.toLowerCase() === "cleared" || transaction.payment_status?.toLowerCase() === "success";

  const getMethodBadge = (method) => {
    const m = (method || "").toLowerCase();
    if (m === "qrph") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
          <QrCode size={13} /> QR Ph (Sari-Sari Store)
        </span>
      );
    }
    if (m === "gcash") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
          <CreditCard size={13} /> GCash E-Wallet
        </span>
      );
    }
    if (m === "card") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
          <CreditCard size={13} /> Debit / Credit Card
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-stone-100 text-stone-900 border border-stone-300">
        <CreditCard size={13} /> {method || "Direct / Cash"}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border-2 border-stone-800 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-800 border border-stone-700 text-green-400">
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  Transaction Audit Slip
                </span>
                <span className="text-[10px] font-mono bg-stone-800 text-green-400 px-1.5 py-0.5 border border-stone-700">
                  #TRX-{transaction.id}
                </span>
              </div>
              <h2 className="text-base font-black tracking-tight uppercase">
                Official Receipt & Audit Breakdown
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto print:p-0">
          {/* LGU Receipt Banner */}
          <div className="border border-stone-200 bg-stone-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                LGU Official Receipt (OR) Number
              </span>
              <p className="text-xl font-mono font-black text-stone-900 tracking-wider">
                {transaction.or_number ? `OR #${transaction.or_number}` : "OR PENDING GENERATION"}
              </p>
              <p className="text-[10px] text-stone-500 font-medium">
                Sariaya Municipal Treasury • Livestock Regulatory Trust Fund
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isCleared ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-900 border border-green-300 text-xs font-black uppercase tracking-wider">
                  <CheckCircle2 size={14} className="text-green-700" />
                  Cleared & Remitted
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase tracking-wider">
                  <Clock size={14} className="text-amber-700" />
                  Payment Pending
                </div>
              )}
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payer Info */}
            <div className="bg-white border border-stone-200 p-4 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1">
                <User size={12} /> Payer Information
              </span>
              <div className="space-y-1">
                <p className="text-sm font-black text-stone-900 uppercase">
                  {transaction.farmer_name || "N/A"}
                </p>
                {transaction.farmer_phone && (
                  <p className="text-xs font-mono text-stone-600 flex items-center gap-1">
                    <Phone size={11} /> {transaction.farmer_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Associated Permit */}
            <div className="bg-white border border-stone-200 p-4 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-1">
                <FileText size={12} /> Transport Permit Link
              </span>
              <div className="space-y-1">
                <p className="text-xs font-mono font-black text-stone-900">
                  {transaction.permit_number || "Permit # On File"}
                </p>
                {transaction.destination && (
                  <p className="text-xs text-stone-600 flex items-center gap-1 truncate">
                    <MapPin size={11} className="flex-shrink-0" />
                    Dest: <span className="font-bold">{transaction.destination}</span>
                  </p>
                )}
                {transaction.total_heads > 0 && (
                  <span className="text-[10px] font-bold text-stone-500">
                    Volume: {transaction.total_heads} head of swine
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-stone-200">
            <div className="bg-stone-100 px-4 py-2 border-b border-stone-200 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-700">
                Regulatory Fee Itemization
              </span>
              <span className="text-[10px] font-black text-stone-500 uppercase">
                Schedule of Rates
              </span>
            </div>
            <div className="divide-y divide-stone-100 p-2 text-xs">
              <div className="flex justify-between py-2 px-2">
                <span className="text-stone-600">Livestock Transport Regulatory Fee (Base)</span>
                <span className="font-mono font-bold text-stone-900">₱100.00</span>
              </div>
              <div className="flex justify-between py-2 px-2">
                <span className="text-stone-600">Biosecurity & Quarantine Inspection Surcharge</span>
                <span className="font-mono font-bold text-stone-900">
                  ₱{((transaction.amount || 150) - 100 > 0 ? (transaction.amount - 100) : 50).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-2.5 px-2 bg-stone-50 border-t-2 border-stone-300 font-bold">
                <span className="text-xs font-black uppercase text-stone-800">Total Remitted Amount</span>
                <span className="text-base font-mono font-black text-green-800">
                  ₱{(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Gateway Audit Metadata */}
          <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-green-700" /> Payment Gateway Audit Metadata
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase">Payment Channel</span>
                <div className="mt-1">{getMethodBadge(transaction.method)}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase">Transaction Timestamp</span>
                <p className="font-mono text-stone-800 font-bold mt-1">
                  {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : "N/A"}
                </p>
              </div>
              {transaction.paymongo_session_id && (
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">PayMongo Session ID</span>
                  <p className="font-mono text-[11px] text-stone-600 break-all bg-white border border-stone-200 p-1.5 mt-0.5">
                    {transaction.paymongo_session_id}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 border-t border-stone-200 px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-white border border-stone-300 text-stone-700 text-xs font-bold uppercase tracking-wider hover:bg-stone-50 transition-colors flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Audit Slip
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase tracking-wider transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
