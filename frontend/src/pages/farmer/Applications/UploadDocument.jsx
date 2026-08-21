import { UploadCloud, CheckCircle2, Camera } from "lucide-react";

const UploadDocument = ({ register, errors, watch, prevStep, nextStep, origins }) => {

    const commonDocs = [
        { 
            id: 'traders_pass', 
            label: "Trader's Pass", 
            desc: "LGU permit to buy/sell livestock." 
        },
        { 
            id: 'handlers_license', 
            label: "Handler's License", 
            desc: "Bureau of Animal Industry (BAI) license." 
        },
        { 
            id: 'transport_carrier_reg', 
            label: "Vehicle Registration (OR/CR)", 
            desc: "Official Receipt & Certificate of Registration." 
        },
    ];

    const originDocs = [
        { 
            id: 'cis', 
            label: "Certificate of Inspection (CIS)", 
            desc: "Barangay-issued swine health document." 
        },
        { 
            id: 'endorsement_cert', 
            label: "Barangay Endorsement", 
            desc: "Barangay clearance to move livestock." 
        }
    ];

    return (
        <div className="space-y-8">
            <div className="border-b border-stone-200 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Step 2</p>
                <h2 className="text-lg font-bold text-stone-800 uppercase tracking-tight">Attach Documents</h2>
                <p className="text-xs text-stone-500 mt-1">Take a clear photo of your documents with your phone camera or select files to upload.</p>
            </div>

            {/* Common Docs */}
            <div className="space-y-3">
                <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Seller & Vehicle Documents</h3>
                <div className="grid grid-cols-2 gap-3">
                    {commonDocs.map((doc) => (
                        <FileUpload 
                            key={doc.id} 
                            id={doc.id} 
                            label={doc.label} 
                            desc={doc.desc} 
                            register={register} 
                            errors={errors} 
                            watch={watch} 
                        />
                    ))}
                </div>
            </div>

            {/* Origin Docs */}
            <div className="space-y-4 pt-4 border-t border-stone-100 pb-20 sm:pb-0">
                <div>
                    <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Barangay Certificates</h3>
                    <p className="text-xs text-stone-400 mt-0.5">Please provide certificates for each starting location.</p>
                </div>
                {origins.map((origin, index) => (
                    <div key={origin.id} className="p-4 bg-stone-50 border border-stone-200 space-y-3">
                        <p className="text-[10px] font-black text-stone-700 uppercase tracking-wider">Starting Location #{index + 1} Documents</p>
                        <div className="grid grid-cols-2 gap-3">
                            {originDocs.map(doc => {
                                const fieldName = `origin_${origin.id}_${doc.id}`;
                                return (
                                    <FileUpload 
                                        key={fieldName} 
                                        id={fieldName} 
                                        label={doc.label} 
                                        desc={doc.desc} 
                                        register={register} 
                                        errors={errors} 
                                        watch={watch} 
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Navigation Buttons */}
            <div className="hidden sm:flex justify-between pt-6 border-t border-stone-200 gap-4 mt-8">
                <button 
                    type="button" 
                    className="border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 px-8 py-3.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors duration-100 ease-out" 
                    onClick={prevStep}
                >
                    Back
                </button>
                <button 
                    type="button" 
                    className="bg-green-700 hover:bg-green-600 text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors duration-100 ease-out" 
                    onClick={nextStep}
                >
                    Next: Review & Send
                </button>
            </div>

            {/* Sticky Mobile Navigation Bar */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 flex items-center justify-between z-50">
                <button
                    type="button"
                    onClick={prevStep}
                    className="border border-stone-200 bg-white active:bg-stone-100 text-stone-700 text-[10px] font-black uppercase tracking-wider px-4 py-3 rounded-none"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={nextStep}
                    className="bg-green-700 active:bg-green-800 hover:bg-green-600 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-none transition-colors"
                >
                    Review Request →
                </button>
            </div>
        </div>
    );
};

const FileUpload = ({ id, label, desc, register, errors, watch }) => {
    const fileVal = watch(id);
    
    const isExisting = fileVal && fileVal.isExisting;
    const isNewUpload = fileVal && (
        (typeof FileList !== "undefined" && fileVal instanceof FileList && fileVal.length > 0) ||
        (Array.isArray(fileVal) && fileVal.length > 0)
    );
    
    const file = isNewUpload ? fileVal[0] : null;
    const fileName = isNewUpload ? file.name : (isExisting ? fileVal.name : null);
    const fileSize = isNewUpload ? (file.size / (1024 * 1024)).toFixed(2) + " MB" : (isExisting ? "Previously Uploaded" : null);

    const hasAnyFile = isExisting || isNewUpload;

    return (
        <div className="relative">
            <label className={`flex flex-col items-center justify-center p-3 sm:p-5 border-2 border-dashed transition-all cursor-pointer rounded-none min-h-[120px] sm:min-h-[150px]
                ${hasAnyFile 
                    ? "border-green-700 bg-green-50/50 hover:bg-green-50" 
                    : errors[id] 
                        ? "border-red-600 bg-red-50" 
                        : "border-stone-200 bg-white hover:border-green-700 hover:bg-stone-50"}`}
            >
                <input 
                    type="file" 
                    className="hidden" 
                    accept=".jpg, .jpeg, .png" 
                    {...register(id, { 
                        validate: {
                            required: (val) => {
                                if (val && (val.isExisting || (val.length && val.length > 0))) {
                                    return true;
                                }
                                return `${label} is required`;
                            },
                            lessThan10MB: (val) => {
                                if (val && val.isExisting) return true;
                                if (!val?.[0]) return true;
                                const isUnderLimit = val[0].size <= 10 * 1024 * 1024;
                                return isUnderLimit || "This file is too big. Please use a file smaller than 10MB.";
                            },
                            acceptedFormats: (val) => {
                                if (val && val.isExisting) return true;
                                if (!val?.[0]) return true;
                                const filename = val[0].name.toLowerCase();
                                const allowedExtensions = ['.jpg', '.jpeg', '.png'];
                                const isValid = allowedExtensions.some(ext => filename.endsWith(ext));
                                return isValid || "Only photo uploads (JPG or PNG) are allowed. Please take a photo of your document.";
                            }
                        }
                    })} 
                />
                
                {hasAnyFile ? (
                    <div className="flex flex-col items-center text-center">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-green-700 flex items-center justify-center text-white mb-1.5">
                            <CheckCircle2 size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-700">
                            {isExisting && !isNewUpload ? "Saved" : "Selected"}
                        </span>
                        <p className="text-[10px] font-bold text-stone-800 mt-1 max-w-[120px] sm:max-w-[180px] truncate leading-tight">{fileName}</p>
                        <span className="text-[8px] text-green-700 font-bold uppercase tracking-wider mt-2 bg-white border border-green-200 px-2 py-0.5">
                            Change
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center mb-1.5 ${errors[id] ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-600"}`}>
                            {id.includes('carrier') || id.includes('license') ? <UploadCloud size={16} /> : <Camera size={16} />}
                        </div>
                        <span className={`text-[10px] sm:text-xs font-black uppercase tracking-tight text-center leading-tight ${errors[id] ? "text-red-700" : "text-stone-800"}`}>
                            {label}
                        </span>
                        <span className="text-[8px] text-stone-600 font-black uppercase tracking-widest mt-2 bg-stone-100 px-2 py-1 border border-stone-200 hidden sm:inline-block">
                            Take Photo
                        </span>
                    </div>
                )}
            </label>
            {errors[id] && (
                <p className="text-red-600 text-[9px] mt-1 font-bold uppercase tracking-wider text-center">
                    {errors[id].message}
                </p>
            )}
        </div>
    );
};

export default UploadDocument;