import { Sparkles, Building, Scale } from "lucide-react";

/**
 * Tab 1: Transmittal & Routing form fields with quick recipient presets.
 */
const TransmittalTab = ({ transmittal, onChange, onRecipientPreset }) => {
  return (
    <div className="space-y-5">
      <div className="bg-green-50 border border-green-200 p-3.5 flex items-start gap-3">
        <Sparkles size={18} className="text-green-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-black text-green-950 uppercase tracking-wide">
            Memorandum Routing Pre-Filled
          </p>
          <p className="text-xs text-green-800 leading-relaxed">
            The transmittal header is formatted for official Philippine LGU Memorandum routing. You can select a quick recipient preset or edit any line below.
          </p>
        </div>
      </div>

      {/* Recipient Presets */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
          Quick Recipient Presets (Click to Auto-Fill)
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRecipientPreset("mayor")}
            className="text-[11px] font-bold px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors flex items-center gap-1.5"
          >
            <Building size={12} /> Municipal Mayor (Hon. Marcelo P. Gayeta)
          </button>
          <button
            type="button"
            onClick={() => onRecipientPreset("opv")}
            className="text-[11px] font-bold px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors flex items-center gap-1.5"
          >
            <Building size={12} /> Provincial Veterinarian (OPV Quezon)
          </button>
          <button
            type="button"
            onClick={() => onRecipientPreset("sb")}
            className="text-[11px] font-bold px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors flex items-center gap-1.5"
          >
            <Scale size={12} /> Sangguniang Bayan (Committee on Agriculture)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            MEMORANDUM FOR:
          </label>
          <input
            type="text"
            value={transmittal.memo_for}
            onChange={(e) => onChange("memo_for", e.target.value)}
            className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            THROUGH:
          </label>
          <input
            type="text"
            value={transmittal.memo_through}
            onChange={(e) => onChange("memo_through", e.target.value)}
            className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            FROM:
          </label>
          <input
            type="text"
            value={transmittal.memo_from}
            onChange={(e) => onChange("memo_from", e.target.value)}
            className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            DATE:
          </label>
          <input
            type="text"
            value={transmittal.date}
            onChange={(e) => onChange("date", e.target.value)}
            className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
          SUBJECT:
        </label>
        <input
          type="text"
          value={transmittal.subject}
          onChange={(e) => onChange("subject", e.target.value)}
          className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
          LEGAL BASES & REGULATORY REFERENCES:
        </label>
        <textarea
          rows={3}
          value={transmittal.legal_bases}
          onChange={(e) => onChange("legal_bases", e.target.value)}
          className="w-full border border-stone-300 p-2.5 text-xs font-medium text-stone-800 bg-white focus:outline-none focus:border-green-700"
        />
      </div>
    </div>
  );
};

export default TransmittalTab;