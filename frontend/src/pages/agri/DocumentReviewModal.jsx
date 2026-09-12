import { useState } from 'react';
import { X, Eye, Check } from 'lucide-react';
import FileViewerModal from '../../components/ui/FileViewerModal';

/**
 * KYC Document Review Modal for MAO Officers
 */
const DocumentReviewModal = ({ farmer, onClose, onApprove, onReject, isSubmitting }) => {
    const [remarks, setRemarks] = useState(farmer.verification_remarks || "");
    const [previewDoc, setPreviewDoc] = useState(null);
    const docs = farmer.farmer_documents || [];


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
        traders_pass: "Trader's Pass (LGU)",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
            <div className="bg-white border-2 border-stone-800 max-w-3xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start border-b border-stone-200 pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">KYC Document Review</span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-stone-100 text-stone-700">
                                {farmer.verification_status || 'UNVERIFIED'}
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight mt-1">
                            {farmer.first_name} {farmer.last_name}
                        </h2>
                        <p className="text-xs text-stone-500 font-mono">@{farmer.username} • {farmer.phone_no} • {farmer.barangay_name || 'No Barangay'}</p>
                    </div>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Document Cards */}
                <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Submitted Standing Documents & OCR Data</p>
                    
                    {['handlers_license', 'transport_carrier_reg', 'traders_pass'].map((dtype) => {
                        const doc = docs.find((d) => d.document_type === dtype);
                        const edit = docEdits[dtype] || {};

                        return (
                            <div key={dtype} className="p-4 border border-stone-200 bg-stone-50 space-y-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-stone-800 text-xs">{docLabels[dtype]}</h4>
                                        {doc ? (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-green-100 text-green-800">
                                                On File
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-red-100 text-red-700">
                                                Missing
                                            </span>
                                        )}
                                        {doc?.ocr_status === 'PROCESSED' && (
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-blue-100 text-blue-800">
                                                OCR Verified
                                            </span>
                                        )}
                                    </div>

                                    {doc?.file ? (
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDoc({
                                                url: doc.file,
                                                title: `${docLabels[dtype]} - ${farmer.first_name} ${farmer.last_name}`,
                                                subtitle: edit.license_number ? `Extracted License: ${edit.license_number}` : undefined
                                            })}
                                            className="px-3 py-1 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Eye size={12} className="text-green-700" /> View Document
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-stone-400 italic font-medium">No file attached</span>
                                    )}

                                </div>

                                {/* Editable Fields: License No & Expiry Date */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200/60">
                                    <div>
                                        <label className="block text-[9px] font-black text-stone-500 uppercase tracking-wider mb-1">
                                            License / Pass / Reg No.
                                        </label>
                                        <input
                                            type="text"
                                            value={edit.license_number || ""}
                                            onChange={(e) => handleEditChange(dtype, "license_number", e.target.value)}
                                            placeholder="License number..."
                                            className="w-full bg-white border border-stone-300 text-stone-800 text-xs px-2.5 py-1.5 focus:outline-none focus:border-stone-800 font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-black text-stone-500 uppercase tracking-wider mb-1">
                                            Expiration Date
                                        </label>
                                        <input
                                            type="date"
                                            value={edit.expiration_date || ""}
                                            onChange={(e) => handleEditChange(dtype, "expiration_date", e.target.value)}
                                            className="w-full bg-white border border-stone-300 text-stone-800 text-xs px-2.5 py-1.5 focus:outline-none focus:border-stone-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Remarks / Rejection Reason */}
                <div className="space-y-2 pt-2 border-t border-stone-200">
                    <label className="block text-[10px] font-black text-stone-600 uppercase tracking-widest">
                        Validation Remarks / Rejection Reason
                    </label>
                    <textarea
                        rows={2}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter feedback or rejection reason for the farmer (sent via SMS/notification)..."
                        className="w-full border border-stone-300 text-xs p-3 rounded-none focus:outline-none focus:border-stone-800 bg-white"
                    />
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-stone-200">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 border border-stone-300 text-stone-700 text-xs font-black uppercase tracking-widest hover:bg-stone-100"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        onClick={() => onReject(remarks)}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                    >
                        <X size={14} /> Reject with Remarks
                    </button>

                    <button
                        type="button"
                        onClick={() => onApprove(remarks, docEdits)}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-green-700 hover:bg-green-600 text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-green-700/20"
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