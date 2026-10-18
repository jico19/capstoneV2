import { useState } from 'react';
import { X, Eye, Check, Lock } from 'lucide-react';
import FileViewerModal from '../../components/ui/FileViewerModal';

/**
 * KYC Document Review Modal for MAO Officers
 */
const DocumentReviewModal = ({ farmer, onClose, onApprove, onReject, isSubmitting }) => {
    const [remarks, setRemarks] = useState(farmer.verification_remarks || "");
    const [previewDoc, setPreviewDoc] = useState(null);
    const [viewedTypes, setViewedTypes] = useState([]);
    const docs = farmer.farmer_documents || [];

    const attachedTypes = ['handlers_license', 'transport_carrier_reg'].filter(dtype => {
        const d = docs.find(doc => doc.document_type === dtype);
        return d && d.file;
    });
    const unviewedCount = attachedTypes.filter(dtype => !viewedTypes.includes(dtype)).length;


    // Local state for editable document details (license_number, expiration_date)
    const [docEdits, setDocEdits] = useState(() => {
        const initial = {};
        docs.forEach((d) => {
            initial[d.document_type] = {
                license_number: d.license_number || "",
                expiration_date: d.expiration_date || "",
            };
        });
        return initial;
    });

    const handleEditChange = (dtype, field, val) => {
        setDocEdits((prev) => ({
            ...prev,
            [dtype]: {
                ...prev[dtype],
                [field]: val,
            },
        }));
    };

    const docLabels = {
        handlers_license: "Handler's License (BAI)",
        transport_carrier_reg: "Transport License / Vehicle OR-CR",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white border border-stone-200 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto modal-enter">
                <div className="flex justify-between items-start border-b border-stone-200/80 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">KYC Document Review</span>
                            <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/60">
                                {farmer.verification_status || 'UNVERIFIED'}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-1">
                            {farmer.first_name} {farmer.last_name}
                        </h2>
                        <p className="text-xs text-stone-500 font-mono">@{farmer.username} • {farmer.phone_no} • {farmer.barangay_name || 'No Barangay'}</p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Document Cards */}
                <div className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">Submitted Standing Documents & OCR Data</p>
                    
                    {['handlers_license', 'transport_carrier_reg'].map((dtype) => {
                        const doc = docs.find((d) => d.document_type === dtype);
                        const edit = docEdits[dtype] || {};

                        return (
                            <div key={dtype} className="p-4 border border-stone-200/80 bg-stone-50/50 rounded-xl space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-stone-800 text-xs">{docLabels[dtype]}</h4>
                                        {doc ? (
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                                On File
                                            </span>
                                        ) : (
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/80">
                                                Missing
                                            </span>
                                        )}
                                        {doc?.ocr_status === 'PROCESSED' && (
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                                                OCR Verified
                                            </span>
                                        )}
                                    </div>

                                    {doc?.file ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!viewedTypes.includes(dtype)) {
                                                    setViewedTypes(prev => [...prev, dtype]);
                                                }
                                                setPreviewDoc({
                                                    url: doc.file,
                                                    title: `${docLabels[dtype]} - ${farmer.first_name} ${farmer.last_name}`,
                                                    subtitle: edit.license_number ? `Extracted License: ${edit.license_number}` : undefined
                                                });
                                            }}
                                            className={`btn-tactile px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border rounded-lg shadow-2xs ${
                                                viewedTypes.includes(dtype) 
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                                    : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                                            }`}
                                        >
                                            <Eye size={12} className="text-emerald-700" /> {viewedTypes.includes(dtype) ? "Viewed ✓" : "View Document"}
                                        </button>
                                    ) : (
                                        <span className="text-xs text-stone-400 italic font-medium">No file attached</span>
                                    )}

                                </div>

                                {/* Editable Fields: License No & Expiry Date */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200/60">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-600 mb-1">
                                            License / Pass / Reg No.
                                        </label>
                                        <input
                                            type="text"
                                            value={edit.license_number || ""}
                                            onChange={(e) => handleEditChange(dtype, "license_number", e.target.value)}
                                            placeholder="License number..."
                                            className="h-9 w-full bg-white border border-stone-200 text-stone-800 text-xs px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 font-mono shadow-2xs transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-stone-600 mb-1">
                                            Expiration Date
                                        </label>
                                        <input
                                            type="date"
                                            value={edit.expiration_date || ""}
                                            onChange={(e) => handleEditChange(dtype, "expiration_date", e.target.value)}
                                            className="h-9 w-full bg-white border border-stone-200 text-stone-800 text-xs px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 shadow-2xs transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Remarks / Rejection Reason */}
                <div className="space-y-2 pt-2 border-t border-stone-200/80">
                    <label className="block text-xs font-semibold text-stone-700">
                        Validation Remarks / Rejection Reason
                    </label>
                    <textarea
                        rows={2}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter feedback or rejection reason for the farmer (sent via SMS/notification)..."
                        className="w-full border border-stone-200 text-xs p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 bg-white shadow-2xs transition-colors"
                    />
                </div>

                {unviewedCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium rounded-xl flex items-center gap-2">
                        <Lock size={15} className="text-amber-700 shrink-0" />
                        <span>Action Required: Please click and view all submitted files above before approving. ({unviewedCount} unreviewed document remaining)</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-stone-200/80">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="btn-tactile px-4 py-2 border border-stone-200 text-stone-700 text-xs font-semibold hover:bg-stone-50 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        onClick={() => onReject(remarks)}
                        disabled={isSubmitting}
                        className="btn-tactile px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        <X size={14} /> Reject with Remarks
                    </button>

                    <button
                        type="button"
                        onClick={() => onApprove(remarks, docEdits)}
                        disabled={isSubmitting || unviewedCount > 0}
                        title={unviewedCount > 0 ? "View all attached documents first" : undefined}
                        className="btn-tactile px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <Check size={14} /> Approve & Save Verification
                    </button>
                </div>

                {/* Built-in Document Viewer Modal */}
                <FileViewerModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc?.url}
                    title={previewDoc?.title}
                    subtitle={previewDoc?.subtitle}
                />
            </div>
        </div>
    );
};

export default DocumentReviewModal;