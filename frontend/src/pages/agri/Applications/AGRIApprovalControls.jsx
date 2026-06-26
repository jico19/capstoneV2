import { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';

/**
 * Agri Approval Controls
 * Friendly-first design with clear natural language and flat UI.
 */
const ApprovalControls = ({ onApprove, onReject }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [activeAction, setActiveAction] = useState(null);
    const isProcessing = activeAction !== null;

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
        <div className="bg-white border border-gray-100 p-6 md:p-10 rounded-none space-y-8">
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 2</p>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <MessageSquare size={24} className="text-green-600" />
                    Officer Notes
                </h2>
                <p className="text-sm text-gray-500 font-medium">Please provide a reason if you are returning this request, or any internal notes for approval.</p>
            </div>

            <div className="space-y-2">
                <textarea
                    {...register('remarks', { required: "Please enter some notes before taking action." })}
                    disabled={isProcessing}
                    className="w-full min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-none focus:ring-0 focus:border-green-600 outline-none transition-colors text-sm font-medium text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Write your notes here..."
                />
                {errors.remarks && <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.remarks.message}</p>}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-4 border-t border-gray-50">
                <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSubmit(handleReject)}
                    className="w-full sm:w-auto border border-red-100 bg-red-50 hover:bg-red-100 text-red-700 px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {activeAction === 'reject' ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <XCircle size={18} strokeWidth={3} />
                    )}
                    Send Back for Correction
                </button>

                <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleSubmit(handleApprove)}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {activeAction === 'approve' ? (
                        <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                        <CheckCircle size={18} strokeWidth={3} />
                    )}
                    Approve Request
                </button>
            </div>
        </div>
    );
};

export default ApprovalControls;