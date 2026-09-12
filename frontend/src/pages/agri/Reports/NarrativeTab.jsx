import { Sparkles } from "lucide-react";

/**
 * Tab 2: Executive Narrative — summary metric cards plus editable
 * executive summary and biosecurity findings paragraphs.
 */
const NarrativeTab = ({ draftData, onSummaryChange, onFindingsChange }) => {
  return (
    <div className="space-y-5">
      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {draftData.key_metrics?.map((km, idx) => (
          <div key={idx} className="bg-stone-50 border border-stone-200 p-3 space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">
              {km.label}
            </span>
            <p className="text-sm font-black text-stone-800">{km.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
            <Sparkles size={12} className="text-green-700" />
            I. Executive Summary (Auto-Synthesized Formal Narrative)
          </label>
          <span className="text-[10px] text-stone-400">Editable Paragraph</span>
        </div>
        <textarea
          rows={5}
          value={draftData.executive_summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          className="w-full border border-stone-300 p-3 text-xs leading-relaxed font-medium text-stone-900 bg-white focus:outline-none focus:border-green-700"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
            <Sparkles size={12} className="text-green-700" />
            II. Biosecurity Surveillance & Movement Findings
          </label>
          <span className="text-[10px] text-stone-400">Editable Paragraph</span>
        </div>
        <textarea
          rows={4}
          value={draftData.biosecurity_findings}
          onChange={(e) => onFindingsChange(e.target.value)}
          className="w-full border border-stone-300 p-3 text-xs leading-relaxed font-medium text-stone-900 bg-white focus:outline-none focus:border-green-700"
        />
      </div>
    </div>
  );
};

export default NarrativeTab;