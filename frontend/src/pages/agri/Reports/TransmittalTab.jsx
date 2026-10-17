import { Building2, Stethoscope, Scale, FileText } from "lucide-react";

/**
 * Tab 1: Transmittal & Routing
 * Formatted for standard Philippine Local Government Unit Memorandum header.
 */
const TransmittalTab = ({ transmittal, onChange, onRecipientPreset }) => {
  return (
    <div className="space-y-6">
      {/* Official Routing Notice */}
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 flex items-start gap-3">
        <FileText size={16} className="text-green-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-stone-800">
            Standard Philippine LGU Memorandum Routing
          </p>
          <p className="text-xs text-stone-600 leading-relaxed">
            Header formatted for formal submission under RA 7160. Choose a recipient preset below to auto-fill or enter a custom address line.
          </p>
        </div>
      </div>

      {/* Recipient Presets */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-stone-600">
          Official Recipient Presets
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRecipientPreset("mayor")}
            className="btn-tactile text-xs font-medium px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Building2 size={13} className="text-stone-500" />
            Municipal Mayor (Hon. Marcelo P. Gayeta)
          </button>
          <button
            type="button"
            onClick={() => onRecipientPreset("opv")}
            className="btn-tactile text-xs font-medium px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Stethoscope size={13} className="text-stone-500" />
            Provincial Veterinarian (OPV Quezon)
          </button>
          <button
            type="button"
            onClick={() => onRecipientPreset("sb")}
            className="btn-tactile text-xs font-medium px-3 py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Scale size={13} className="text-stone-500" />
            Sangguniang Bayan (Committee on Agriculture)
          </button>
        </div>
      </div>

      {/* Transmittal Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="memo-for" className="block text-xs font-semibold text-stone-700">
            MEMORANDUM FOR:
          </label>
          <input
            id="memo-for"
            type="text"
            value={transmittal.memo_for || ""}
            onChange={(e) => onChange("memo_for", e.target.value)}
            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="memo-through" className="block text-xs font-semibold text-stone-700">
            THROUGH:
          </label>
          <input
            id="memo-through"
            type="text"
            value={transmittal.memo_through || ""}
            onChange={(e) => onChange("memo_through", e.target.value)}
            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="memo-from" className="block text-xs font-semibold text-stone-700">
            FROM:
          </label>
          <input
            id="memo-from"
            type="text"
            value={transmittal.memo_from || ""}
            onChange={(e) => onChange("memo_from", e.target.value)}
            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="memo-date" className="block text-xs font-semibold text-stone-700">
            DATE OF ISSUANCE:
          </label>
          <input
            id="memo-date"
            type="text"
            value={transmittal.date || ""}
            onChange={(e) => onChange("date", e.target.value)}
            className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="memo-subject" className="block text-xs font-semibold text-stone-700">
          SUBJECT:
        </label>
        <input
          id="memo-subject"
          type="text"
          value={transmittal.subject || ""}
          onChange={(e) => onChange("subject", e.target.value)}
          className="h-10 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="memo-legal-bases" className="block text-xs font-semibold text-stone-700">
          LEGAL BASES & REGULATORY REFERENCES:
        </label>
        <textarea
          id="memo-legal-bases"
          rows={3}
          value={transmittal.legal_bases || ""}
          onChange={(e) => onChange("legal_bases", e.target.value)}
          className="w-full rounded-lg border border-stone-200 bg-white p-3 text-xs leading-relaxed text-stone-800 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
        />
      </div>
    </div>
  );
};

export default TransmittalTab;