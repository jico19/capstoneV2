import { Plus, Trash2, ListOrdered, ClipboardList } from "lucide-react";

/**
 * Tab 3: Findings & Action Items
 * Dynamic list manager for operational observations and policy recommendations.
 */
const ObservationsTab = ({
  operationalObservations,
  recommendations,
  onAddObservation,
  onChangeObservation,
  onDeleteObservation,
  onAddRecommendation,
  onChangeRecommendation,
  onDeleteRecommendation,
}) => {
  return (
    <div className="space-y-8">
      {/* Observations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-green-700" />
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wide">
              Section III — Operational Observations & Field Highlights
            </h3>
          </div>
          <button
            type="button"
            onClick={onAddObservation}
            className="btn-tactile text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition-colors"
          >
            <Plus size={13} /> Add Point
          </button>
        </div>

        {(!operationalObservations || operationalObservations.length === 0) ? (
          <p className="text-xs text-stone-500 py-3 text-center bg-stone-50 rounded-lg border border-stone-100">
            No operational observations added yet. Click &quot;Add Point&quot; above to add one.
          </p>
        ) : (
          <div className="space-y-2">
            {operationalObservations.map((obs, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-stone-100 border border-stone-200 text-stone-600 text-xs font-semibold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={obs}
                  onChange={(e) => onChangeObservation(idx, e.target.value)}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
                  placeholder="Enter observation or note..."
                />
                <button
                  type="button"
                  onClick={() => onDeleteObservation(idx)}
                  title="Remove observation"
                  aria-label="Remove observation"
                  className="btn-tactile text-stone-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <div className="flex items-center gap-2">
            <ListOrdered size={16} className="text-emerald-700" />
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wide">
              Section IV — Policy Recommendations & Action Items
            </h3>
          </div>
          <button
            type="button"
            onClick={onAddRecommendation}
            className="btn-tactile text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition-colors"
          >
            <Plus size={13} /> Add Recommendation
          </button>
        </div>

        {(!recommendations || recommendations.length === 0) ? (
          <p className="text-xs text-stone-500 py-3 text-center bg-stone-50 rounded-lg border border-stone-100">
            No recommendations added yet. Click &quot;Add Recommendation&quot; above to add one.
          </p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-stone-100 border border-stone-200 text-stone-600 text-xs font-semibold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={rec}
                  onChange={(e) => onChangeRecommendation(idx, e.target.value)}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 shadow-2xs"
                  placeholder="Enter policy recommendation..."
                />
                <button
                  type="button"
                  onClick={() => onDeleteRecommendation(idx)}
                  title="Remove recommendation"
                  aria-label="Remove recommendation"
                  className="btn-tactile text-stone-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ObservationsTab;