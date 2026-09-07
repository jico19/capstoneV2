import React, { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { downloadBlob } from "../../../lib/utils";
import { toast } from "sonner";
import {
  X,
  FileText,
  Sparkles,
  RotateCcw,
  Download,
  Loader2,
  Building,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Scale,
  Calendar,
  Send,
} from "lucide-react";

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

  const fetchDraft = async () => {
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
  };

  useEffect(() => {
    if (isOpen) {
      fetchDraft();
      setActiveTab("transmittal");
    }
  }, [isOpen, report?.reportType, startDate, endDate]);

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
    } catch (err) {
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
                        onClick={() => setRecipientPreset("mayor")}
                        className="text-[11px] font-bold px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors flex items-center gap-1.5"
                      >
                        <Building size={12} /> Municipal Mayor (Hon. Marcelo P. Gayeta)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipientPreset("opv")}
                        className="text-[11px] font-bold px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors flex items-center gap-1.5"
                      >
                        <Building size={12} /> Provincial Veterinarian (OPV Quezon)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipientPreset("sb")}
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
                        value={draftData.transmittal.memo_for}
                        onChange={(e) => handleTransmittalChange("memo_for", e.target.value)}
                        className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                        THROUGH:
                      </label>
                      <input
                        type="text"
                        value={draftData.transmittal.memo_through}
                        onChange={(e) => handleTransmittalChange("memo_through", e.target.value)}
                        className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                        FROM:
                      </label>
                      <input
                        type="text"
                        value={draftData.transmittal.memo_from}
                        onChange={(e) => handleTransmittalChange("memo_from", e.target.value)}
                        className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                        DATE:
                      </label>
                      <input
                        type="text"
                        value={draftData.transmittal.date}
                        onChange={(e) => handleTransmittalChange("date", e.target.value)}
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
                      value={draftData.transmittal.subject}
                      onChange={(e) => handleTransmittalChange("subject", e.target.value)}
                      className="w-full border border-stone-300 p-2.5 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                      LEGAL BASES & REGULATORY REFERENCES:
                    </label>
                    <textarea
                      rows={3}
                      value={draftData.transmittal.legal_bases}
                      onChange={(e) => handleTransmittalChange("legal_bases", e.target.value)}
                      className="w-full border border-stone-300 p-2.5 text-xs font-medium text-stone-800 bg-white focus:outline-none focus:border-green-700"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Executive Narrative */}
              {activeTab === "narrative" && (
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
                      onChange={(e) => setDraftData({ ...draftData, executive_summary: e.target.value })}
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
                      onChange={(e) => setDraftData({ ...draftData, biosecurity_findings: e.target.value })}
                      className="w-full border border-stone-300 p-3 text-xs leading-relaxed font-medium text-stone-900 bg-white focus:outline-none focus:border-green-700"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: Observations & Recommendations */}
              {activeTab === "observations" && (
                <div className="space-y-6">
                  {/* Observations Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <label className="text-[11px] font-black uppercase tracking-wider text-stone-800">
                        Operational Observations & Highlights
                      </label>
                      <button
                        type="button"
                        onClick={handleAddObservation}
                        className="text-[10px] font-bold text-green-700 hover:text-green-900 inline-flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Observation
                      </button>
                    </div>

                    <div className="space-y-2">
                      {draftData.operational_observations?.map((obs, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-400">•</span>
                          <input
                            type="text"
                            value={obs}
                            onChange={(e) => handleObservationChange(idx, e.target.value)}
                            className="flex-1 border border-stone-300 p-2 text-xs text-stone-800 bg-white focus:outline-none focus:border-green-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteObservation(idx)}
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
                        onClick={handleAddRecommendation}
                        className="text-[10px] font-bold text-green-700 hover:text-green-900 inline-flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Recommendation
                      </button>
                    </div>

                    <div className="space-y-2">
                      {draftData.recommendations?.map((rec, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-500 w-5">{idx + 1}.</span>
                          <input
                            type="text"
                            value={rec}
                            onChange={(e) => handleRecommendationChange(idx, e.target.value)}
                            className="flex-1 border border-stone-300 p-2 text-xs text-stone-800 bg-white focus:outline-none focus:border-green-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteRecommendation(idx)}
                            className="text-stone-400 hover:text-red-600 p-1.5 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Signatories */}
              {activeTab === "signatories" && (
                <div className="space-y-6">
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Official 3-tier government attestation chain. Ensure the officers and designated titles match current municipal administration records.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Prepared By */}
                    <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-green-800">
                        1. Prepared By (Drafting Officer)
                      </p>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-stone-400">Full Name</label>
                        <input
                          type="text"
                          value={draftData.signatories.prepared_by_name}
                          onChange={(e) => handleSignatoryChange("prepared_by_name", e.target.value)}
                          className="w-full border border-stone-300 p-2 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-stone-400">Designation / Title</label>
                        <input
                          type="text"
                          value={draftData.signatories.prepared_by_title}
                          onChange={(e) => handleSignatoryChange("prepared_by_title", e.target.value)}
                          className="w-full border border-stone-300 p-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-green-700"
                        />
                      </div>
                    </div>

                    {/* Verified By */}
                    <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-700">
                        2. Certified Correct By (Veterinarian)
                      </p>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-stone-400">Full Name</label>
                        <input
                          type="text"
                          value={draftData.signatories.verified_by_name}
                          onChange={(e) => handleSignatoryChange("verified_by_name", e.target.value)}
                          className="w-full border border-stone-300 p-2 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-stone-400">Designation / Title</label>
                        <input
                          type="text"
                          value={draftData.signatories.verified_by_title}
                          onChange={(e) => handleSignatoryChange("verified_by_title", e.target.value)}
                          className="w-full border border-stone-300 p-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-green-700"
                        />
                      </div>
                    </div>

                    {/* Approved By */}
                    <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-700">
                        3. Approved By (Municipal Agriculturist)
                      </p>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-stone-400">Full Name</label>
                        <input
                          type="text"
                          value={draftData.signatories.approved_by_name}
                          onChange={(e) => handleSignatoryChange("approved_by_name", e.target.value)}
                          className="w-full border border-stone-300 p-2 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-stone-400">Designation / Title</label>
                        <input
                          type="text"
                          value={draftData.signatories.approved_by_title}
                          onChange={(e) => handleSignatoryChange("approved_by_title", e.target.value)}
                          className="w-full border border-stone-300 p-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-green-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
