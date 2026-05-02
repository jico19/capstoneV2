import { CheckCircle2, CheckCircle, XCircle, MessageSquare, UploadCloud} from 'lucide-react';
import { useForm } from 'react-hook-form';

/**
 * OPV Approval & Validation Controls
 * Friendly-first design with natural language and industrial flat UI.
 * Validation Logic: Documents are only required for Approval. Remarks are required for both.
 */
const OPVApprovalControls = ({ onApprove, onReject }) => {
    const { register, trigger, getValues, setError, watch, formState: { errors, isSubmitting } } = useForm();

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
        // Only trigger validation for remarks
        const isRemarksValid = await trigger('remarks');
        if (isRemarksValid) {
            onReject(getValues());
        }
    };

    const handleApproveClick = async () => {
        // 1. Validate Remarks
        const isRemarksValid = await trigger('remarks');
        
        // 2. Validate Documents (Only required for approval)
        let isDocsValid = true;
        documents.forEach(doc => {
            const files = getValues(doc.id);
            if (!files || files.length === 0) {
                setError(doc.id, { type: 'manual', message: `${doc.label} is required for approval.` });
                isDocsValid = false;
            }
        });

        if (isRemarksValid && isDocsValid) {
            onApprove(getValues());
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

                <textarea
                    {...register('remarks', { required: "Please enter notes before taking action." })}
                    className="w-full min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-none focus:ring-0 focus:border-green-600 outline-none transition-colors text-sm font-medium text-gray-900 placeholder:text-gray-400"
                    placeholder="Write your notes here..."
                />
                {errors.remarks && <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.remarks.message}</p>}
            </div>

            {/* 2. Document Uploads */}
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
                                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-none cursor-pointer transition-colors
                                ${hasFile(doc.id) ? "border-green-600 bg-green-50" : errors[doc.id] ? "border-red-600 bg-red-50" : "border-gray-300 hover:border-green-600 hover:bg-gray-50"}`}
                            >
                                <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdf, image/*"
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
                    disabled={isSubmitting}
                    onClick={handleRejectClick}
                    className="w-full sm:w-auto border border-red-100 bg-red-50 hover:bg-red-100 text-red-700 px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2"
                >
                    <XCircle size={18} strokeWidth={3} />
                    Send Back for Correction
                </button>

                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleApproveClick}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center justify-center gap-2"
                >
                    <CheckCircle size={18} strokeWidth={3} />
                    Confirm Health Validation
                </button>
            </div>
        </div>
    );
};

export default OPVApprovalControls;