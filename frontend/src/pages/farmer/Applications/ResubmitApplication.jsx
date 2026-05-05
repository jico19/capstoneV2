import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import FarmerInfo from "./FarmerInfo";
import UploadDocument from "./UploadDocument";
import ReviewApplication from "./ReviewApplication";
import { Check, ArrowRight, AlertCircle } from "lucide-react";
import { useApplicationDetail, useResubmitApplication } from "/src/hooks/useApplications";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Resubmit Application Component
 * Allows farmers to correct and update rejected applications.
 * Reuses the minimalist flow from CreateApplication with pre-filled data.
 */
const ResubmitApplication = () => {
    const { id } = useParams();
    const [step, setStep] = useState(1);
    const navigate = useNavigate();
    
    const { data: application, isLoading, isError } = useApplicationDetail(id);
    const { mutate: resubmit, isPending: isSubmitting } = useResubmitApplication();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors }
    } = useForm();

    // Pre-fill form when data arrives
    useEffect(() => {
        if (application) {
            reset({
                origin_barangay: application.origin_barangay?.id || application.origin_barangay,
                destination: application.destination,
                number_of_pigs: application.number_of_pigs,
                transport_date: application.transport_date,
                purpose: application.purpose
            });
        }
    }, [application, reset]);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
            <span className="loading loading-spinner loading-lg text-green-600"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Loading Application Details...</p>
        </div>
    );

    if (isError || (application && application.status !== "RESUBMISSION")) {
        return (
            <div className="max-w-3xl mx-auto p-12 bg-white">
                <div className="bg-red-50 border border-red-100 p-10 flex flex-col items-center text-center space-y-4">
                    <AlertCircle className="text-red-600" size={48} />
                    <h2 className="text-xl font-black text-red-700 uppercase tracking-tighter">Access Denied</h2>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                        This application is not available for resubmission.
                    </p>
                    <button onClick={() => navigate('/farmer/')} className="bg-gray-900 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest">Return Home</button>
                </div>
            </div>
        );
    }

    const onSubmit = (data) => {
        const formData = new FormData();
        formData.append('origin_barangay', data.origin_barangay);
        formData.append('destination', data.destination);
        formData.append('number_of_pigs', data.number_of_pigs);
        formData.append('transport_date', data.transport_date);
        formData.append('purpose', data.purpose);

        // Only append files if the user selected new ones
        if (data.traders_pass?.[0]) formData.append('traders_pass', data.traders_pass[0]);
        if (data.handlers_license?.[0]) formData.append('handlers_license', data.handlers_license[0]);
        if (data.transport_carrier_reg?.[0]) formData.append('transport_carrier_reg', data.transport_carrier_reg[0]);
        if (data.cis?.[0]) formData.append('cis', data.cis[0]);
        if (data.endorsement_cert?.[0]) formData.append('endorsement_cert', data.endorsement_cert[0]);

        resubmit({ id, formData }, {
            onSuccess: () => {
                navigate('/farmer/');
            }
        });
    };

    const nextStep = () => setStep((prev) => prev + 1);
    const prevStep = () => setStep((prev) => prev - 1);

    return (
        <div className="flex-1 max-w-3xl mx-auto p-4 md:p-12 space-y-10 bg-white min-h-full">
            <div className="space-y-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-1">Corrective Action</p>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">Resubmit Request</h1>
                </div>
                <p className="text-gray-500 font-medium text-lg max-w-xl">Update the necessary fields or documents to comply with the requirements.</p>

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

            <div className="pt-10 border-t border-gray-100">
                <form onSubmit={handleSubmit(onSubmit)}>
                    {step === 1 && (
                        <FarmerInfo
                            register={register}
                            errors={errors}
                            nextStep={nextStep}
                        />
                    )}

                    {step === 2 && (
                        <UploadDocument
                            register={register}
                            errors={errors}
                            watch={watch}
                            prevStep={prevStep}
                            nextStep={nextStep}
                            isResubmit={true}
                        />
                    )}

                    {step === 3 && (
                        <ReviewApplication
                            watch={watch}
                            prevStep={prevStep}
                            isSubmitting={isSubmitting}
                        />
                    )}
                </form>
            </div>

            {step === 1 && (
                <div className="bg-amber-50 border border-amber-100 p-6 flex gap-4 items-start">
                    <div className="bg-white p-2 border border-amber-100 text-amber-600">
                        <AlertCircle size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-1">Reason for Return</p>
                        <p className="text-sm text-amber-800 font-medium">
                            Please refer to the remarks in your application detail for the specific corrections needed.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResubmitApplication;