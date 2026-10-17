import useScrollReveal from '../../../../hooks/useScrollReveal';
import { Receipt, CreditCard } from "lucide-react";

const FEES = [
  { doc: "Veterinary Health Certificate",    fee: "₱50.00" },
  { doc: "Transportation Pass",              fee: "₱50.00" },
  { doc: "Local Transport Permit (Sariaya)", fee: "₱50.00" },
];

export default function PermitFees() {
  const sectionRef = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="bg-white border-y border-stone-200 py-16">
      <div ref={sectionRef} className="reveal-block max-w-[54rem] mx-auto px-8 max-[640px]:px-5">

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-stone-200 mb-2">
          <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-amber-700" />
          </div>
          <h2 className="font-archivo text-2xl text-stone-900 font-bold tracking-tight">Permit Fees Schedule</h2>
        </div>
        <p className="font-jakarta text-sm text-stone-600 leading-relaxed mb-6">
          Official regulatory fees for livestock movement clearances per Sariaya Municipal Ordinance. All fees are non-refundable.
        </p>

        {/* Table */}
        <div className="border border-stone-200 rounded-lg overflow-hidden mb-6 w-full">
          <table className="w-full border-collapse font-jakarta text-left">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-4 py-3 text-xs font-semibold text-stone-700 uppercase tracking-wider">Document Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-700 uppercase tracking-wider text-right">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-sm">
              {FEES.map(({ doc, fee }, i) => (
                <tr key={i} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 py-3 text-stone-800">{doc}</td>
                  <td className="px-4 py-3 text-stone-900 font-medium text-right">{fee}</td>
                </tr>
              ))}
              <tr className="bg-stone-100/70 border-t-2 border-stone-300 font-semibold">
                <td className="px-4 py-3 text-stone-900">Total Statutory Fee</td>
                <td className="px-4 py-3 text-green-700 text-right">₱150.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment box */}
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-5">
          <div className="flex items-center gap-2.5 font-archivo text-sm font-semibold text-stone-900 mb-3">
            <div className="w-7 h-7 bg-emerald-100 border border-emerald-200 rounded flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-emerald-700" />
            </div>
            Payment Methods
          </div>
          <div className="space-y-2 text-xs text-stone-600 leading-relaxed">
            <p>
              <strong className="text-stone-900">Online Channels:</strong> PayMongo gateway integration supports GCash, Maya, and credit/debit cards upon permit approval.
            </p>
            <p>
              <strong className="text-stone-900">Over-the-Counter:</strong> Municipal Treasury Office, Ground Floor, New Municipal Hall (Monday to Friday, 8:00 AM to 5:00 PM).
            </p>
            <p className="text-green-800 font-medium pt-1">
              Note: Digital transport permit and QR pass are issued immediately upon automated payment verification.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}