import Skeleton from 'react-loading-skeleton';
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
  Users,
  CheckSquare,
  Send,
  Building2,
  Eye,
  Edit3,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import TransmittalTab from "./TransmittalTab";
import NarrativeTab from "./NarrativeTab";
import ObservationsTab from "./ObservationsTab";
import SignatoriesTab from "./SignatoriesTab";
import MemorandumPreview from "./MemorandumPreview";

/**
 * ReportDrafterModal — Executive Drafting Studio (Option A)
 * Two-pane studio combining an interactive editing desk with a live,
 * real-time scaled A4 government memorandum sheet preview.
 */
const ReportDrafterModal = ({ isOpen, onClose, report, startDate, endDate }) => {
  const [activeTab, setActiveTab] = useState("transmittal");
  const [mobileView, setMobileView] = useState("edit"); // 'edit' | 'preview'
  const [zoom, setZoom] = useState(100);
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
      setMobileView("edit");
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
    toast.success("Recipient preset applied");
  };

  const handleAddObservation = () => {
    setDraftData((prev) => ({
      ...prev,
      operational_observations: [
        ...prev.operational_observations,
        "Field inspection observation or biosecurity monitoring note.",
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
        "Policy recommendation or corrective checkpoint action.",
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
      toast.success("Official PDF Generated", {
        description: filename,
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

  const tabs = [
    { id: "transmittal", label: "1. Transmittal", icon: Send },
    { id: "narrative", label: "2. Narrative", icon: FileText },
    { id: "observations", label: "3. Action Items", icon: CheckSquare },
    { id: "signatories", label: "4. Signatories", icon: Users },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-stone-900/50 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget && !generating) onClose();
      }}
    >
      <div className="bg-white border border-stone-200 rounded-xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden modal-enter">
        {/* Studio Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 uppercase tracking-wider">
                <Building2 size={13} /> Municipality of Sariaya
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs font-mono text-stone-500">
                Period: {startDate} → {endDate}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
              Executive Drafting Studio: {report?.title || "Memorandum Drafter"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile View Toggle (< lg) */}
            <div className="lg:hidden flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              <button
                type="button"
                onClick={() => setMobileView("edit")}
                className={`btn-tactile px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  mobileView === "edit"
                    ? "bg-white text-stone-900 shadow-2xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Edit3 size={12} /> Edit Form
              </button>
              <button
                type="button"
                onClick={() => setMobileView("preview")}
                className={`btn-tactile px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                  mobileView === "preview"
                    ? "bg-white text-stone-900 shadow-2xs font-bold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Eye size={12} /> Live Sheet
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              aria-label="Close drafter studio"
              className="btn-tactile p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Studio Dual Workspace */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Pane: Interactive Form Desk */}
          <div
            className={`lg:col-span-5 min-w-0 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-200 overflow-hidden ${
              mobileView === "preview" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Step Navigation Bar */}
            <div className="flex border-b border-stone-200 bg-stone-100/60 px-4 text-xs font-semibold overflow-x-auto shrink-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-3.5 border-b-2 font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap btn-tactile ${
                      isActive
                        ? "border-green-700 text-green-800 bg-white font-bold shadow-2xs"
                        : "border-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                    }`}
                  >
                    <Icon size={13} className={isActive ? "text-green-700" : "text-stone-400"} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {loading ? (
                <div role="status" aria-label="Loading report draft..." className="space-y-6">
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5"><Skeleton count={2} /></div>
                  <div className="flex flex-wrap gap-2"><Skeleton width={150} height={30} /><Skeleton width={150} height={30} /></div>
                  {[0, 1, 2, 3, 4].map(i => <div key={i} aria-hidden="true" className="space-y-1.5"><Skeleton width="35%" height={12} /><Skeleton height={40} /></div>)}
                </div>
              ) : !draftData ? (
                <div className="py-16 text-center text-stone-500 text-sm">
                  Failed to load memorandum draft data. Please try again.
                </div>
              ) : (
                <>
                  {activeTab === "transmittal" && (
                    <TransmittalTab
                      transmittal={draftData.transmittal}
                      onChange={handleTransmittalChange}
                      onRecipientPreset={setRecipientPreset}
                    />
                  )}

                  {activeTab === "narrative" && (
                    <NarrativeTab
                      draftData={draftData}
                      onSummaryChange={(value) => setDraftData({ ...draftData, executive_summary: value })}
                      onFindingsChange={(value) => setDraftData({ ...draftData, biosecurity_findings: value })}
                    />
                  )}

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

                  {activeTab === "signatories" && (
                    <SignatoriesTab
                      signatories={draftData.signatories}
                      onChange={handleSignatoryChange}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Pane: Live A4 Memorandum Sheet Preview */}
          <div
            className={`lg:col-span-7 min-w-0 bg-stone-100/70 flex flex-col overflow-hidden ${
              mobileView === "edit" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Preview Status Ribbon with Zoom Controls */}
            <div className="px-4 py-2 border-b border-stone-200 bg-stone-100/90 flex items-center justify-between text-xs text-stone-600 shrink-0">
              <span className="font-semibold flex items-center gap-1.5 text-stone-700">
                <Eye size={13} className="text-green-700" /> Live Memorandum Sheet
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-stone-200 rounded-md p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(70, z - 10))}
                    disabled={zoom <= 70}
                    title="Zoom Out"
                    aria-label="Zoom Out"
                    className="btn-tactile p-1 text-stone-600 hover:text-stone-900 disabled:opacity-40"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="px-1.5 text-[10px] font-mono font-bold text-stone-700 min-w-[34px] text-center">
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(120, z + 10))}
                    disabled={zoom >= 120}
                    title="Zoom In"
                    aria-label="Zoom In"
                    className="btn-tactile p-1 text-stone-600 hover:text-stone-900 disabled:opacity-40"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
                <span className="text-[11px] font-mono text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200 hidden sm:inline">
                  Synced Real-Time
                </span>
              </div>
            </div>

            {/* Scrollable Document Simulation */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 flex justify-center items-start">
              {loading ? (
                <div role="status" aria-label="Loading document preview..." style={{ transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined, transformOrigin: 'top center' }} className="w-full max-w-[590px] bg-white shadow-xl border border-stone-300 rounded-sm p-6 sm:p-8 space-y-5 text-xs leading-relaxed shrink-0">
                  <Skeleton width="70%" height={24} /><Skeleton width="55%" />
                  <div className="border-y border-stone-300 py-4"><Skeleton count={5} /></div>
                  <Skeleton count={8} /><Skeleton height={120} /><Skeleton count={5} />
                </div>
              ) : (
                <MemorandumPreview
                  draftData={draftData}
                  report={report}
                  startDate={startDate}
                  endDate={endDate}
                  zoom={zoom}
                />
              )}
            </div>
          </div>
        </div>

        {/* Studio Action Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchDraft}
            disabled={loading || generating}
            className="btn-tactile text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={13} /> Reset to System Defaults
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="btn-tactile flex-1 sm:flex-initial px-4 py-2 border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-xs font-medium rounded-lg shadow-2xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || generating || !draftData}
              onClick={handleExportFormalPdf}
              className="btn-tactile flex-1 sm:flex-initial px-5 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Compiling PDF...
                </>
              ) : (
                <>
                  <Download size={14} />
                  Export Official LGU PDF
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
