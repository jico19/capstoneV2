import { CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';



const ApprovalControls = ({ onApprove, onReject }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
                <MessageSquare size={18} className="text-slate-400" />
                <span>Administrative Remarks</span>
            </div>

            {/* The Textarea is now fully controlled by React Hook Form */}
            <textarea
                {...register('remarks', { required: true })}
                className="textarea textarea-bordered w-full h-32 text-slate-800 focus:ring-2 focus:ring-green-600/20 transition-all"
                placeholder="Add internal notes or rejection reasons here..."
            />

            <div className="flex flex-col md:flex-row justify-end gap-4">
                {/* When Reject is clicked, we trigger handleSubmit. 
                It passes the form data { remarks: "..." } to onReject.
                */}
                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit(onReject)}
                    className="btn btn-error btn-outline flex-1 md:flex-none px-10 gap-2"
                >
                    <XCircle size={20} />
                    Reject Application
                </button>

                {/* When Approve is clicked, it passes the form data to onApprove */}
                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSubmit(onApprove)}
                    className="btn btn-success flex-1 md:flex-none px-10 gap-2 text-white"
                >
                    <CheckCircle size={20} />
                    Approve & Forward to OPV
                </button>
            </div>
        </div>
    );
};

export default ApprovalControls;