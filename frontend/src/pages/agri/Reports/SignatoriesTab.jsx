import { UserCheck } from "lucide-react";

/**
 * Tab 4: Signatories Chain
 * Official 3-tier municipal attestation chain required under Philippine LGU reporting standards.
 */
const SignatoriesTab = ({ signatories, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 flex items-start gap-3">
        <UserCheck size={16} className="text-green-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-stone-800">
            Report signers
          </p>
          <p className="text-xs text-stone-600 leading-relaxed">
            Verifier and approver start from Settings. Edits apply only to this report.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1: Prepared By */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <span className="w-5 h-5 rounded-md bg-green-50 border border-green-200 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <p className="text-xs font-bold text-stone-800">
              Prepared By
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="prepared-by-name" className="block text-[11px] font-semibold text-stone-600">
              Drafting Officer Name
            </label>
            <input
              id="prepared-by-name"
              type="text"
              value={signatories.prepared_by_name || ""}
              onChange={(e) => onChange("prepared_by_name", e.target.value)}
              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="prepared-by-title" className="block text-[11px] font-semibold text-stone-600">
              Designation / Title
            </label>
            <input
              id="prepared-by-title"
              type="text"
              value={signatories.prepared_by_title || ""}
              onChange={(e) => onChange("prepared_by_title", e.target.value)}
              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
            />
          </div>
        </div>

        {/* Tier 2: Certified Correct By */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <span className="w-5 h-5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <p className="text-xs font-bold text-stone-800">
              Certified Correct
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="verified-by-name" className="block text-[11px] font-semibold text-stone-600">
              Veterinarian / Officer Name
            </label>
            <input
              id="verified-by-name"
              type="text"
              value={signatories.verified_by_name || ""}
              onChange={(e) => onChange("verified_by_name", e.target.value)}
              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="verified-by-title" className="block text-[11px] font-semibold text-stone-600">
              Designation / Title
            </label>
            <input
              id="verified-by-title"
              type="text"
              value={signatories.verified_by_title || ""}
              onChange={(e) => onChange("verified_by_title", e.target.value)}
              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
            />
          </div>
        </div>

        {/* Tier 3: Approved By */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <span className="w-5 h-5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <p className="text-xs font-bold text-stone-800">
              Approved By
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="approved-by-name" className="block text-[11px] font-semibold text-stone-600">
              Municipal Agriculturist Name
            </label>
            <input
              id="approved-by-name"
              type="text"
              value={signatories.approved_by_name || ""}
              onChange={(e) => onChange("approved_by_name", e.target.value)}
              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs font-semibold"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="approved-by-title" className="block text-[11px] font-semibold text-stone-600">
              Designation / Title
            </label>
            <input
              id="approved-by-title"
              type="text"
              value={signatories.approved_by_title || ""}
              onChange={(e) => onChange("approved_by_title", e.target.value)}
              className="h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatoriesTab;
