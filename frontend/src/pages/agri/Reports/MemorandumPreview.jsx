/**
 * MemorandumPreview Component
 * Renders a scaled, live A4 document sheet preview of the official
 * Philippine Local Government Unit (LGU) Memorandum.
 * Updates in real-time as the officer types in any tab.
 */
const MemorandumPreview = ({ draftData, report, startDate, endDate, zoom = 100 }) => {
  if (!draftData) return null;

  const {
    transmittal,
    key_metrics,
    executive_summary,
    biosecurity_findings,
    operational_observations,
    recommendations,
    signatories,
  } = draftData;

  const zoomScale = zoom / 100;

  return (
    <div
      style={{
        transform: zoom !== 100 ? `scale(${zoomScale})` : undefined,
        transformOrigin: "top center",
      }}
      className="w-full max-w-[590px] bg-white shadow-xl border border-stone-300 rounded-sm p-6 sm:p-8 text-stone-900 space-y-5 text-xs leading-relaxed select-none transition-transform duration-150 shrink-0"
    >
      {/* Official LGU Letterhead */}
      <div className="text-center space-y-0.5 border-b-2 border-stone-900 pb-3">
        <p className="text-[10px] tracking-wider uppercase font-semibold text-stone-600">
          Republic of the Philippines
        </p>
        <p className="text-[10px] tracking-wider uppercase font-semibold text-stone-600">
          Province of Quezon
        </p>
        <h3 className="text-xs font-black tracking-widest uppercase text-stone-900">
          Municipality of Sariaya
        </h3>
        <p className="text-[11px] font-bold tracking-wide uppercase text-green-800">
          Office of the Municipal Agriculturist
        </p>
        <div className="pt-1.5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
            Code: LGU-SRA-{report?.reportType?.toUpperCase().slice(0, 4) || 'MEMO'}
          </span>
          <span className="text-[9px] font-mono text-stone-500">
            Period: {startDate} to {endDate}
          </span>
        </div>
      </div>

      {/* Transmittal Routing Block */}
      <div className="space-y-1.5 border-b border-stone-300 pb-4 font-mono text-[11px] break-words">
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-0.5 sm:gap-1">
          <span className="font-bold text-stone-800">MEMORANDUM FOR:</span>
          <span className="font-semibold text-stone-900 uppercase">
            {transmittal?.memo_for || "—"}
          </span>
        </div>
        {transmittal?.memo_through && (
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-0.5 sm:gap-1">
            <span className="font-bold text-stone-700">THROUGH:</span>
            <span className="text-stone-800">{transmittal.memo_through}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-0.5 sm:gap-1">
          <span className="font-bold text-stone-700">FROM:</span>
          <span className="text-stone-800">{transmittal?.memo_from || "—"}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-0.5 sm:gap-1">
          <span className="font-bold text-stone-700">DATE:</span>
          <span className="text-stone-800">{transmittal?.date || "—"}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-0.5 sm:gap-1 pt-1 border-t border-stone-200">
          <span className="font-bold text-stone-900">SUBJECT:</span>
          <span className="font-bold text-stone-950 uppercase">
            {transmittal?.subject || report?.title || "—"}
          </span>
        </div>
        {transmittal?.legal_bases && (
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-0.5 sm:gap-1 pt-1 text-[10px] text-stone-600">
            <span className="font-bold">LEGAL BASES:</span>
            <span className="italic">{transmittal.legal_bases}</span>
          </div>
        )}
      </div>

      {/* Section I: Executive Summary */}
      <div className="space-y-1">
        <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px] border-b border-stone-200 pb-0.5">
          I. Executive Summary
        </h4>
        <p className="text-stone-800 text-[11px] text-justify leading-relaxed break-words">
          {executive_summary || "No executive summary provided."}
        </p>
      </div>

      {/* Section II: Key Metrics Synthesis */}
      {key_metrics && key_metrics.length > 0 && (
        <div className="space-y-1">
          <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px] border-b border-stone-200 pb-0.5">
            II. Summary Key Metrics Table
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {key_metrics.map((km, idx) => (
              <div key={idx} className="border border-stone-200 p-2 text-center rounded bg-stone-50/50">
                <span className="text-[9px] uppercase tracking-wider text-stone-500 block truncate">
                  {km.label}
                </span>
                <span className="font-bold text-stone-900 text-xs font-mono">
                  {km.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section III: Biosecurity & Surveillance Findings */}
      {biosecurity_findings && (
        <div className="space-y-1">
          <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px] border-b border-stone-200 pb-0.5">
            III. Biosecurity Surveillance & Movement Findings
          </h4>
          <p className="text-stone-800 text-[11px] text-justify leading-relaxed break-words">
            {biosecurity_findings}
          </p>
        </div>
      )}

      {/* Section IV: Operational Observations */}
      {operational_observations && operational_observations.length > 0 && (
        <div className="space-y-1">
          <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px] border-b border-stone-200 pb-0.5">
            IV. Operational Observations & Field Highlights
          </h4>
          <ul className="list-decimal list-inside space-y-1 text-[11px] text-stone-800 pl-1">
            {operational_observations.map((obs, idx) => (
              <li key={idx} className="leading-snug break-words">{obs}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Section V: Policy Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="space-y-1">
          <h4 className="font-bold text-stone-900 uppercase tracking-wide text-[11px] border-b border-stone-200 pb-0.5">
            V. Policy Recommendations & Action Items
          </h4>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-800 pl-1">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="leading-snug break-words">{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Signatures Attestation Block */}
      <div className="pt-6 border-t-2 border-stone-900 space-y-4">
        <p className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">
          Attestation & Approval Chain
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="text-center space-y-0.5">
            <p className="text-[9px] uppercase font-semibold text-stone-500">Prepared By:</p>
            <div className="h-8 flex items-end justify-center">
              <span className="font-bold text-xs uppercase text-stone-900 border-b border-stone-800 pb-0.5 w-full block truncate">
                {signatories?.prepared_by_name || "____________________"}
              </span>
            </div>
            <p className="text-[9px] text-stone-600 truncate">{signatories?.prepared_by_title || "Drafting Officer"}</p>
          </div>

          <div className="text-center space-y-0.5">
            <p className="text-[9px] uppercase font-semibold text-stone-500">Certified Correct:</p>
            <div className="h-8 flex items-end justify-center">
              <span className="font-bold text-xs uppercase text-stone-900 border-b border-stone-800 pb-0.5 w-full block truncate">
                {signatories?.verified_by_name || "____________________"}
              </span>
            </div>
            <p className="text-[9px] text-stone-600 truncate">{signatories?.verified_by_title || "Veterinarian"}</p>
          </div>

          <div className="text-center space-y-0.5">
            <p className="text-[9px] uppercase font-semibold text-stone-500">Approved By:</p>
            <div className="h-8 flex items-end justify-center">
              <span className="font-bold text-xs uppercase text-stone-900 border-b border-stone-800 pb-0.5 w-full block truncate">
                {signatories?.approved_by_name || "____________________"}
              </span>
            </div>
            <p className="text-[9px] text-stone-600 truncate">{signatories?.approved_by_title || "Municipal Agriculturist"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemorandumPreview;
