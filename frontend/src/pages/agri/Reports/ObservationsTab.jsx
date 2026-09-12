import { Plus, Trash2 } from "lucide-react";

/**
 * Tab 3: Findings & Actions — editable operational observations and
 * policy recommendations lists.
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
    <div className="space-y-6">
      {/* Observations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-stone-800">
            Operational Observations & Highlights
          </label>
          <button
            type="button"
            onClick={onAddObservation}
            className="text-[10px] font-bold text-green-700 hover:text-green-900 inline-flex items-center gap-1"
          >
            <Plus size={14} /> Add Observation
          </button>
        </div>

        <div className="space-y-2">
          {operationalObservations?.map((obs, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-400">•</span>
              <input
                type="text"
                value={obs}
                onChange={(e) => onChangeObservation(idx, e.target.value)}
                className="flex-1 border border-stone-300 p-2 text-xs text-stone-800 bg-white focus:outline-none focus:border-green-700"
              />
              <button
                type="button"
                onClick={() => onDeleteObservation(idx)}
                className="text-stone-400 hover:text-red-600 p-1.5 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <label className="text-[11px] font-black uppercase tracking-wider text-stone-800">
            Policy Recommendations & Action Items
          </label>
          <button
            type="button"
            onClick={onAddRecommendation}
            className="text-[10px] font-bold text-green-700 hover:text-green-900 inline-flex items-center gap-1"
          >
            <Plus size={14} /> Add Recommendation
          </button>
        </div>

        <div className="space-y-2">
          {recommendations?.map((rec, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500 w-5">{idx + 1}.</span>
              <input
                type="text"
                value={rec}
                onChange={(e) => onChangeRecommendation(idx, e.target.value)}
                className="flex-1 border border-stone-300 p-2 text-xs text-stone-800 bg-white focus:outline-none focus:border-green-700"
              />
              <button
                type="button"
                onClick={() => onDeleteRecommendation(idx)}
                className="text-stone-400 hover:text-red-600 p-1.5 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ObservationsTab;