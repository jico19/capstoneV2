import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import { downloadBlob } from "../../../lib/utils";
import { toast } from "sonner";
import {
  X,
  FileText,
  RotateCcw,
  Download,
  Loader2,
  UserCheck,
  CheckCircle2,
  Send,
} from "lucide-react";
import TransmittalTab from "./TransmittalTab";
import NarrativeTab from "./NarrativeTab";
import ObservationsTab from "./ObservationsTab";
import SignatoriesTab from "./SignatoriesTab";

/**
 * ReportDrafterModal
 * Allows the Agri Officer to review, customize, and export an official
 * Philippine LGU Memorandum & Accomplishment Report.
 * All fields are 100% pre-filled with auto-generated government prose.
 */
const ReportDrafterModal = ({ isOpen, onClose, report, startDate, endDate }) => {
  const [activeTab, setActiveTab] = useState("transmittal");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [draftData, setDraftData] = useState(null);

  const fetchDraft = useCallback(async () => {
    if (!report) return;
    setLoading(true);
    try {
      const { data } = await api.get("/report/draft/", {
        params: {
          report_type: report.reportType,
          start_date: startDate,
          end_date: endDate,
        },
      });
      setDraftData(data);
    } catch (err) {
      toast.error("Failed to load report draft", {
        description: err.response?.data?.error || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  }, [report, startDate, endDate]);

  useEffect(() => {
    if (isOpen) {
      fetchDraft();
      setActiveTab("transmittal");
    }
  }, [isOpen, fetchDraft]);

  if (!isOpen) return null;

  const handleTransmittalChange = (field, value) => {
    setDraftData((prev) => ({
      ...prev,
      transmittal: {
        ...prev.transmittal,
        [field]: value,
      },
    }));
  };

  const handleSignatoryChange = (field, value) => {
    setDraftData((prev) => ({
      ...prev,
      signatories: {
        ...prev.signatories,
        [field]: value,
      },
    }));
  };

  const setRecipientPreset = (presetName) => {
    if (presetName === "mayor") {
      handleTransmittalChange("memo_for", "HON. MARCELO P. GAYETA, Municipal Mayor");
    } else if (presetName === "opv") {
      handleTransmittalChange("memo_for", "DR. FLOMIELLA A. CADA, Provincial Veterinarian (OPV - Quezon)");
    } else if (presetName === "sb") {
      handleTransmittalChange("memo_for", "COMMITTEE ON AGRICULTURE, Sangguniang Bayan of Sariaya");
    }
    toast.success("Recipient Updated");
  };

  const handleAddObservation = () => {
    setDraftData((prev) => ({
      ...prev,
      operational_observations: [
        ...prev.operational_observations,
        "New observed operational highlight or checkpoint observation.",
      ],
    }));
  };

  const handleObservationChange = (index, value) => {
    setDraftData((prev) => {
      const updated = [...prev.operational_observations];
      updated[index] = value;
      return { ...prev, operational_observations: updated };
    });
  };

  const handleDeleteObservation = (index) => {
    setDraftData((prev) => ({
      ...prev,
      operational_observations: prev.operational_observations.filter((_, i) => i !== index),
    }));
  };

  const handleAddRecommendation = () => {
    setDraftData((prev) => ({
      ...prev,
      recommendations: [
        ...prev.recommendations,
        "New actionable policy or operational recommendation.",
      ],
    }));
  };

  const handleRecommendationChange = (index, value) => {
    setDraftData((prev) => {
      const updated = [...prev.recommendations];
      updated[index] = value;
      return { ...prev, recommendations: updated };
    });
  };

  const handleDeleteRecommendation = (index) => {
    setDraftData((prev) => ({
      ...prev,
      recommendations: prev.recommendations.filter((_, i) => i !== index),
    }));
  };

  const handleExportFormalPdf = async () => {
    if (!draftData) return;
    setGenerating(true);
    try {
      const response = await api.post("/report/export-formal-pdf/", draftData, {
        responseType: "blob",
      });

      const filename = `LGU_MEMORANDUM_${report.reportType.toUpperCase()}_${startDate}_to_${endDate}.pdf`;
      downloadBlob(response.data, filename);
      toast.success("Report Generated", {
        description: "Official LGU Memorandum PDF downloaded successfully.",
      });
      onClose();
    } catch {
      toast.error("Generation Failed", {
        description: "Failed to compile the government PDF document.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border-2 border-stone-800 w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between border-b border-stone-700">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-950/80 px-2 py-0.5 border border-green-800">
                Official LGU Report Drafter
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                Period: {startDate} → {endDate}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight uppercase">
              {report?.title || "Municipal Memorandum Report"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 text-xs font-bold uppercase tracking-wider overflow-x-auto">
          <button
            onClick={() => setActiveTab("transmittal")}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "transmittal"
                ? "border-green-700 text-green-800 bg-white"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Send size={14} /> Transmittal & Routing
          </button>
          <button
            onClick={() => setActiveTab("narrative")}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "narrative"
                ? "border-green-700 text-green-800 bg-white"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <FileText size={14} /> Executive Narrative
          </button>
          <button
            onClick={() => setActiveTab("observations")}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "observations"
                ? "border-green-700 text-green-800 bg-white"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <CheckCircle2 size={14} /> Findings & Actions
          </button>
          <button
            onClick={() => setActiveTab("signatories")}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === "signatories"
                ? "border-green-700 text-green-800 bg-white"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <UserCheck size={14} /> Signatories
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3 text-stone-500">
              <Loader2 size={32} className="animate-spin text-green-700" />
              <p className="text-xs font-bold tracking-wider uppercase">
                Synthesizing Database Records & Auto-Drafting Prose...
              </p>
            </div>
          ) : !draftData ? (
            <div className="py-16 text-center text-stone-500 text-sm">
              Failed to load draft data. Please try again.
            </div>
          ) : (
            <>
              {/* TAB 1: Transmittal & Routing */}
              {activeTab === "transmittal" && (
                <TransmittalTab
                  transmittal={draftData.transmittal}
                  onChange={handleTransmittalChange}
                  onRecipientPreset={setRecipientPreset}
                />
              )}

              {/* TAB 2: Executive Narrative */}
              {activeTab === "narrative" && (
                <NarrativeTab
                  draftData={draftData}
                  onSummaryChange={(value) => setDraftData({ ...draftData, executive_summary: value })}
                  onFindingsChange={(value) => setDraftData({ ...draftData, biosecurity_findings: value })}
                />
              )}

              {/* TAB 3: Observations & Recommendations */}
              {activeTab === "observations" && (
                <ObservationsTab
                  operationalObservations={draftData.operational_observations}
                  recommendations={draftData.recommendations}
                  onAddObservation={handleAddObservation}
                  onChangeObservation={handleObservationChange}
                  onDeleteObservation={handleDeleteObservation}
                  onAddRecommendation={handleAddRecommendation}
                  onChangeRecommendation={handleRecommendationChange}
                  onDeleteRecommendation={handleDeleteRecommendation}
                />
              )}

              {/* TAB 4: Signatories */}
              {activeTab === "signatories" && (
                <SignatoriesTab
                  signatories={draftData.signatories}
                  onChange={handleSignatoryChange}
                />
              )}
            </>
          )}
        </div>

        {/* Modal Footer Action Bar */}
        <div className="bg-stone-100 border-t border-stone-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={fetchDraft}
            disabled={loading || generating}
            className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={14} /> Reset to Auto-Drafted Defaults
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-stone-300 text-stone-700 text-xs font-bold uppercase tracking-wider hover:bg-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || generating || !draftData}
              onClick={handleExportFormalPdf}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-green-700 hover:bg-green-800 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating LGU PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Formal Government PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDrafterModal;