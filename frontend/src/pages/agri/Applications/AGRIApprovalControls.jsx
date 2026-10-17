import { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';

/**
 * Agri Approval Controls
 * Friendly-first design with clear natural language and flat UI.
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

const ApprovalControls = ({ onApprove, onReject, isAllDocsViewed = true, unviewedCount = 0 }) => {
    const { register, handleSubmit, setValue, formState: { errors } } = useForm();
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

    const handleReject = async (data) => {
        setActiveAction('reject');
        try {
            await onReject(data);
        } catch (error) {
            console.error("Reject error", error);
        } finally {
            setActiveAction(null);
        }
    };

    const handleApprove = async (data) => {
        setActiveAction('approve');
        try {
            await onApprove(data);
        } catch (error) {
            console.error("Approve error", error);
        } finally {
            setActiveAction(null);
        }
    };

    return (
        <div className="bg-white border border-stone-200 p-6 md:p-10 rounded-xl shadow-xs space-y-8">
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Step 2</p>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3">
                    <MessageSquare size={20} className="text-green-700" />
                    Officer Notes
                </h2>
                <p className="text-sm text-stone-600 font-medium">Please provide a reason if you are returning this request, or any internal notes for approval.</p>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">
                        Quick Feedback Templates
                    </label>
                    <select
                        onChange={handleFeedbackSelect}
                        disabled={isProcessing}
                        className="w-full h-11 px-4 bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-green-700/20 focus:border-green-700 outline-none text-sm font-medium text-stone-800"
                    >
                        {COMMON_FEEDBACK_OPTIONS.map((opt, i) => (
                            <option key={i} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">
                        Detailed Notes / Remarks
                    </label>
                    <textarea
                        {...register('remarks', { required: "Please enter some notes before taking action." })}
                        disabled={isProcessing}
                        className="w-full min-h-[120px] p-4 bg-white border border-stone-200 rounded-lg focus:ring-1 focus:ring-green-700/20 focus:border-green-700 outline-none transition-colors text-sm font-medium text-stone-800 placeholder:text-stone-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="Write your notes here..."
                    />
                    {errors.remarks && <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.remarks.message}</p>}
                </div>
            </div>

            {!isAllDocsViewed && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2 rounded-lg">
                    <span className="text-base">🔒</span>
                    <span>Review Checklist: You must click and view all attached documents above before approving. ({unviewedCount} unreviewed document remaining)</span>
                </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSubmit(handleReject)}
                    className="w-full sm:w-auto border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {activeAction === 'reject' ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <XCircle size={16} strokeWidth={2.5} />
                    )}
                    Send Back for Correction
                </button>

                <button
                    type="button"
                    disabled={isProcessing || !isAllDocsViewed}
                    onClick={handleSubmit(handleApprove)}
                    title={!isAllDocsViewed ? "Please view all attached documents above first" : undefined}
                    className="w-full sm:w-auto bg-green-700 hover:bg-green-600 text-white px-8 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                    {activeAction === 'approve' ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <CheckCircle size={16} strokeWidth={2.5} />
                    )}
                    Approve Request
                </button>
            </div>
        </div>
    );
};

export default ApprovalControls;