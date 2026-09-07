import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import FarmerInfo from "./FarmerInfo";
import UploadDocument from "./UploadDocument";
import ReviewApplication from "./ReviewApplication";
import { Check, ArrowRight, ShieldAlert } from "lucide-react";
import { useCreateApplication } from '../../../hooks/useApplications';
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
import useAuthStore from '../../../store/authStore';

/**
 * Create Application Flow
 * Redesigned for Farmer-Friendly simplicity, high-signal minimalism, and mobile responsiveness.
 * Follows the FarmPass Design System 2.0 guidelines.
 */
const CreateApplication = () => {
    const { user, fetchUserProfile } = useAuthStore();
    const [step, setStep] = useState(1);
    const [origins, setOrigins] = useState([{ id: Date.now(), barangay: '', number_of_pigs: '' }]);
    const [confirmModal, setConfirmModal] = useState(null);
    const { mutate } = useCreateApplication();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUserProfile();
    }, [fetchUserProfile]);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        trigger,
        setValue,
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

    const handleFormSubmit = (data) => {
        setConfirmModal({
            title: "Send Permit Request?",
            message: "Are you sure you want to send this livestock transport permit request? Please make sure all travel details and document photos are correct.",
            yesText: "Yes, Send Request",
            yesVariant: "success",
            type: "success",
            onYes: () => {
                const formData = new FormData();
                formData.append('destination', data.destination);
                formData.append('transport_date', data.transport_date);
                formData.append('purpose', data.purpose);

                // Append origins
                origins.forEach((o, index) => {
                    formData.append(`origins[${index}][barangay]`, data[`barangay_${o.id}`]);
                    formData.append(`origins[${index}][source_farmer_name]`, data[`source_farmer_name_${o.id}`] || '');
                    formData.append(`origins[${index}][source_phone_no]`, data[`source_phone_no_${o.id}`] || '');
                    formData.append(`origins[${index}][inahin]`, data[`inahin_${o.id}`] || 0);
                    formData.append(`origins[${index}][barako]`, data[`barako_${o.id}`] || 0);
                    formData.append(`origins[${index}][fattener]`, data[`fattener_${o.id}`] || 0);
                    formData.append(`origins[${index}][grower]`, data[`grower_${o.id}`] || 0);
                    formData.append(`origins[${index}][bulaw]`, data[`bulaw_${o.id}`] || 0);
                    formData.append(`origins[${index}][starter]`, data[`starter_${o.id}`] || 0);
                });

                // Append documents
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
                setConfirmModal(null);
                navigate('/farmer/');
            },
            onClose: () => {
                setConfirmModal(null);
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

    if (user?.verification_status && user?.verification_status !== 'VERIFIED') {
        return (
            <div className="max-w-2xl mx-auto p-4 sm:p-8 md:p-12 space-y-6">
                <div className="bg-white border-2 border-stone-900 p-6 sm:p-10 space-y-6 text-center shadow-xl">
                    <div className="w-16 h-16 bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                        <ShieldAlert size={36} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Account Restricted</p>
                        <h2 className="text-2xl sm:text-3xl font-black text-stone-900 uppercase tracking-tight">
                            Document Verification Required
                        </h2>
                        <p className="text-stone-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                            Municipal regulations require farmers to have verified standing credentials before submitting livestock transport permit requests.
                        </p>
                    </div>

                    <div className="bg-stone-50 border border-stone-200 p-4 text-left space-y-2 text-xs text-stone-700 max-w-md mx-auto">
                        <p className="font-black text-[10px] uppercase tracking-wider text-stone-500">Required Documents:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Handler's License (BAI)</li>
                            <li>Transport License / Vehicle Registration (OR/CR)</li>
                            <li>Trader's Pass (Sariaya LGU)</li>
                        </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                        <Link
                            to="/farmer"
                            className="px-6 py-3 border border-stone-300 text-stone-700 text-xs font-black uppercase tracking-widest hover:bg-stone-100 transition-colors"
                        >
                            Back to Dashboard
                        </Link>
                        <Link
                            to="/farmer/verification"
                            className="px-6 py-3 bg-green-700 hover:bg-green-600 text-white text-xs font-black uppercase tracking-widest transition-colors shadow-md shadow-green-700/20"
                        >
                            Upload Documents Now →
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {confirmModal && (
                <ConfirmationModal
                    isOpen={!!confirmModal}
                    onClose={confirmModal.onClose}
                    onYes={confirmModal.onYes}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    yesText={confirmModal.yesText}
                    yesVariant={confirmModal.yesVariant}
                    type={confirmModal.type}
                />
            )}
            
            <div className="flex-1 max-w-3xl mx-auto p-4 sm:p-6 md:p-12 space-y-8 bg-white min-h-full">
                {/* Header & Friendly Guidance */}
                <div className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-700 mb-1">New Request</p>
                        <h1 className="text-2xl sm:text-3xl font-black text-stone-800 tracking-tight uppercase leading-none">Apply for a Permit</h1>
                    </div>
                    <p className="text-stone-500 font-medium text-sm sm:text-base max-w-xl">
                        Complete these 3 simple steps to request your livestock transport permit.
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

                {/* Form Content - Clean Canvas */}
                <div className="pt-6 border-t border-stone-200">
                    <form onSubmit={handleSubmit(handleFormSubmit)}>

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
                                            `source_farmer_name_${o.id}`,
                                            `source_phone_no_${o.id}`,
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
                                    const step2Fields = origins.flatMap(o => [
                                        `origin_${o.id}_cis`, 
                                        `origin_${o.id}_endorsement_cert`
                                    ]);
                                    nextStep(step2Fields, "Please upload the required barangay certificates for each starting location.");
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

                {/* Help Notice */}
                {step === 1 && (
                    <div className="bg-stone-50 border border-stone-200 p-5 flex gap-4 items-start">
                        <div className="bg-white p-2 border border-stone-200 text-green-700 shrink-0">
                            <ArrowRight size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-1">Tip for Farmers</p>
                            <p className="text-xs text-stone-600 leading-relaxed font-medium uppercase tracking-wide">
                                Make sure you have photos of your Handler's License and Barangay Certificate of Inspection ready for the next step.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default CreateApplication;