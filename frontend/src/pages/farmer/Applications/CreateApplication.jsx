import { useState } from "react";
import { useForm } from "react-hook-form";
import FarmerInfo from "./FarmerInfo";
import UploadDocument from "./UploadDocument";
import ReviewApplication from "./ReviewApplication";
import { Check, ArrowRight } from "lucide-react";
import { useCreateApplicataion } from "/src/hooks/useApplications";
import { useNavigate } from "react-router-dom";

/**
 * Create Application Flow
 * Redesigned for Farmer-Friendly simplicity and high-signal minimalism.
 * Restored stable flex-based progress tracker.
 */
const CreateApplication = () => {
    const [step, setStep] = useState(1);
    const [origins, setOrigins] = useState([{ id: Date.now(), barangay: '', number_of_pigs: '' }]);
    const { mutate } = useCreateApplicataion();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting }
    } = useForm();

    const addOrigin = () => {
        setOrigins([...origins, { id: Date.now(), barangay: '', number_of_pigs: '' }]);
    };

    const removeOrigin = (id) => {
        if (origins.length > 1) {
            setOrigins(origins.filter(o => o.id !== id));
        }
    };

    const onSubmit = (data) => {
        const formData = new FormData();
        formData.append('destination', data.destination);
        formData.append('transport_date', data.transport_date);
        formData.append('purpose', data.purpose);

        // Append origins
        origins.forEach((o, index) => {
            formData.append(`origins[${index}][barangay]`, data[`barangay_${o.id}`]);
            formData.append(`origins[${index}][number_of_pigs]`, data[`pigs_${o.id}`]);
        });

        // Append documents
        // Common docs
        ['traders_pass', 'handlers_license', 'transport_carrier_reg'].forEach(docType => {
            if (data[docType]?.[0]) formData.append(docType, data[docType][0]);
        });

        // Origin-specific docs
        origins.forEach((o, index) => {
            ['cis', 'endorsement_cert'].forEach(docType => {
                const key = `origin_${index}_${docType}`;
                const dataKey = `origin_${o.id}_${docType}`;
                if (data[dataKey]?.[0]) formData.append(key, data[dataKey][0]);
            });
        });
        
        mutate(formData);
        reset();
        setStep(1);
        navigate('/farmer/');
    };

    const nextStep = async () => {
        setStep((prev) => prev + 1);
    };

    const prevStep = () => setStep((prev) => prev - 1);

    return (
        <div className="flex-1 max-w-3xl mx-auto p-4 md:p-12 space-y-10 bg-white min-h-full">
            {/* Header & Friendly Guidance */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 mb-1">New Request</p>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">Start Your Permit Request</h1>
                </div>
                <p className="text-gray-500 font-medium text-lg max-w-xl">Complete these 3 quick steps to apply for your transport permit.</p>

                {/* Progress Bar - Robust Flex Version */}
                <div className="flex items-center pt-8">
                    {[1, 2, 3].map((num) => (
                        <div key={num} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-10 h-10 flex items-center justify-center font-black text-sm transition-none rounded-none border-4
                                    ${step > num 
                                        ? "bg-green-600 border-green-600 text-white" 
                                        : step === num 
                                            ? "bg-white border-gray-900 text-gray-900" 
                                            : "bg-white border-gray-100 text-gray-300"}`}
                                >
                                    {step > num ? <Check size={20} strokeWidth={3} /> : num}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${step >= num ? 'text-gray-900' : 'text-gray-300'}`}>
                                    {num === 1 ? "Travel" : num === 2 ? "Upload" : "Final"}
                                </span>
                            </div>
                            {num < 3 && (
                                <div className="flex-1 px-4 self-start mt-5">
                                    <div className={`h-1 w-full transition-none ${step > num ? "bg-green-600" : "bg-gray-100"}`} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Content - Clean Canvas */}
            <div className="pt-10 border-t border-gray-100">
                <form onSubmit={handleSubmit(onSubmit)}>

                    {step === 1 && (
                        <FarmerInfo
                            register={register}
                            errors={errors}
                            nextStep={() => nextStep(['origin_barangay', 'destination', 'number_of_pigs', 'transport_date', 'purpose'])}
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
                            nextStep={() => nextStep()}
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

            {/* Help Notice */}
            {step === 1 && (
                <div className="bg-gray-50 border border-gray-100 p-6 flex gap-4 items-start">
                    <div className="bg-white p-2 border border-gray-100 text-green-600">
                        <ArrowRight size={18} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium uppercase tracking-wide">
                        Tip: Make sure you have your Handler's License and Certificate of Inspection ready for the next step.
                    </p>
                </div>
            )}
        </div>
    );
};

export default CreateApplication;