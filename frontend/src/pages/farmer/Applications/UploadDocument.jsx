import { UploadCloud, CheckCircle2 } from "lucide-react";

const UploadDocument = ({ register, errors, watch, prevStep, nextStep }) => {

    // Helper to check if a file is selected
    const hasFile = (fieldName) => {
        const fileList = watch(fieldName);
        return fileList && fileList.length > 0;
    };

    const documents = [
        { id: 'traders_pass', label: "Trader's Pass", desc: "LGU Issued Pass" },
        { id: 'handlers_license', label: "Handler's License", desc: "Valid certification" },
        { id: 'transport_carrier_reg', label: "Carrier Registration", desc: "Vehicle OR/CR" },
        { id: 'cis', label: "Certificate of Inspection", desc: "Veterinary clearance" },
        { id: 'endorsement_cert', label: "Endorsement Certificate", desc: "Barangay clearance" }
    ];

    return (
        <div className="space-y-8">
            <div className="border-b border-gray-100 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 2</p>
                <h2 className="text-xl font-black text-gray-900 uppercase">Required Documents</h2>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Please upload clear photos or PDFs.</p>
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
                                    <CheckCircle2 className="text-green-600 mb-2" size={24} />
                                    <span className="text-xs font-black uppercase tracking-widest text-green-700">Uploaded</span>
                                    <span className="text-[10px] text-green-600/70 truncate w-full text-center px-2 mt-1">{watch(doc.id)[0].name}</span>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className={`${errors[doc.id] ? "text-red-600" : "text-gray-400"} mb-2`} size={24} />
                                    <span className={`text-xs font-black uppercase tracking-widest ${errors[doc.id] ? "text-red-700" : "text-gray-900"}`}>{doc.label}</span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{doc.desc}</span>
                                </>
                            )}
                        </label>
                        {errors[doc.id] && (
                            <p className="text-red-600 text-[10px] mt-2 font-bold uppercase tracking-wider text-center">{errors[doc.id].message}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between pt-6 border-t border-gray-100 gap-4 mt-8">
                <button 
                    type="button" 
                    className="w-full sm:w-auto border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors" 
                    onClick={prevStep}
                >
                    Back
                </button>
                <button 
                    type="button" 
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors" 
                    onClick={nextStep}
                >
                    Review Application
                </button>
            </div>
        </div>
    );
};

export default UploadDocument;