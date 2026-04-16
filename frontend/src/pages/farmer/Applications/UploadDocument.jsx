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
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-2">2. Required Documents</h2>
            <p className="text-sm text-slate-500">Please upload clear photos or PDFs of the following requirements.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
                <button type="button" className="btn btn-ghost" onClick={prevStep}>Back</button>
                <button type="button" className="btn btn-primary px-8" onClick={nextStep}>Review Application</button>
            </div>
        </div>
    );
};

export default UploadDocument;