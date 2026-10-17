import {
  X,
  CheckCircle2,
  Clock,
  Receipt,
  User,
  Phone,
  MapPin,
  FileText,
  CreditCard,
  QrCode,
  Printer,
  ShieldCheck,
  Building2,
} from "lucide-react";

/**
 * TransactionDetailModal Component
 * Official LGU payment audit slip and receipt itemization.
 * Adheres strictly to FarmPass Design System 2.1 & antislop-ui.
 */
const TransactionDetailModal = ({ isOpen, onClose, transaction }) => {
  if (!isOpen || !transaction) return null;

  const isCleared =
    transaction.raw_status === "SUCCESS" ||
    transaction.raw_status === "CONFIRMED" ||
    transaction.payment_status?.toLowerCase() === "cleared" ||
    transaction.payment_status?.toLowerCase() === "success";

  const getMethodBadge = (method) => {
    const m = (method || "").toLowerCase();
    if (m === "qrph") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
          <QrCode size={13} className="text-emerald-700" /> QR Ph (Local Merchant)
        </span>
      );
    }
    if (m === "gcash") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 rounded-md">
          <CreditCard size={13} className="text-sky-700" /> GCash E-Wallet
        </span>
      );
    }
    if (m === "card") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 rounded-md">
          <CreditCard size={13} className="text-purple-700" /> Debit / Credit Card
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200 rounded-md">
        <Receipt size={13} className="text-stone-500" /> {method || "Direct / Cash"}
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/50 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-stone-200 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden modal-enter">
        {/* Dignified Government Modal Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 uppercase tracking-wider">
                <Building2 size={13} /> Municipality of Sariaya
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs font-mono text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                #TRX-{transaction.id}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
              Official Receipt & Audit Slip
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit slip"
            className="btn-tactile p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto print:p-0">
          {/* LGU Receipt Banner */}
          <div className="border border-stone-200 bg-stone-50/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                LGU Official Receipt (OR) Number
              </span>
              <p className="text-xl font-mono font-bold text-stone-900 tracking-wide">
                {transaction.or_number ? `OR #${transaction.or_number}` : "OR PENDING ISSUANCE"}
              </p>
              <p className="text-xs text-stone-500">
                Sariaya Municipal Treasury • Livestock Regulatory Trust Fund
              </p>
            </div>

            <div className="shrink-0">
              {isCleared ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-800 border border-green-200 rounded-lg text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 size={15} className="text-green-700" />
                  Cleared & Remitted
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold uppercase tracking-wider">
                  <Clock size={15} className="text-amber-700" />
                  Payment Pending
                </div>
              )}
            </div>
          </div>

          {/* Core Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payer Info */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                <User size={13} className="text-green-700" /> Payer Information
              </span>
              <div className="space-y-1">
                <p className="text-sm font-bold text-stone-900">
                  {transaction.farmer_name || "N/A"}
                </p>
                {transaction.farmer_phone && (
                  <p className="text-xs font-mono text-stone-600 flex items-center gap-1.5">
                    <Phone size={12} className="text-stone-400" /> {transaction.farmer_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Associated Permit */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5 shadow-2xs">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide flex items-center gap-1.5">
                <FileText size={13} className="text-green-700" /> Transport Permit Link
              </span>
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-stone-900">
                  {transaction.permit_number || "Permit On File"}
                </p>
                {transaction.destination && (
                  <p className="text-xs text-stone-600 flex items-center gap-1.5 truncate">
                    <MapPin size={12} className="text-stone-400 shrink-0" />
                    Dest: <span className="font-semibold text-stone-800">{transaction.destination}</span>
                  </p>
                )}
                {transaction.total_heads > 0 && (
                  <span className="text-xs text-stone-500 font-medium block">
                    Volume: {transaction.total_heads} head of swine
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                Regulatory Fee Itemization
              </span>
              <span className="text-xs text-stone-500 font-medium">
                Sariaya Schedule of Rates
              </span>
            </div>
            <div className="divide-y divide-stone-100 p-3 text-xs">
              <div className="flex justify-between py-2 px-2">
                <span className="text-stone-600">Livestock Transport Regulatory Fee (Base)</span>
                <span className="font-mono font-semibold text-stone-900">₱100.00</span>
              </div>
              <div className="flex justify-between py-2 px-2">
                <span className="text-stone-600">Biosecurity & Quarantine Inspection Surcharge</span>
                <span className="font-mono font-semibold text-stone-900">
                  ₱{((transaction.amount || 150) - 100 > 0 ? transaction.amount - 100 : 50).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between py-3 px-2 bg-stone-50/70 border-t border-stone-200 rounded-b-lg font-bold">
                <span className="text-xs font-bold text-stone-900">Total Remitted Amount</span>
                <span className="text-base font-mono font-bold text-green-700">
                  ₱{(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Gateway Audit Metadata */}
          <div className="bg-stone-50/70 border border-stone-200 rounded-xl p-4 space-y-3">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck size={14} className="text-green-700" /> Gateway Audit & Traceability
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-xs font-semibold text-stone-500">Payment Channel</span>
                <div className="mt-1">{getMethodBadge(transaction.method)}</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-stone-500">Transaction Timestamp</span>
                <p className="font-mono text-stone-900 font-semibold mt-1">
                  {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : "N/A"}
                </p>
              </div>
              {transaction.paymongo_session_id && (
                <div className="sm:col-span-2">
                  <span className="text-xs font-semibold text-stone-500">PayMongo Session ID</span>
                  <p className="font-mono text-xs text-stone-700 break-all bg-white border border-stone-200 rounded-lg p-2 mt-1">
                    {transaction.paymongo_session_id}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="btn-tactile px-4 py-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Printer size={14} /> Print Audit Slip
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-tactile px-5 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
