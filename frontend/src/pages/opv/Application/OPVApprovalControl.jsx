import { CheckCircle2, CheckCircle, XCircle, MessageSquare, UploadCloud} from 'lucide-react';
import { useForm } from 'react-hook-form';


const OPVApprovalControls = ({ onApprove, onReject }) => {
    const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();


    const documents = [
        { id: 'veterinary_health_certificate', label: "Veterinary Health Certificate", desc: "LGU Issued Pass" },
        { id: 'transportation_pass', label: "Transportation pass", desc: "Valid certification" },
    ];
    // Helper to check if a file is selected
    const hasFile = (fieldName) => {
        const fileList = watch(fieldName);
        return fileList && fileList.length > 0;
    };


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

            {documents.map((doc) => (
                <div key={doc.id} className="relative">
                    <label
                        className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all
                            ${hasFile(doc.id) ? "border-green-500 bg-green-50" : errors[doc.id] ? "border-red-400 bg-red-50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"}`}
                    >
                        <input
                            type="file"
                            className="hidden"
                            accept=".pdf, image/*"
                            {...register(doc.id, { 
                                required: `${doc.label} is required`,
                                validate: (fileList) => {
                                    if (!fileList || fileList.length === 0) return true;
                                    const file = fileList[0];
                                    const maxSize = 30 * 1024 * 1024; // 30MB
                                    if (file.size > maxSize) {
                                        return "File size cannot exceed 30MB";
                                    }
                                    return true;
                                }
                            })}
                        />

                        {hasFile(doc.id) ? (
                            <>
                                <CheckCircle2 className="text-green-500 mb-2" size={24} />
                                <span className="text-sm font-bold text-green-700">Uploaded</span>
                                <span className="text-xs text-green-600/70 truncate w-full text-center px-2">{watch(doc.id)[0].name}</span>
                            </>
                        ) : (
                            <>
                                <UploadCloud className={`${errors[doc.id] ? "text-red-400" : "text-slate-400"} mb-2`} size={24} />
                                <span className={`text-sm font-bold ${errors[doc.id] ? "text-red-600" : "text-slate-700"}`}>{doc.label}</span>
                                <span className="text-xs text-slate-400">{doc.desc}</span>
                            </>
                        )}
                    </label>
                    {errors[doc.id] && (
                        <p className="text-red-600 text-[10px] mt-1 font-bold uppercase tracking-wider">{errors[doc.id].message}</p>
                    )}
                </div>
            ))}

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

export default OPVApprovalControls;