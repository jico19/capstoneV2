import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import FarmerInfo from "./FarmerInfo";
import UploadDocument from "./UploadDocument";
import ReviewApplication from "./ReviewApplication";
import { Check, ArrowRight, AlertCircle } from "lucide-react";
import { useApplicationDetail, useResubmitApplication } from "/src/hooks/useApplications";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

// Helper to determine if a form value is a valid file upload (FileList or File)
const isFile = (val) => {
    if (!val) return false;
    if (typeof FileList !== 'undefined' && val instanceof FileList) {
        return val.length > 0;
    }
    if (Array.isArray(val)) {
        return val.length > 0 && val[0] instanceof File;
    }
    if (typeof File !== 'undefined' && val instanceof File) {
        return true;
    }
    if (val.length && val[0] instanceof File) {
        return true;
    }
    return false;
};

// Helper to get the actual File object from a form value
const getFileObject = (val) => {
    if (!val) return null;
    if (typeof FileList !== 'undefined' && val instanceof FileList) {
        return val[0];
    }
    if (Array.isArray(val)) {
        return val[0];
    }
    return val;
};

/**
 * Resubmit Application Component
 * Allows farmers to correct and update rejected applications.
 * Reuses the minimalist flow from CreateApplication with pre-filled data and document retention.
 * Follows the FarmPass Design System 2.0 guidelines.
 */
const ResubmitApplication = () => {
    const { id } = useParams();
    const [step, setStep] = useState(1);
    const [origins, setOrigins] = useState([]);
    const navigate = useNavigate();
    
    const { data: application, isLoading, isError } = useApplicationDetail(id);
    const { mutate: resubmit, isPending: isSubmitting } = useResubmitApplication();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        trigger,
        formState: { errors }
    } = useForm();

    // Pre-fill form when data arrives
    useEffect(() => {
        if (application) {
            const mappedOrigins = application.origins.map(o => ({
                id: o.id, // Use actual DB ID
                barangay: o.barangay,
                number_of_pigs: o.number_of_pigs,
                inahin: o.inahin,
                barako: o.barako,
                fattener: o.fattener,
                grower: o.grower,
                bulaw: o.bulaw,
                starter: o.starter
            }));
            setOrigins(mappedOrigins);

            // Pre-fill basic fields
            const resetData = {
                destination: application.destination,
                transport_date: application.transport_date,
                purpose: application.purpose
            };

            // Pre-fill common documents
            if (application.all_documents) {
                ['traders_pass', 'handlers_license', 'transport_carrier_reg'].forEach(docType => {
                    const doc = application.all_documents.find(d => d.document_type === docType);
                    if (doc) {
                        const filename = doc.file ? doc.file.substring(doc.file.lastIndexOf('/') + 1) : `${docType}.png`;
                        resetData[docType] = {
                            isExisting: true,
                            name: filename,
                            url: doc.file,
                            id: doc.id
                        };
                    }
                });
            }

            // Pre-fill origin fields and origin-specific documents
            mappedOrigins.forEach(o => {
                resetData[`barangay_${o.id}`] = o.barangay;
                resetData[`inahin_${o.id}`] = o.inahin || 0;
                resetData[`barako_${o.id}`] = o.barako || 0;
                resetData[`fattener_${o.id}`] = o.fattener || 0;
                resetData[`grower_${o.id}`] = o.grower || 0;
                resetData[`bulaw_${o.id}`] = o.bulaw || 0;
                resetData[`starter_${o.id}`] = o.starter || 0;

                const appOrigin = application.origins.find(ao => ao.id === o.id);
                if (appOrigin && appOrigin.documents) {
                    ['cis', 'endorsement_cert'].forEach(docType => {
                        const doc = appOrigin.documents.find(d => d.document_type === docType);
                        if (doc) {
                            const filename = doc.file ? doc.file.substring(doc.file.lastIndexOf('/') + 1) : `${docType}.png`;
                            resetData[`origin_${o.id}_${docType}`] = {
                                isExisting: true,
                                name: filename,
                                url: doc.file,
                                id: doc.id
                            };
                        }
                    });
                }
            });

            reset(resetData);
        }
    }, [application, reset]);

    const addOrigin = () => {
        setOrigins([...origins, { id: `new_${Date.now()}`, barangay: '', number_of_pigs: '' }]);
    };

    const removeOrigin = (id) => {
        if (origins.length > 1) {
            setOrigins(origins.filter(o => o.id !== id));
        }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white border border-stone-200">
            <span className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Loading Application Details...</p>
        </div>
    );

    if (isError || (application && !["RESUBMISSION", "OPV_REJECTED"].includes(application.status))) {
        return (
            <div className="max-w-3xl mx-auto p-4 sm:p-12 bg-white">
                <div className="bg-red-50 border border-red-200 p-10 flex flex-col items-center text-center space-y-4">
                    <AlertCircle className="text-red-600" size={32} />
                    <h2 className="text-lg font-bold text-red-700 uppercase tracking-tight">Access Denied</h2>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-relaxed">
                        This application is not available for resubmission.
                    </p>
                    <button 
                        onClick={() => navigate('/farmer/')} 
                        className="bg-stone-800 hover:bg-stone-700 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const onSubmit = (data) => {
        const formData = new FormData();
        formData.append('destination', data.destination);
        formData.append('transport_date', data.transport_date);
        formData.append('purpose', data.purpose);

        origins.forEach((o, index) => {
            const prefix = `origins[${index}]`;
            if (typeof o.id === 'number') {
                formData.append(`${prefix}[id]`, o.id);
            }
            formData.append(`${prefix}[barangay]`, data[`barangay_${o.id}`]);
            formData.append(`${prefix}[inahin]`, data[`inahin_${o.id}`] || 0);
            formData.append(`${prefix}[barako]`, data[`barako_${o.id}`] || 0);
            formData.append(`${prefix}[fattener]`, data[`fattener_${o.id}`] || 0);
            formData.append(`${prefix}[grower]`, data[`grower_${o.id}`] || 0);
            formData.append(`${prefix}[bulaw]`, data[`bulaw_${o.id}`] || 0);
            formData.append(`${prefix}[starter]`, data[`starter_${o.id}`] || 0);
        });

        // Appending common documents only if a new file is uploaded
        ['traders_pass', 'handlers_license', 'transport_carrier_reg'].forEach(docType => {
            const fileVal = data[docType];
            if (isFile(fileVal)) {
                formData.append(docType, getFileObject(fileVal));
            }
        });

        // Appending origin-specific documents only if a new file is uploaded
        origins.forEach(o => {
            ['cis', 'endorsement_cert'].forEach(docType => {
                const dataKey = `origin_${o.id}_${docType}`;
                const fileVal = data[dataKey];
                if (isFile(fileVal)) {
                    if (typeof o.id === 'number') {
                        formData.append(`origin_${o.id}_${docType}`, getFileObject(fileVal));
                    }
                }
            });
        });

        resubmit({ id, formData }, {
            onSuccess: () => {
                toast.success("Application resubmitted successfully.");
                navigate('/farmer/');
            },
            onError: (err) => {
                toast.error("Failed to resubmit application. Please check your details.");
            }
        });
    };

    const nextStep = async (fieldsToValidate, errorMsg = "Please check your answers before continuing.") => {
        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setStep((prev) => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            toast.error(errorMsg);
        }
    };

    const prevStep = () => {
        setStep((prev) => prev - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="flex-1 max-w-3xl mx-auto p-4 sm:p-6 md:p-12 space-y-8 bg-white min-h-full">
            <div className="space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-1">Corrective Action</p>
                    <h1 className="text-2xl sm:text-3xl font-black text-stone-800 tracking-tight uppercase leading-none">Resubmit Request</h1>
                </div>
                <p className="text-stone-500 font-medium text-sm sm:text-base max-w-xl">
                    Update the necessary fields or documents to comply with the requirements. Previously uploaded documents are pre-filled so you don't need to upload them again unless you want to replace them.
                </p>

                {/* Progress Tracker */}
                <div className="pt-4">
                    {/* Mobile-only Progress Indicator */}
                    <div className="md:hidden space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-stone-500">
                            <span>Step {step} of 3</span>
                            <span className="text-green-700">
                                {step === 1 ? "Travel Details" : step === 2 ? "Attach Files" : "Review & Send"}
                            </span>
                        </div>
                        <div className="w-full bg-stone-100 h-2 border border-stone-200">
                            <div 
                                className="bg-green-700 h-full transition-all duration-300 ease-out" 
                                style={{ width: `${(step / 3) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Desktop-only Stepper */}
                    <div className="hidden md:flex items-center pt-4">
                        {[1, 2, 3].map((num) => (
                            <div key={num} className="flex items-center flex-1 last:flex-none">
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 flex items-center justify-center font-black text-sm border-2
                                        ${step > num 
                                            ? "bg-green-700 border-green-700 text-white" 
                                            : step === num 
                                                ? "bg-white border-stone-800 text-stone-800" 
                                                : "bg-white border-stone-200 text-stone-300"}`}
                                    >
                                        {step > num ? <Check size={18} strokeWidth={3} /> : num}
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${step >= num ? 'text-stone-800' : 'text-stone-300'}`}>
                                        {num === 1 ? "Travel Details" : num === 2 ? "Attach Files" : "Review & Send"}
                                    </span>
                                </div>
                                {num < 3 && (
                                    <div className="flex-1 px-4 self-start mt-5">
                                        <div className={`h-[2px] w-full ${step > num ? "bg-green-700" : "bg-stone-200"}`} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {step === 1 && application.remarks && (
                <div className="bg-amber-50 border border-amber-200 p-5 flex gap-4 items-start">
                    <div className="bg-white p-2 border border-amber-200 text-amber-700 shrink-0">
                        <AlertCircle size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">Reason for Return (Remarks)</p>
                        <p className="text-xs text-stone-600 leading-relaxed font-bold uppercase tracking-wide">
                            "{application.remarks}"
                        </p>
                    </div>
                </div>
            )}

            <div className="pt-6 border-t border-stone-200">
                <form onSubmit={handleSubmit(onSubmit)}>
                    {step === 1 && (
                        <FarmerInfo
                            register={register}
                            errors={errors}
                            watch={watch}
                            setValue={setValue}
                            nextStep={() => {
                                const step1Fields = [
                                    'destination', 
                                    'transport_date', 
                                    'purpose',
                                    ...origins.map(o => `barangay_${o.id}`),
                                    ...origins.flatMap(o => [
                                        `inahin_${o.id}`,
                                        `barako_${o.id}`,
                                        `fattener_${o.id}`,
                                        `grower_${o.id}`,
                                        `bulaw_${o.id}`,
                                        `starter_${o.id}`
                                    ])
                                ];
                                nextStep(step1Fields, "Please fill in all required travel details.");
                            }}
                            origins={origins}
                            addOrigin={addOrigin}
                            removeOrigin={removeOrigin}
                        />
                    )}

                    {step === 2 && (
                        <UploadDocument
                            register={register}
                            errors={errors}
                            watch={watch}
                            prevStep={prevStep}
                            nextStep={() => {
                                const step2Fields = [
                                    'traders_pass', 
                                    'handlers_license', 
                                    'transport_carrier_reg',
                                    ...origins.flatMap(o => [
                                        `origin_${o.id}_cis`, 
                                        `origin_${o.id}_endorsement_cert`
                                    ])
                                ];
                                nextStep(step2Fields, "Please verify all required documents are attached.");
                            }}
                            origins={origins}
                        />
                    )}

                    {step === 3 && (
                        <ReviewApplication
                            watch={watch}
                            prevStep={prevStep}
                            isSubmitting={isSubmitting}
                            origins={origins}
                        />
                    )}
                </form>
            </div>
        </div>
    );
};

export default ResubmitApplication;