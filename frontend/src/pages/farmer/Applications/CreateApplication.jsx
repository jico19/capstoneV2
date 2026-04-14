import { useState } from "react";
import { useForm } from "react-hook-form";
import FarmerInfo from "./FarmerInfo";
import UploadDocument from "./UploadDocument";
import ReviewApplication from "./ReviewApplication";
import { Check } from "lucide-react";
import { useCreateApplicataion } from "/src/hooks/useApplications";
import { useNavigate } from "react-router-dom";


const CreateApplication = () => {
    const [step, setStep] = useState(1);
    const { mutate } = useCreateApplicataion()
    const navigate = useNavigate()

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting }
    } = useForm();

    const onSubmit = (data) => {
        const formData = new FormData()
        formData.append('origin_barangay', data.origin_barangay)
        formData.append('destination', data.destination)
        formData.append('number_of_pigs', data.number_of_pigs)
        formData.append('transport_date', data.transport_date)
        formData.append('purpose', data.purpose)

        // files
        formData.append('traders_pass', data.traders_pass[0])
        formData.append('handlers_license', data.handlers_license[0])
        formData.append('transport_carrier_reg', data.transport_carrier_reg[0])
        formData.append('cis', data.cis[0])
        formData.append('endorsement_cert', data.endorsement_cert[0])


        mutate(formData)
        reset()
        setStep(1)
        navigate('/farmer/')
    };

    const nextStep = async () => {
        setStep((prev) => prev + 1);
    };

    const prevStep = () => setStep((prev) => prev - 1);

    return (
        <div className="max-w-3xl mx-auto py-8">
            {/* Header & Step Indicator */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800">New Permit Application</h1>
                <p className="text-slate-500 text-sm mt-1">Complete the steps below to request a livestock transport permit.</p>

                <div className="flex items-center mt-6">
                    {[1, 2, 3].map((num) => (
                        <div key={num} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                                ${step > num ? "bg-green-500 text-white" : step === num ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-slate-200 text-slate-400"}`}
                            >
                                {step > num ? <Check size={16} /> : num}
                            </div>
                            {num < 3 && (
                                <div className={`w-24 h-1 mx-2 rounded-full transition-colors ${step > num ? "bg-green-500" : "bg-slate-200"}`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Form Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                <form onSubmit={handleSubmit(onSubmit)}>

                    {step === 1 && (
                        <FarmerInfo
                            register={register}
                            errors={errors}
                            nextStep={() => nextStep(['origin_barangay', 'destination', 'number_of_pigs', 'transport_date', 'purpose'])}
                        />
                    )}

                    {step === 2 && (
                        <UploadDocument
                            register={register}
                            errors={errors}
                            watch={watch}
                            prevStep={prevStep}
                            nextStep={() => nextStep()}
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
        </div>
    );
};

export default CreateApplication;