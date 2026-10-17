import { FileSpreadsheet, ShieldAlert } from "lucide-react";

/**
 * Tab 2: Executive Narrative & Key Metrics
 * Presents summarized database totals alongside editable executive commentary.
 */
const NarrativeTab = ({ draftData, onSummaryChange, onFindingsChange }) => {
  return (
    <div className="space-y-6">
      {/* Key Metric Highlights */}
      {draftData.key_metrics && draftData.key_metrics.length > 0 && (
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-stone-600">
            Database Summary Highlights
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {draftData.key_metrics.map((km, idx) => (
              <div
                key={idx}
                className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-0.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                  {km.label}
                </span>
                <p className="text-base font-bold text-stone-900">{km.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section I: Executive Summary */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="narrative-summary"
            className="text-xs font-bold text-stone-800 flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} className="text-green-700" />
            Section I — Executive Summary (Memorandum Introduction)
          </label>
          <span className="text-xs text-stone-400">Editable Paragraph</span>
        </div>
        <textarea
          id="narrative-summary"
          rows={5}
          value={draftData.executive_summary || ""}
          onChange={(e) => onSummaryChange(e.target.value)}
          className="w-full rounded-lg border border-stone-200 bg-white p-3 text-xs leading-relaxed font-normal text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
          placeholder="Enter official executive summary..."
        />
      </div>

      {/* Section II: Biosecurity Surveillance & Movement Findings */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="narrative-findings"
            className="text-xs font-bold text-stone-800 flex items-center gap-1.5"
          >
            <ShieldAlert size={14} className="text-emerald-700" />
            Section II — Biosecurity Surveillance & Movement Findings
          </label>
          <span className="text-xs text-stone-400">Editable Paragraph</span>
        </div>
        <textarea
          id="narrative-findings"
          rows={4}
          value={draftData.biosecurity_findings || ""}
          onChange={(e) => onFindingsChange(e.target.value)}
          className="w-full rounded-lg border border-stone-200 bg-white p-3 text-xs leading-relaxed font-normal text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
          placeholder="Enter biosecurity findings..."
        />
      </div>
    </div>
  );
};

export default NarrativeTab;