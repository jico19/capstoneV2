import React, { useState, useMemo } from "react";
import { usePayment, usePaymentStats } from "../../../hooks/usePayment";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Inbox,
  AlertCircle,
  CreditCard,
  QrCode,
  Download,
  Loader2,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Building,
  Eye,
  ArrowUpDown,
  Sparkles,
  Receipt,
} from "lucide-react";
import Pagination from "../../../components/ui/Pagination";
import TransactionDetailModal from "./TransactionDetailModal";
import ReportDrafterModal from "../Reports/ReportDrafterModal";

/**
 * AgriPaymentPage
 * Modern Financial Audit & Collections Ledger for the Municipal Agriculture Office.
 * Features real-time server-side filters, search, aggregate statistics, transaction
 * inspection modal, and one-click LGU Memorandum report generator.
 */
const AgriPaymentPage = () => {
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");

  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Fetch paginated & filtered transactions
  const { data, isLoading, isError, refetch, isFetching } = usePayment(limit, offset, {
    search: searchQuery,
    status: statusFilter,
    method: methodFilter,
    startDate,
    endDate,
  });

  // Fetch comprehensive aggregate statistics across the entire ledger
  const { data: statsData, isLoading: statsLoading } = usePaymentStats();

  const payments = data?.results || [];
  const count = data?.count || 0;

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setStartDate("");
    setEndDate("");
    setOffset(0);
  };

  const getMethodBadge = (method) => {
    const m = (method || "").toLowerCase();
    if (m === "qrph") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
          <QrCode size={11} className="text-emerald-700" /> QR Ph
        </span>
      );
    }
    if (m === "gcash") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
          <CreditCard size={11} className="text-blue-700" /> GCash
        </span>
      );
    }
    if (m === "card") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-800 border border-purple-200">
          <CreditCard size={11} className="text-purple-700" /> Card
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-200">
        <CreditCard size={11} className="text-stone-500" /> {method || "Direct"}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-10 space-y-8 bg-stone-50/40 min-h-full">
      {/* 1. Page Header */}
      <div className="border-b border-stone-200 pb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              Financial Management & Audit
            </span>
            <span className="text-[9px] font-black uppercase bg-green-100 text-green-800 px-2 py-0.5 border border-green-200">
              Live Treasury Ledger
            </span>
          </div>
          <h1 className="text-3xl font-black text-stone-900 uppercase tracking-tight">
            Collections & Revenue
          </h1>
          <p className="text-sm font-medium text-stone-500">
            Audit trail, regulatory fee collections, and electronic payment reconciliation for livestock permits.
          </p>
        </div>

        {/* Header Action: Generate Collection Report */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowReportModal(true)}
            className="flex-1 sm:flex-initial px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Sparkles size={14} className="text-green-400" />
            Generate Collection Report
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Remitted Collections */}
        <div className="bg-white border border-stone-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              Total Remitted Collections
            </span>
            <div className="p-2 bg-green-50 text-green-700 border border-green-100">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-stone-900 tracking-tight">
              ₱{(statsData?.total_collected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] font-bold text-stone-500 mt-1 flex items-center gap-1">
              <Building size={11} /> Municipal Regulatory Trust Fund
            </p>
          </div>
        </div>

        {/* Cleared Transactions */}
        <div className="bg-white border border-stone-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              Cleared Transactions
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-stone-900 tracking-tight">
              {(statsData?.total_cleared || 0).toLocaleString()} <span className="text-xs font-bold text-stone-400">cleared</span>
            </p>
            <p className="text-[10px] font-bold text-emerald-700 mt-1">
              100% Electronic Reconciliation
            </p>
          </div>
        </div>

        {/* Digital Payment Channels */}
        <div className="bg-white border border-stone-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              Digital Gateways (PayMongo)
            </span>
            <div className="p-2 bg-blue-50 text-blue-700 border border-blue-100">
              <CreditCard size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-stone-900 tracking-tight">
              {(statsData?.digital_count || 0).toLocaleString()} <span className="text-xs font-bold text-stone-400">payments</span>
            </p>
            <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-stone-500">
              <span>QR Ph: {statsData?.methods?.qrph || 0}</span>
              <span>•</span>
              <span>GCash: {statsData?.methods?.gcash || 0}</span>
            </div>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="bg-white border border-stone-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              Pending / In Progress
            </span>
            <div className="p-2 bg-amber-50 text-amber-700 border border-amber-100">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-stone-900 tracking-tight">
              {(statsData?.pending_count || 0).toLocaleString()} <span className="text-xs font-bold text-stone-400">records</span>
            </p>
            <p className="text-[10px] font-bold text-stone-500 mt-1">
              Awaiting Cashier or Gateway Callback
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-white border border-stone-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="Search by Transaction ID (#TRX-XX), OR Number, Farmer Name, or Permit Number..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setOffset(0);
              }}
              className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-green-700 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-44">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 text-xs font-bold uppercase tracking-wider text-stone-800 focus:outline-none focus:bg-white focus:border-green-700 transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Cleared (Success)</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="w-full lg:w-48">
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 text-xs font-bold uppercase tracking-wider text-stone-800 focus:outline-none focus:bg-white focus:border-green-700 transition-colors"
            >
              <option value="ALL">All Gateways</option>
              <option value="qrph">QR Ph (Sari-Sari Store)</option>
              <option value="gcash">GCash E-Wallet</option>
              <option value="card">Credit / Debit Card</option>
              <option value="paymaya">PayMaya</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3.5 py-2.5 border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-stone-900 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-green-700" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Date Filter Row & Active Filter Clearer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2 text-stone-500">
            <Calendar size={14} className="text-stone-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
              Filter by Date Range:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setOffset(0);
              }}
              className="border border-stone-200 px-2 py-1 text-xs font-mono bg-stone-50 text-stone-800 focus:outline-none focus:border-green-700"
            />
            <span className="text-stone-400 font-bold">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setOffset(0);
              }}
              className="border border-stone-200 px-2 py-1 text-xs font-mono bg-stone-50 text-stone-800 focus:outline-none focus:border-green-700"
            />
          </div>

          {(searchQuery || statusFilter !== "ALL" || methodFilter !== "ALL" || startDate || endDate) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] font-bold text-green-800 hover:text-green-950 underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Ledger Table */}
      <div className="bg-white border border-stone-200 shadow-sm">
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-stone-500" />
            <span className="text-xs font-black uppercase tracking-wider text-stone-800">
              Transaction Ledger
            </span>
            <span className="text-[10px] font-mono font-bold bg-stone-200 text-stone-700 px-1.5 py-0.5">
              {count} records
            </span>
          </div>
          {isFetching && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              <Loader2 size={12} className="animate-spin text-green-700" />
              Updating...
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/70 text-[10px] font-black uppercase tracking-widest text-stone-500">
                <th className="py-3.5 px-6">Transaction Ref / OR #</th>
                <th className="py-3.5 px-6">Payer (Farmer)</th>
                <th className="py-3.5 px-6">Associated Permit</th>
                <th className="py-3.5 px-6 text-center">Payment Channel</th>
                <th className="py-3.5 px-6 text-right">Amount</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-24 text-center">
                    <Loader2 size={28} className="animate-spin text-green-700 mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Syncing Financial Ledger...
                    </p>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-20 text-center">
                    <Inbox className="mx-auto text-stone-300 mb-2" size={40} />
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      No transaction records match your filters
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Try clearing search parameters or adjusting date bounds.
                    </p>
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const isCleared =
                    p.raw_status === "SUCCESS" ||
                    p.raw_status === "CONFIRMED" ||
                    p.payment_status?.toLowerCase() === "cleared" ||
                    p.payment_status?.toLowerCase() === "success";

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedTransaction(p)}
                      className="hover:bg-stone-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Reference & OR Number */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <span className="text-xs font-mono font-black text-stone-900 group-hover:text-green-800 transition-colors">
                            #TRX-{p.id}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {p.or_number ? (
                              <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-100 px-1 py-0.2 border border-stone-200">
                                OR #{p.or_number}
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-stone-400 uppercase">
                                No OR Issued
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-stone-400 font-mono">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
                          </p>
                        </div>
                      </td>

                      {/* Farmer / Payer */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-stone-900 uppercase">
                            {p.farmer_name || "N/A"}
                          </p>
                          {p.farmer_phone && (
                            <p className="text-[10px] font-mono text-stone-500">
                              {p.farmer_phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Associated Permit */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <span className="text-xs font-mono font-black text-stone-800">
                            {p.permit_number || "Permit On File"}
                          </span>
                          {p.destination && (
                            <p className="text-[10px] text-stone-500 truncate max-w-[180px]">
                              Dest: <span className="font-bold text-stone-700">{p.destination}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="py-4 px-6 text-center">
                        {getMethodBadge(p.method)}
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-black font-mono text-stone-900">
                          ₱{(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        {isCleared ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-green-700 bg-green-50 px-2 py-0.5 border border-green-200">
                            <CheckCircle2 size={12} className="text-green-600" /> Cleared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200">
                            <Clock size={12} className="text-amber-600" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedTransaction(p)}
                          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> Audit Slip
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination count={count} limit={limit} offset={offset} onPageChange={setOffset} />
      </div>

      {/* Transaction Details Modal */}
      <TransactionDetailModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />

      {/* Report Drafter Modal for Revenue Collection */}
      <ReportDrafterModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        report={{
          id: "revenue-collection",
          reportType: "revenue_collection",
          title: "Revenue & Fees Collection Accomplishment Report",
        }}
        startDate={startDate || todayStr}
        endDate={endDate || todayStr}
      />
    </div>
  );
};

export default AgriPaymentPage;
