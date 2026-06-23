import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, UserPlus, ArrowRight, Lock, Phone, CheckCircle2, X, RefreshCw, Smartphone, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api } from "/src/lib/api";
import { toast } from "sonner";
import AgriLogo from "/src/assets/sariaya-agri-logo.jpg";

/**
 * OTP Verification Modal Component
 * Provides a dedicated space for entering the 6-digit code.
 */
const OTPModal = ({ isOpen, onClose, phone, onVerify, onResend, isVerifying, isResending }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [modalError, setModalError] = useState(null);
    const inputRefs = useRef([]);

    // Reset OTP and errors when modal opens
    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setModalError(null);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [isOpen]);

    const handleChange = (element, index) => {
        if (isNaN(element.value)) return false;
        if (modalError) setModalError(null);

        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);

        // Move to next input if value is entered
        if (element.value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        // Move to previous input on backspace if current is empty
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        const data = e.clipboardData.getData("text").slice(0, 6);
        if (!/^\d+$/.test(data)) return;

        const newOtp = data.split('');
        const filledOtp = [...newOtp, ...Array(6 - newOtp.length).fill('')].slice(0, 6);
        setOtp(filledOtp);
        inputRefs.current[Math.min(data.length, 5)].focus();
    };

    const handleSubmit = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length === 6) {
            try {
                await onVerify(fullOtp);
            } catch (err) {
                setModalError("Invalid code. Please try again.");
            }
        } else {
            toast.error("Please enter the full 6-digit code");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm border border-stone-200 shadow-2xl relative animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute right-4 top-4 text-stone-400 hover:text-stone-900 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8 space-y-8 text-center">
                    <div className="flex justify-center">
                        <div className="bg-green-50 p-4 border border-green-100">
                            <Smartphone className="text-green-600" size={32} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">Verify Your Phone</h3>
                        <p className="text-sm font-medium text-stone-500">
                            We sent a 6-digit code to <br />
                            <span className="font-mono font-black text-stone-800">{phone}</span>
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* 6-Digit Input Grid */}
                        <div className="flex justify-between gap-2" onPaste={handlePaste}>
                            {otp.map((data, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength="1"
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    value={data}
                                    onChange={(e) => handleChange(e.target, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className={`w-10 h-14 sm:w-12 sm:h-16 text-2xl font-black text-center border-2 bg-stone-50 focus:bg-white focus:border-green-600 outline-none transition-all ${modalError ? 'border-red-600 bg-red-50 text-red-900' : 'border-stone-100'}`}
                                />
                            ))}
                        </div>
                        {modalError && (
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{modalError}</p>
                        )}
                    </div>

                    <div className="space-y-4 pt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={isVerifying || otp.join('').length < 6}
                            className="w-full py-4 bg-green-700 hover:bg-green-800 text-white font-black uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isVerifying ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    <span>Verifying...</span>
                                </>
                            ) : "Verify Account"}
                        </button>

                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Didn't get the code?</p>
                            <button
                                onClick={onResend}
                                disabled={isResending}
                                className="text-stone-900 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:opacity-70 transition-opacity"
                            >
                                {isResending ? (
                                    <>
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={12} />
                                        <span>Resend New Code</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Register Page
 * Redesigned for Farmer-Friendly accessibility and Minimalist Design System.
 */
const RegisterPage = () => {
    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm();
    const navigate = useNavigate();
    
    // UI States
    const [isOTPVerified, setIsOTPVerified] = useState(false)
    const [showOTPModal, setShowOTPModal] = useState(false)
    const [isSendingOTP, setIsSendingOTP] = useState(false)
    const [isVerifyingOTP, setIsVerifyingOTP] = useState(false)
    const [globalError, setGlobalError] = useState(null)
    const [isRegistered, setIsRegistered] = useState(false)

    // Handle the final registration process
    const onRegister = async (data) => {
        setGlobalError(null);
        try {
            await api.post('/user/', {
                username: data.username,
                password: data.password,
                phone_no: data.phone,
                first_name: data.first_name,
                last_name: data.last_name
            })
            setIsRegistered(true);
            toast.success("Account Created", {
                description: "You can now log in with your new details."
            });
        } catch(error) {
            console.error(error.response)
            setGlobalError(error.response?.data?.error || "Could not create your account.");
            toast.error("Registration Failed", {
                description: error.response?.data?.error || "Could not create your account."
            });
        }
    };  

    // Triggered when user clicks "Send Code" or Resend
    const onSendOTP = async (data) => {
        const phone = data?.phone || getValues("phone");
        if (!phone) return;

        setGlobalError(null);
        setIsSendingOTP(true);
        try {
            await api.post('/user/send_otp/', {
                phone_no: phone
            })
            toast.info("Verification Code Sent", {
                description: "Please check your phone for the 6-digit code."
            });
            setShowOTPModal(true); // Open the modal on success
        } catch(error) {
            console.error(error)
            setGlobalError("Failed to send verification code. Please check your number.");
            toast.error("Failed to Send Code", {
                description: "Please check your phone number and try again."
            });
        } finally {
            setIsSendingOTP(false);
        }
    }

    // Handle verification of the OTP from the modal
    const onVerifyOTP = async (code) => {
        const phone_no = getValues("phone");
        setIsVerifyingOTP(true);

        try {
            await api.post('/user/verify_otp/', {
                otp: code,
                phone_no: phone_no 
            })
            setIsOTPVerified(true)
            setShowOTPModal(false) // Close modal on success
            toast.success("Identity Verified", {
                description: "You can now complete your registration."
            });
        } catch (error) {
            console.error(error.response)
            // Re-throw so modal can catch and show its own error
            throw error;
        } finally {
            setIsVerifyingOTP(false);
        }
    }

    const clearError = () => {
        if (globalError) setGlobalError(null);
    }

    if (isRegistered) {
        return (
            <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans overflow-x-hidden">
                {/* Left Side: Branding and Benefits (Keep same for consistency) */}
                <div className="hidden md:flex md:w-5/12 bg-green-600 p-12 flex-col justify-between relative overflow-hidden border-r border-stone-100">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-32 -mt-32 rotate-45"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <img src={AgriLogo} alt="Sariaya Agri Logo" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                            <span className="text-white font-black text-2xl tracking-tighter">Farm<span className="text-green-100">Pass</span></span>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-4xl font-black text-white leading-tight tracking-tight uppercase">Success! <br /><span className="text-green-200 text-5xl">Welcome</span> <br />Farmer.</h2>
                        </div>
                    </div>
                    <div className="relative z-10 border-t border-white/20 pt-8">
                        <p className="text-green-100 text-[10px] font-black uppercase tracking-[0.2em]">Sariaya Municipal Agriculture Office</p>
                    </div>
                </div>

                {/* Right Side: Success Content */}
                <div className="flex-1 flex items-center justify-center p-6 md:p-16 bg-white">
                    <div className="w-full max-w-sm text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        <div className="flex justify-center">
                            <div className="bg-green-50 p-6 border-2 border-green-100">
                                <CheckCircle2 size={64} className="text-green-600" strokeWidth={3} />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-4xl font-black text-stone-900 uppercase tracking-tighter">Registration Complete</h1>
                            <p className="text-stone-500 font-medium text-sm leading-relaxed">Your account has been successfully created. You can now use your details to log in and apply for permits.</p>
                        </div>
                        <div className="pt-6">
                            <Link to="/login" className="w-full bg-green-700 hover:bg-green-800 text-white py-5 px-10 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-700/20">
                                Go to Login Page <ArrowRight size={18} strokeWidth={3} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans overflow-x-hidden">

            {/* OTP Modal */}
            <OTPModal 
                isOpen={showOTPModal}
                onClose={() => setShowOTPModal(false)}
                phone={getValues("phone")}
                onVerify={onVerifyOTP}
                onResend={() => onSendOTP()}
                isVerifying={isVerifyingOTP}
                isResending={isSendingOTP}
            />

            {/* Left Side: Branding and Benefits */}
            <div className="hidden md:flex md:w-5/12 bg-green-600 p-12 flex-col justify-between relative overflow-hidden border-r border-stone-100">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -mr-32 -mt-32 rotate-45"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <img src={AgriLogo} alt="Sariaya Agri Logo" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                        <span className="text-white font-black text-2xl tracking-tighter">
                            Farm<span className="text-green-100">Pass</span>
                        </span>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-4xl font-black text-white leading-tight tracking-tight uppercase">
                            Secure <br />
                            <span className="text-green-200 text-5xl">Farmer</span> <br />
                            Network.
                        </h2>
                        <p className="text-green-50 text-lg font-medium">Join the digital transformation of Sariaya agriculture.</p>
                    </div>

                    <ul className="mt-16 space-y-8">
                        {[
                            { title: "Save Time", desc: "No more long trips to the office for permit requests." },
                            { title: "Fast Tracking", desc: "Real-time updates on your application status." },
                            { title: "Verified", desc: "Secure 2-factor authentication for your protection." }
                        ].map((item, i) => (
                            <li key={i} className="flex gap-5">
                                <div className="h-8 w-8 bg-white/20 border border-white/30 flex-shrink-0 flex items-center justify-center font-black text-white text-sm italic">
                                    0{i+1}
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm uppercase tracking-tight">{item.title}</p>
                                    <p className="text-green-50 text-xs mt-1 font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative z-10 border-t border-white/20 pt-8">
                    <p className="text-green-100 text-[10px] font-black uppercase tracking-[0.2em]">Sariaya Municipal Agriculture Office</p>
                </div>
            </div>

            {/* Right Side: Registration Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-16 bg-white overflow-y-auto">
                <div className="w-full max-w-md space-y-10 py-12">

                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-1">Join the Network</p>
                        <h1 className="text-4xl font-black text-stone-900 tracking-tight leading-none uppercase">Create Account</h1>
                        <p className="text-stone-500 font-medium text-sm">Follow these 3 simple steps to join.</p>
                    </div>

                    {/* Simple Step Progress Indicator */}
                    <div className="flex items-center gap-4 bg-stone-50 border border-stone-100 p-4">
                        {[
                            { id: 1, label: "Details", active: !isOTPVerified },
                            { id: 2, label: "Verify", active: showOTPModal || (isOTPVerified && !isSubmitting) },
                            { id: 3, label: "Finish", active: isOTPVerified }
                        ].map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 flex-1">
                                <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-black border-2 transition-colors ${
                                    step.active ? "bg-green-600 border-green-600 text-white" : "bg-white border-stone-200 text-stone-300"
                                }`}>
                                    {isOTPVerified && step.id < 3 ? <CheckCircle2 size={12} strokeWidth={3} /> : step.id}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${step.active ? "text-stone-900" : "text-stone-300"}`}>
                                    {step.label}
                                </span>
                                {idx < 2 && <div className="flex-1 h-px bg-stone-200"></div>}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={isOTPVerified ? handleSubmit(onRegister) : handleSubmit(onSendOTP)} className="space-y-10">

                        {/* Global Error Banner */}
                        {globalError && (
                            <div className="bg-red-50 border-l-4 border-red-600 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
                                <div>
                                    <p className="text-xs font-black text-red-700 uppercase tracking-widest leading-none mb-1">Registration Error</p>
                                    <p className="text-xs font-medium text-red-600">{globalError}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-8">
                            {/* Part 1: Who are you? */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                                    <span className="text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5">STEP 1</span>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500">Your Identity</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-800">Your First Name</label>
                                        {/* Register first name input with required rule. Custom onChange is passed within register options to prevent overriding hook-form state mapping. */}
                                        <input
                                            type="text"
                                            {...register("first_name", { 
                                                required: "Please enter your first name",
                                                onChange: clearError
                                            })}
                                            className={`w-full p-4 bg-stone-50 border-2 rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.first_name ? 'border-red-600' : 'border-stone-100 focus:border-green-600'}`}
                                            placeholder="Example: JUAN"
                                            readOnly={isOTPVerified}
                                        />
                                        {errors.first_name && <p className="text-[10px] font-bold text-red-600 uppercase mt-1">{errors.first_name.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-800">Your Last Name</label>
                                        {/* Register last name input with required rule. Custom onChange is passed within register options to prevent overriding hook-form state mapping. */}
                                        <input
                                            type="text"
                                            {...register("last_name", { 
                                                required: "Please enter your last name",
                                                onChange: clearError
                                            })}
                                            className={`w-full p-4 bg-stone-50 border-2 rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.last_name ? 'border-red-600' : 'border-stone-100 focus:border-green-600'}`}
                                            placeholder="Example: DELA CRUZ"
                                            readOnly={isOTPVerified}
                                        />
                                        {errors.last_name && <p className="text-[10px] font-bold text-red-600 uppercase mt-1">{errors.last_name.message}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Part 2: Reach you? */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                                    <span className="text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5">STEP 2</span>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500">How can we reach you?</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-800">Your Login Name</label>
                                        {/* Register login name input with required rule. Custom onChange is passed within register options to prevent overriding hook-form state mapping. */}
                                        <input
                                            type="text"
                                            {...register("username", { 
                                                required: "Choose a login name",
                                                onChange: clearError
                                            })}
                                            className={`w-full p-4 bg-stone-50 border-2 rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.username ? 'border-red-600' : 'border-stone-100 focus:border-green-600'}`}
                                            placeholder="Example: juan_sariaya"
                                            readOnly={isOTPVerified}
                                        />
                                        {errors.username && <p className="text-[10px] font-bold text-red-600 uppercase mt-1">{errors.username.message}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-800">Your Mobile Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                            {/* Register mobile phone input. Custom onChange is passed within register options to prevent overriding hook-form state mapping. */}
                                            <input
                                                type="tel"
                                                {...register("phone", { 
                                                    required: "Mobile number is required",
                                                    onChange: clearError
                                                })}
                                                className={`w-full p-4 pl-12 rounded-none border-2 focus:ring-0 outline-none transition-colors text-sm font-bold font-mono ${isOTPVerified ? 'bg-green-50 border-green-200 text-green-700' : 'bg-stone-50 border-stone-100 focus:border-green-600'}`}
                                                placeholder="09XXXXXXXXX"
                                                readOnly={isOTPVerified}
                                            />
                                            {isOTPVerified && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600">
                                                    <CheckCircle2 size={18} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        {errors.phone && <p className="text-[10px] font-bold text-red-600 uppercase mt-1">{errors.phone.message}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Part 3: Secure? */}
                            <div className={`space-y-4 transition-opacity duration-300 ${isOTPVerified ? "opacity-100" : "opacity-40"}`}>
                                <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                                    <span className="text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5">STEP 3</span>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-500">Secure Your Account</h3>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-800">Create a Secure Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                        {/* Register password input. The field validation is conditional: it's required only after OTP has been verified and the field is enabled. */}
                                        <input
                                            type="password"
                                            {...register("password", { 
                                                required: isOTPVerified ? "Create a password to keep your account safe" : false,
                                                onChange: clearError
                                            })}
                                            className={`w-full p-4 pl-12 bg-stone-50 border-2 rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.password ? 'border-red-600' : 'border-stone-100 focus:border-green-600'}`}
                                            placeholder="At least 8 characters"
                                            disabled={!isOTPVerified}
                                        />
                                    </div>
                                    {errors.password && <p className="text-[10px] font-bold text-red-600 uppercase mt-1">{errors.password.message}</p>}
                                    {isOTPVerified && (
                                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mt-2 flex items-center gap-1">
                                            <CheckCircle2 size={12} strokeWidth={3} /> Phone Verified. You can now set your password.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Main Submit Button */}
                        <div className="pt-4">
                            <button
                                id="submit-registration"
                                type="submit"
                                disabled={isSubmitting || isSendingOTP}
                                className={`w-full py-5 rounded-none font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                                    isOTPVerified 
                                    ? "bg-green-700 hover:bg-green-800 text-white shadow-lg shadow-green-700/20" 
                                    : "bg-stone-900 hover:bg-black text-white"
                                }`}
                            >
                                {isSubmitting || isSendingOTP ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        <span>{isOTPVerified ? "Creating Account..." : "Sending Code..."}</span>
                                    </>
                                ) : (
                                    <>
                                        {isOTPVerified ? "Complete Registration" : "Verify Phone Number"}
                                        {isOTPVerified ? <CheckCircle2 size={20} strokeWidth={3} /> : <ArrowRight size={20} strokeWidth={3} />}
                                    </>
                                )}
                            </button>
                            {!isOTPVerified && (
                                <p className="text-[9px] text-stone-400 font-black uppercase tracking-widest mt-4 text-center">
                                    We will send a 6-digit code to verify your identity.
                                </p>
                            )}
                        </div>
                    </form>

                    {/* Footer Links */}
                    <div className="pt-8 text-center border-t border-stone-100">
                        <p className="text-stone-500 text-xs font-medium">
                            Already part of our network?
                        </p>
                        <Link to="/login" className="inline-block mt-4 border-2 border-stone-200 hover:bg-stone-50 text-stone-900 px-10 py-4 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors">
                            Log In Here
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
