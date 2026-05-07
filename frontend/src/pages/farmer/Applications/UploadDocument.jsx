import { UploadCloud, CheckCircle2 } from "lucide-react";

const UploadDocument = ({ register, errors, watch, prevStep, nextStep, origins }) => {

    const hasFile = (fieldName) => {
        const fileList = watch(fieldName);
        return fileList && fileList.length > 0;
    };

    const commonDocs = [
        { id: 'traders_pass', label: "Trader's Pass", desc: "LGU Issued Pass" },
        { id: 'handlers_license', label: "Handler's License", desc: "Valid certification" },
        { id: 'transport_carrier_reg', label: "Carrier Registration", desc: "Vehicle OR/CR" },
    ];

    const originDocs = [
        { id: 'cis', label: "CIS", desc: "Barangay-issued" },
        { id: 'endorsement_cert', label: "Endorsement", desc: "Barangay Clearance" }
    ];

    return (
        <div className="space-y-12">
            <div className="border-b border-gray-100 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 2</p>
                <h2 className="text-xl font-black text-gray-900 uppercase">Required Documents</h2>
            </div>

            {/* Common Docs */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Shared Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {commonDocs.map((doc) => (
                        <FileUpload key={doc.id} id={doc.id} label={doc.label} desc={doc.desc} register={register} errors={errors} watch={watch} hasFile={hasFile} />
                    ))}
                </div>
            </div>

            {/* Origin Docs */}
            <div className="space-y-6">
                <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Origin-Specific Documents</h3>
                {origins.map((origin, index) => (
                    <div key={origin.id} className="p-4 bg-stone-50 border border-stone-100 space-y-4">
                        <p className="text-[10px] font-black text-stone-700 uppercase">Barangay Origin #{index + 1}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {originDocs.map(doc => {
                                const fieldName = `origin_${origin.id}_${doc.id}`;
                                return (
                                    <FileUpload key={fieldName} id={fieldName} label={doc.label} desc={doc.desc} register={register} errors={errors} watch={watch} hasFile={hasFile} />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between pt-6 border-t border-gray-100 gap-4 mt-8">
                <button type="button" className="w-full sm:w-auto border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors" onClick={prevStep}>Back</button>
                <button type="button" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors" onClick={nextStep}>Review Application</button>
            </div>
        </div>
    );
};

const FileUpload = ({ id, label, desc, register, errors, watch, hasFile }) => (
    <div className="relative">
        <label className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-none cursor-pointer transition-colors ${hasFile(id) ? "border-green-600 bg-green-50" : errors[id] ? "border-red-600 bg-red-50" : "border-gray-300 hover:border-green-600 hover:bg-gray-50"}`}>
            <input type="file" className="hidden" accept=".pdf, image/*" {...register(id, { required: `${label} is required` })} />
            {hasFile(id) ? (
                <>
                    <CheckCircle2 className="text-green-600 mb-2" size={24} />
                    <span className="text-xs font-black uppercase tracking-widest text-green-700">Uploaded</span>
                    <span className="text-[10px] text-green-600/70 truncate w-full text-center px-2 mt-1">{watch(id)[0].name}</span>
                </>
            ) : (
                <>
                    <UploadCloud className={errors[id] ? "text-red-600" : "text-gray-400"} size={24} />
                    <span className={`text-xs font-black uppercase tracking-widest ${errors[id] ? "text-red-700" : "text-gray-900"}`}>{label}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{desc}</span>
                </>
            )}
        </label>
        {errors[id] && <p className="text-red-600 text-[10px] mt-2 font-bold uppercase tracking-wider text-center">{errors[id].message}</p>}
    </div>
);

export default UploadDocument;