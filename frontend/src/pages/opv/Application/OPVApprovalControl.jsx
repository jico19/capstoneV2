import { useState } from 'react';
import { CheckCircle2, CheckCircle, XCircle, MessageSquare, UploadCloud, FileCheck2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

/**
 * OPV Approval & Validation Controls
 * Friendly-first design with natural language and industrial flat UI.
 * Validation Logic: Documents and AIC Verification are required for Approval. Remarks are required for all actions.
 */
const COMMON_FEEDBACK_OPTIONS = [
    { value: "", label: "Select common feedback template..." },
    { value: "All submitted documents are valid and verified.", label: "All documents valid & verified" },
    { value: "One or more uploaded documents are expired.", label: "Expired documents" },
    { value: "Livestock Handler's License details do not match the applicant.", label: "Handler's License mismatch" },
    { value: "Transport carrier accreditation or plate number details are invalid.", label: "Carrier Accreditation/Plate invalid" },
    { value: "Certificate of Inspection and Stewardship (CIS) is missing or illegible.", label: "CIS missing/illegible" },
    { value: "Barangay Endorsement Certificate is missing or illegible.", label: "Endorsement Certificate missing/illegible" },
    { value: "Uploaded documents are incomplete, blurry, or low resolution.", label: "Incomplete/Blurry documents" },
    { value: "custom", label: "Other / Custom Feedback (Specify below)" }
];

const OPVApprovalControls = ({ onApprove, onReject, onResubmit, aicNumber, onInspectAic }) => {
    const { register, trigger, getValues, setError, clearErrors, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            remarks: '',
            aic_verified: false,
        }
    });
    const [activeAction, setActiveAction] = useState(null);
    const isProcessing = activeAction !== null;

    const handleFeedbackSelect = (e) => {
        const selectedValue = e.target.value;
        if (selectedValue === "custom") {
            setValue("remarks", "");
        } else {
            setValue("remarks", selectedValue);
        }
    };

    const documents = [
        { id: 'veterinary_health_certificate', label: "Health Certificate", desc: "Official Vet Clearance" },
        { id: 'transportation_pass', label: "Transportation Pass", desc: "LGU Issued Permit" },
    ];

    // Watch for file changes to update UI states manually
    const watchedFiles = watch();

    const hasFile = (fieldName) => {
        const fileList = watchedFiles[fieldName];
        return fileList && fileList.length > 0;
    };

    const handleRejectClick = async () => {
        if (isProcessing) return;
        // Only trigger validation for remarks
        const isRemarksValid = await trigger('remarks');
        if (isRemarksValid) {
            setActiveAction('reject');
            try {
                await onReject(getValues());
            } catch (error) {
                console.error("Reject error", error);
            } finally {
                setActiveAction(null);
            }
        }
    };

    const handleResubmitClick = async () => {
        if (isProcessing) return;
        // Only trigger validation for remarks
        const isRemarksValid = await trigger('remarks');
        if (isRemarksValid) {
            setActiveAction('resubmit');
            try {
                await onResubmit(getValues());
            } catch (error) {
                console.error("Resubmit error", error);
            } finally {
                setActiveAction(null);
            }
        }
    };

    const handleApproveClick = async () => {
        if (isProcessing) return;
        // 1. Validate Remarks
        const isRemarksValid = await trigger('remarks');

        // 2. Validate AIC Verification
        const isAicVerified = getValues('aic_verified');
        let isAicValid = true;
        if (!isAicVerified) {
            setError('aic_verified', {
                type: 'manual',
                message: 'You must inspect and verify the Animal Inspection Certificate (AIC) before approving.'
            });
            isAicValid = false;
        } else {
            clearErrors('aic_verified');
        }

        // 3. Validate Documents (Only required for approval)
        let isDocsValid = true;
        documents.forEach(doc => {
            const files = getValues(doc.id);
            if (!files || files.length === 0) {
                setError(doc.id, { type: 'manual', message: `${doc.label} is required for approval.` });
                isDocsValid = false;
            }
        });

        if (isRemarksValid && isAicValid && isDocsValid) {
            setActiveAction('approve');
            try {
                await onApprove(getValues());
            } catch (error) {
                console.error("Approve error", error);
            } finally {
                setActiveAction(null);
            }
        }
    };

    return (
        <div className="bg-white border border-gray-100 p-6 md:p-10 rounded-none space-y-10">
            {/* 1. Remarks Section */}
            <div className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <MessageSquare size={24} className="text-green-600" />
                        Verification Notes
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Add any important details regarding this health validation.</p>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Quick Feedback Templates
                        </label>
                        <select
                            onChange={handleFeedbackSelect}
                            disabled={isProcessing}
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-none focus:ring-0 focus:border-green-600 outline-none text-sm font-medium text-gray-700"
                        >
                            {COMMON_FEEDBACK_OPTIONS.map((opt, i) => (
                                <option key={i} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            Detailed Notes / Remarks
                        </label>
                        <textarea
                            {...register('remarks', { required: "Please enter notes before taking action." })}
                            disabled={isProcessing}
                            className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-none focus:ring-0 focus:border-green-600 outline-none transition-colors text-sm font-medium text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Write your notes here..."
                        />
                        {errors.remarks && <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.remarks.message}</p>}
                    </div>
                </div>
            </div>

            {/* 2. Municipal AIC Verification */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <FileCheck2 size={24} className="text-green-600" />
                        Municipal AIC Verification
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">
                        Confirm that the Animal Inspection Certificate issued by MAO is authentic and verified.
                    </p>
                </div>

                <div className={`p-5 border-2 transition-colors ${
                    errors.aic_verified 
                        ? 'border-red-600 bg-red-50/70' 
                        : watchedFiles.aic_verified 
                            ? 'border-emerald-600 bg-emerald-50/40' 
                            : 'border-stone-200 bg-stone-50/60'
                }`}>
                    <label className="flex items-start gap-4 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            disabled={isProcessing}
                            {...register('aic_verified')}
                            className="mt-0.5 h-5 w-5 rounded-none border-stone-400 text-emerald-700 focus:ring-0 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-stone-900">
                                    I certify and verify Animal Inspection Certificate (AIC)
                                </span>
                                {aicNumber && (
                                    <span className="font-mono text-xs font-bold text-emerald-950 bg-emerald-100 px-2 py-0.5 border border-emerald-300">
                                        No. {aicNumber}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed font-normal">
                                I confirm having reviewed the Municipal Agriculture Office issuance, origin barangay(s), and animal count for this transport request.
                            </p>
                        </div>
                    </label>

                    {onInspectAic && (
                        <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
                            <span className="text-stone-500 text-[11px] font-medium">Need to inspect before verifying?</span>
                            <button
                                type="button"
                                onClick={onInspectAic}
                                className="text-[10px] font-black uppercase tracking-wider text-emerald-800 hover:text-emerald-950 underline underline-offset-2 transition-colors"
                            >
                                Open AIC Preview
                            </button>
                        </div>
                    )}

                    {errors.aic_verified && (
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-2">
                            {errors.aic_verified.message}
                        </p>
                    )}
                </div>
            </div>

            {/* 3. Document Uploads */}
            <div className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <UploadCloud size={24} className="text-green-600" />
                        Official Documents
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">These are only needed if you are approving the request.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.map((doc) => (
                        <div key={doc.id} className="relative">
                            <label
                                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-none transition-colors
                                ${hasFile(doc.id) ? "border-green-600 bg-green-50" : errors[doc.id] ? "border-red-600 bg-red-50" : "border-gray-300 hover:border-green-600 hover:bg-gray-50"}
                                ${isProcessing ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
                            >
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf, image/*"
                                    disabled={isProcessing}
                                    {...register(doc.id)}
                                />

                                {hasFile(doc.id) ? (
                                    <>
                                        <CheckCircle2 className="text-green-600 mb-2" size={28} />
                                        <span className="text-xs font-black uppercase tracking-widest text-green-700">Uploaded</span>
                                        <span className="text-[10px] text-green-600/70 truncate w-full text-center px-2 mt-1">{watchedFiles[doc.id][0].name}</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className={`${errors[doc.id] ? "text-red-600" : "text-gray-400"} mb-2`} size={28} />
                                        <span className={`text-xs font-black uppercase tracking-widest ${errors[doc.id] ? "text-red-700" : "text-gray-900"}`}>{doc.label}</span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1">{doc.desc}</span>
                                    </>
                                )}
                            </label>
                            {errors[doc.id] && (
                                <p className="text-red-600 text-[10px] mt-2 font-bold uppercase tracking-wider text-center">{errors[doc.id].message}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-gray-100">
                <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleRejectClick}
                    className="w-full sm:w-auto border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {activeAction === 'reject' ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <XCircle size={18} strokeWidth={3} />
                    )}
                    Reject Request
                </button>

                <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleResubmitClick}
                    className="w-full sm:w-auto border border-amber-100 bg-amber-50 hover:bg-amber-100 text-amber-700 px-6 py-4 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {activeAction === 'resubmit' ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <MessageSquare size={18} strokeWidth={3} />
                    )}
                    Return for Correction
                </button>

                <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleApproveClick}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {activeAction === 'approve' ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <CheckCircle size={18} strokeWidth={3} />
                    )}
                    Confirm Health Validation
                </button>
            </div>
        </div>
    );
};

export default OPVApprovalControls;