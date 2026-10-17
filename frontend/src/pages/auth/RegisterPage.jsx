import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import {
    Lock,
    Phone,
    CheckCircle2,
    X,
    AlertCircle,
    Eye,
    EyeOff,
    User,
    RefreshCw,
    FileText,
    Check,
    Building2,
    FileCheck2,
    MapPin
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "../../lib/api";
import { toast } from "sonner";
import AgriLogo from "../../assets/sariaya-agri-logo.jpg";

/**
 * Register Page
 * Strictly aligned with FarmPass Design System Version 2.1 (Design.MD):
 * - 3-tier radius: rounded-xl cards, rounded-lg controls/inputs, rounded-md badges
 * - Micro-shadows: shadow-xs, shadow-2xs
 * - Primary emerald-700 (#047857) and hover emerald-800
 * - Warm stone neutrals
 */
const RegisterPage = () => {
    // Current Step in the wizard: 1, 2, or 3
    const [currentStep, setCurrentStep] = useState(1);

    const {
        register,
        handleSubmit,
        getValues,
        setValue,
        watch,
        setError,
        clearErrors,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            first_name: "",
            last_name: "",
            username: "",
            phone: "",
            password: "",
            confirm_password: "",
        },
        mode: "onTouched",
    });

    const watchedFirstName = watch("first_name");
    const watchedLastName = watch("last_name");
    const watchedPhone = watch("phone");
    const watchedPassword = watch("password");
    const watchedConfirmPassword = watch("confirm_password");

    const [isUsernameDirty, setIsUsernameDirty] = useState(false);
    const [isCustomizingUsername, setIsCustomizingUsername] = useState(false);

    // Auto-derive clean username if user hasn't typed a custom one
    useEffect(() => {
        if (!isUsernameDirty) {
            const first = (watchedFirstName || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            const last = (watchedLastName || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            if (first || last) {
                setValue("username", `${first}${last}`);
            } else {
                setValue("username", "");
            }
        }
    }, [watchedFirstName, watchedLastName, isUsernameDirty, setValue]);

    // UI States
    const [isOTPVerified, setIsOTPVerified] = useState(false);
    const [isSendingOTP, setIsSendingOTP] = useState(false);
    const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
    const [globalError, setGlobalError] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);

    // Password visibility toggles
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // OTP Code state (6 individual digits)
    const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
    const [otpError, setOtpError] = useState(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const otpInputRefs = useRef([]);

    // Countdown timer for OTP resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    // Clear global errors on field edits
    const clearFormErrors = () => {
        if (globalError) setGlobalError(null);
        if (otpError) setOtpError(null);
    };

    // Step 1 -> Step 2: Request SMS OTP
    const handleRequestOTP = async () => {
        setGlobalError(null);
        setOtpError(null);

        const phone = getValues("phone");
        if (!phone) {
            setError("phone", { type: "manual", message: "Mobile number is required" });
            return;
        }

        setIsSendingOTP(true);
        try {
            await api.post("/user/send_otp/", {
                phone_no: phone,
            });
            toast.info("Verification Code Sent", {
                description: `A 6-digit code was sent to ${phone}.`,
            });
            setResendCooldown(60);
            setCurrentStep(2);
            // Focus first OTP field
            setTimeout(() => {
                otpInputRefs.current[0]?.focus();
            }, 100);
        } catch (error) {
            console.error(error);
            const serverError = error.response?.data?.error || error.response?.data?.message || "";
            const isDuplicate =
                serverError.toLowerCase().includes("already registered") ||
                serverError.toLowerCase().includes("already exists") ||
                serverError.toLowerCase().includes("phone");

            const displayError = isDuplicate
                ? serverError || "This mobile number is already registered to another account."
                : serverError || "Failed to send verification code. Please check your number.";

            if (isDuplicate) {
                setError("phone", { type: "manual", message: displayError });
            }

            setGlobalError(displayError);
            toast.error(isDuplicate ? "Mobile Number Already Registered" : "Failed to Send Code", {
                description: displayError,
            });
        } finally {
            setIsSendingOTP(false);
        }
    };

    // Step 2 OTP Digits Handlers
    const handleOtpChange = (val, idx) => {
        if (isNaN(val)) return;
        setOtpError(null);

        const updated = [...otpDigits];
        updated[idx] = val;
        setOtpDigits(updated);

        // Move focus forward
        if (val && idx < 5) {
            otpInputRefs.current[idx + 1]?.focus();
        }

        // Auto verify if all 6 digits entered
        const fullCode = updated.join("");
        if (fullCode.length === 6) {
            submitVerifyOTP(fullCode);
        }
    };

    const handleOtpKeyDown = (e, idx) => {
        if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
            otpInputRefs.current[idx - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").trim().slice(0, 6);
        if (!/^\d+$/.test(pasted)) return;

        const digits = pasted.split("");
        const filled = [...digits, ...Array(6 - digits.length).fill("")].slice(0, 6);
        setOtpDigits(filled);

        if (filled.every((d) => d !== "")) {
            submitVerifyOTP(filled.join(""));
        } else {
            otpInputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
    };

    // Step 2 -> Step 3: Verify SMS OTP
    const submitVerifyOTP = async (codeOverride) => {
        const fullCode = codeOverride || otpDigits.join("");
        if (fullCode.length !== 6) {
            setOtpError("Please enter all 6 digits of the code.");
            return;
        }

        const phone = getValues("phone");
        setIsVerifyingOTP(true);
        setOtpError(null);

        try {
            await api.post("/user/verify_otp/", {
                otp: fullCode,
                phone_no: phone,
            });
            setIsOTPVerified(true);
            toast.success("Phone Verified", {
                description: "Your mobile number has been authenticated.",
            });
            setCurrentStep(3);
        } catch (error) {
            console.error(error.response);
            const msg = error.response?.data?.error || error.response?.data?.message || "Invalid verification code. Please try again.";
            setOtpError(msg);
            toast.error("Verification Failed", { description: msg });
        } finally {
            setIsVerifyingOTP(false);
        }
    };

    // Step 3: Final Account Creation
    const onFinalRegister = async (data) => {
        setGlobalError(null);
        try {
            await api.post("/user/", {
                username: data.username,
                password: data.password,
                phone_no: data.phone,
                first_name: data.first_name,
                last_name: data.last_name,
            });
            setIsRegistered(true);
            toast.success("Account Created Successfully", {
                description: "Welcome to FarmPass! You can now log in.",
            });
        } catch (error) {
            console.error(error.response);
            const serverError = error.response?.data?.error || error.response?.data?.message || "";
            const isDuplicatePhone =
                serverError.toLowerCase().includes("phone") ||
                serverError.toLowerCase().includes("already registered") ||
                serverError.toLowerCase().includes("already exists");

            const displayError = isDuplicatePhone
                ? serverError || "This mobile number is already registered to another account."
                : serverError || "Could not complete registration. Please review your entries.";

            if (isDuplicatePhone) {
                setError("phone", { type: "manual", message: displayError });
                setCurrentStep(1);
            }

            setGlobalError(displayError);
            toast.error("Registration Error", { description: displayError });
        }
    };

    // Password requirements checker
    const hasMinLength = (watchedPassword || "").length >= 8;
    const hasLetterAndNumber = /[a-zA-Z]/.test(watchedPassword || "") && /\d/.test(watchedPassword || "");
    const passwordsMatch = Boolean(watchedPassword && watchedPassword === watchedConfirmPassword);

    // Successful Registration View
    if (isRegistered) {
        return (
            <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
                {/* Left Side: Brand Panel */}
                <div className="hidden md:flex md:w-5/12 bg-green-700 p-12 flex-col justify-between text-white border-r border-stone-200">
                    <div>
                        <div className="flex items-center gap-3 mb-10">
                            <img
                                src={AgriLogo}
                                alt="Sariaya Agriculture Logo"
                                className="w-10 h-10 rounded-full object-cover border border-white/30"
                            />
                            <div>
                                <span className="text-white font-black text-2xl tracking-tighter uppercase">
                                    Farm<span className="text-green-200">Pass</span>
                                </span>
                                <p className="text-[10px] font-black uppercase tracking-widest text-green-100">
                                    Municipality of Sariaya, Quezon
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-sm">
                            <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                                Registration <br />
                                Completed
                            </h2>
                            <p className="text-green-50 text-sm font-normal leading-relaxed">
                                Your account is registered in the municipal livestock transport system. Sign in to upload your credentials.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-white/20 pt-6">
                        <p className="text-green-100 text-[10px] font-black uppercase tracking-widest">
                            Sariaya Municipal Agriculture Office
                        </p>
                    </div>
                </div>

                {/* Right Side: Success Confirmation Card */}
                <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                    <div className="w-full max-w-md bg-white border border-stone-200 rounded-xl shadow-xs p-8 text-center space-y-6">
                        <div className="mx-auto w-14 h-14 bg-green-50 border border-green-600 rounded-xl flex items-center justify-center text-green-700">
                            <CheckCircle2 size={32} />
                        </div>

                        <div className="space-y-1">
                            <h1 className="text-2xl font-black text-stone-800 uppercase tracking-tight">
                                Account Registered
                            </h1>
                            <p className="text-stone-600 text-xs">
                                Welcome, <span className="font-bold text-stone-800">{getValues("first_name")}</span>. Your account is linked to mobile number{" "}
                                <span className="font-mono font-bold text-green-700">{getValues("phone")}</span>.
                            </p>
                        </div>

                        {/* Account Summary Box */}
                        <div className="bg-stone-100 border border-stone-200 rounded-lg p-3.5 text-left space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-stone-600">Username</span>
                                <span className="font-mono font-bold text-stone-800">@{getValues("username")}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-stone-600">Verified Mobile</span>
                                <span className="font-mono font-bold text-stone-800">{getValues("phone")}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-stone-600">Initial Status</span>
                                <span className="bg-amber-50 text-amber-700 border border-amber-500 rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                                    Document Verification Required
                                </span>
                            </div>
                        </div>

                        {/* Next Steps Advisory */}
                        <div className="bg-amber-50 border-l-4 border-amber-500 border border-stone-200 rounded-lg p-3.5 text-left flex gap-3 text-xs text-stone-800">
                            <FileText className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                            <div className="space-y-0.5">
                                <p className="font-bold text-amber-700 uppercase tracking-wide text-[11px]">Next: Submit Livestock Licenses</p>
                                <p className="text-stone-600 leading-relaxed">
                                    After signing in, upload your Handler's License and Transport License to enable permit applications.
                                </p>
                            </div>
                        </div>

                        <Link
                            to="/login"
                            className="w-full inline-block bg-green-700 hover:bg-green-600 text-white font-black uppercase tracking-widest text-xs px-4 py-3 rounded-lg shadow-xs transition-colors duration-100 ease-out cursor-pointer"
                        >
                            Sign In Now
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
            {/* Left Side: Brand Panel */}
            <div className="hidden md:flex md:w-5/12 bg-green-700 p-12 flex-col justify-between text-white border-r border-stone-200">
                <div>
                    <div className="flex items-center gap-3 mb-10">
                        <img
                            src={AgriLogo}
                            alt="Sariaya Agriculture Logo"
                            className="w-10 h-10 rounded-full object-cover border border-white/30"
                        />
                        <div>
                            <span className="text-white font-black text-2xl tracking-tighter uppercase">
                                Farm<span className="text-green-200">Pass</span>
                            </span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-100">
                                Municipality of Sariaya, Quezon
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 max-w-sm">
                        <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                            Farmer Registration
                        </h2>
                        <p className="text-green-50 text-sm font-normal leading-relaxed">
                            Register your account to apply for municipal hog transport permits and receive official inspection notifications.
                        </p>
                    </div>

                    {/* Operational Details */}
                    <div className="mt-12 space-y-3 max-w-sm text-xs">
                        <div className="flex gap-3 items-start p-3 bg-white/10 border border-white/20 rounded-lg">
                            <Building2 className="text-green-100 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="font-bold text-white uppercase tracking-tight text-[11px]">Official Permitting Authority</p>
                                <p className="text-green-100 text-xs mt-0.5">Administered by the Municipal Agriculture Office</p>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start p-3 bg-white/10 border border-white/20 rounded-lg">
                            <FileCheck2 className="text-green-100 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="font-bold text-white uppercase tracking-tight text-[11px]">Required Credentials</p>
                                <p className="text-green-100 text-xs mt-0.5">Active Philippine mobile number & valid livestock handler license</p>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start p-3 bg-white/10 border border-white/20 rounded-lg">
                            <MapPin className="text-green-100 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="font-bold text-white uppercase tracking-tight text-[11px]">Office Location</p>
                                <p className="text-green-100 text-xs mt-0.5">Ground Floor, Municipal Hall, Sariaya, Quezon</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/20 pt-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-green-100">
                    <span>Sariaya Municipal Agriculture Office</span>
                    <span className="text-green-200">Province of Quezon</span>
                </div>
            </div>

            {/* Right Side: Interactive Registration Card */}
            <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 md:p-12 overflow-y-auto">
                <div className="w-full max-w-lg bg-white border border-stone-200 rounded-xl shadow-xs p-6 sm:p-8 md:p-10 space-y-6 my-6">

                    {/* Mobile Header Branding (Shown on mobile screens only) */}
                    <div className="flex md:hidden items-center justify-between pb-4 border-b border-stone-200">
                        <div className="flex items-center gap-2.5">
                            <img
                                src={AgriLogo}
                                alt="Sariaya Agriculture Logo"
                                className="w-8 h-8 rounded-full object-cover border border-stone-200"
                            />
                            <span className="font-black text-lg text-stone-800 tracking-tighter uppercase">
                                Farm<span className="text-green-700">Pass</span>
                            </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">
                            Farmer Registration
                        </span>
                    </div>

                    {/* Stepper Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            {[
                                { step: 1, label: "Farmer Details" },
                                { step: 2, label: "Verify SMS" },
                                { step: 3, label: "Set Password" },
                            ].map((s) => {
                                const isPassed = currentStep > s.step || (s.step === 2 && isOTPVerified);
                                const isCurrent = currentStep === s.step;
                                return (
                                    <div key={s.step} className="flex items-center gap-2">
                                        <div
                                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black transition-colors ${
                                                isPassed
                                                    ? "bg-green-700 text-white"
                                                    : isCurrent
                                                    ? "bg-stone-800 text-white"
                                                    : "bg-stone-100 text-stone-400 border border-stone-200"
                                            }`}
                                        >
                                            {isPassed ? <Check size={12} strokeWidth={3} /> : s.step}
                                        </div>
                                        <span
                                            className={`text-[10px] font-black uppercase tracking-widest ${
                                                isCurrent ? "text-stone-800 font-black" : isPassed ? "text-green-700" : "text-stone-400"
                                            }`}
                                        >
                                            {s.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Progress Bar Track */}
                        <div className="w-full bg-stone-100 h-1 rounded-full overflow-hidden">
                            <div
                                className="bg-green-700 h-full transition-all duration-100 ease-out"
                                style={{
                                    width: currentStep === 1 ? "33%" : currentStep === 2 ? "66%" : "100%",
                                }}
                            ></div>
                        </div>
                    </div>

                    {/* Step Title & Subtitle */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-stone-800 uppercase tracking-tight">
                            {currentStep === 1 && "Personal & Mobile Details"}
                            {currentStep === 2 && "Enter Verification Code"}
                            {currentStep === 3 && "Create Password"}
                        </h1>
                        <p className="text-stone-600 text-xs font-normal">
                            {currentStep === 1 && "Enter your full name and Philippine mobile number."}
                            {currentStep === 2 && `Enter the 6-digit verification code sent to ${getValues("phone")}.`}
                            {currentStep === 3 && "Set your password to complete your account setup."}
                        </p>
                    </div>

                    {/* Global Error Banner */}
                    {globalError && (
                        <div className="bg-red-50 border-l-4 border-red-600 border border-stone-200 rounded-lg p-3.5 flex items-start gap-3">
                            <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
                            <div className="flex-1 text-xs">
                                <p className="font-bold text-red-700 uppercase tracking-wide text-[11px] mb-0.5">Please check your information</p>
                                <p className="text-stone-600 leading-relaxed">{globalError}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setGlobalError(null)}
                                className="text-stone-400 hover:text-stone-800 p-0.5 cursor-pointer"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* STEP 1: Personal Info & Phone Number */}
                    {/* ========================================================================= */}
                    {currentStep === 1 && (
                        <form
                            onSubmit={handleSubmit(handleRequestOTP)}
                            className="space-y-4"
                        >
                            {/* First & Last Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600">
                                        First Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                        <input
                                            type="text"
                                            {...register("first_name", {
                                                required: "Please enter your first name",
                                                onChange: clearFormErrors,
                                            })}
                                            className={`w-full h-9 px-3 pl-9 bg-white border outline-none text-sm text-stone-800 placeholder:text-stone-400 rounded-lg shadow-2xs ${
                                                errors.first_name
                                                    ? "border-red-600 bg-red-50"
                                                    : "border-stone-200 focus:border-green-700"
                                            }`}
                                            placeholder="First name"
                                        />
                                    </div>
                                    {errors.first_name && (
                                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">{errors.first_name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600">
                                        Last Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                        <input
                                            type="text"
                                            {...register("last_name", {
                                                required: "Please enter your last name",
                                                onChange: clearFormErrors,
                                            })}
                                            className={`w-full h-9 px-3 pl-9 bg-white border outline-none text-sm text-stone-800 placeholder:text-stone-400 rounded-lg shadow-2xs ${
                                                errors.last_name
                                                    ? "border-red-600 bg-red-50"
                                                    : "border-stone-200 focus:border-green-700"
                                            }`}
                                            placeholder="Last name"
                                        />
                                    </div>
                                    {errors.last_name && (
                                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">{errors.last_name.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Mobile Number Field */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600">
                                    Mobile Number
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3 flex items-center gap-1.5 pointer-events-none">
                                        <Phone className="text-stone-400" size={15} />
                                        <span className="text-xs font-bold text-stone-600 border-r border-stone-200 pr-2">+63</span>
                                    </div>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        {...register("phone", {
                                            required: "Mobile number is required",
                                            pattern: {
                                                value: /^(?:\+639|639|09)\d{9}$/,
                                                message: "Please enter a valid 11-digit mobile number",
                                            },
                                            onChange: clearFormErrors,
                                        })}
                                        className={`w-full h-9 px-3 pl-20 pr-8 bg-white border outline-none text-sm font-mono text-stone-800 placeholder:text-stone-400 rounded-lg shadow-2xs ${
                                            errors.phone
                                                ? "border-red-600 bg-red-50"
                                                : "border-stone-200 focus:border-green-700"
                                        }`}
                                        placeholder="9XXXXXXXXX"
                                    />
                                    {watchedPhone && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setValue("phone", "");
                                                clearErrors("phone");
                                            }}
                                            className="absolute right-2.5 text-stone-400 hover:text-stone-800 p-0.5 cursor-pointer"
                                            title="Clear phone number"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                {errors.phone ? (
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">{errors.phone.message}</p>
                                ) : (
                                    <p className="text-xs text-stone-400 mt-0.5">
                                        A 6-digit confirmation code will be sent via SMS to this number.
                                    </p>
                                )}
                            </div>

                            {/* Username Preview & Customization */}
                            <div className="bg-stone-100 border border-stone-200 rounded-lg p-3 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-stone-800">
                                        <span className="font-bold text-[10px] uppercase tracking-widest text-stone-600">Assigned Username:</span>
                                        <span className="font-mono font-bold text-green-700 bg-white px-2 py-0.5 border border-stone-200 rounded-md shadow-2xs">
                                            @{watch("username") || "username"}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomizingUsername(!isCustomizingUsername)}
                                        className="text-[10px] font-black uppercase tracking-widest text-green-700 hover:text-green-600 underline cursor-pointer"
                                    >
                                        {isCustomizingUsername ? "Done" : "Customize"}
                                    </button>
                                </div>

                                {isCustomizingUsername && (
                                    <div className="pt-2 border-t border-stone-200 space-y-1">
                                        <input
                                            type="text"
                                            {...register("username", {
                                                required: "Username is required",
                                                pattern: {
                                                    value: /^[a-zA-Z0-9_]+$/,
                                                    message: "Letters, numbers, and underscores only",
                                                },
                                                onChange: () => {
                                                    setIsUsernameDirty(true);
                                                    clearFormErrors();
                                                },
                                            })}
                                            className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-stone-200 outline-none focus:border-green-700 text-stone-800 rounded-lg shadow-2xs"
                                            placeholder="Custom username"
                                        />
                                        {errors.username && (
                                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">{errors.username.message}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Submit Step 1 Button */}
                            <button
                                type="submit"
                                disabled={isSendingOTP}
                                className="w-full bg-green-700 text-white font-black uppercase tracking-widest text-xs px-4 py-3 rounded-lg shadow-xs hover:bg-green-600 transition-colors duration-100 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isSendingOTP ? (
                                    <>
                                        <RefreshCw size={15} className="animate-spin" />
                                        <span>Sending SMS Code...</span>
                                    </>
                                ) : (
                                    <span>Verify Mobile Number</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* ========================================================================= */}
                    {/* STEP 2: In-line SMS OTP Verification */}
                    {/* ========================================================================= */}
                    {currentStep === 2 && (
                        <div className="space-y-5">
                            {/* Summary Pill with Edit Action */}
                            <div className="bg-stone-100 border border-stone-200 rounded-lg p-3.5 flex items-center justify-between text-xs">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Code Sent To Mobile</p>
                                    <p className="font-mono font-bold text-stone-800 mt-0.5">{getValues("phone")}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCurrentStep(1);
                                        setOtpError(null);
                                    }}
                                    className="text-[10px] font-black uppercase tracking-widest text-green-700 hover:text-green-600 underline cursor-pointer"
                                >
                                    Change Number
                                </button>
                            </div>

                            {/* 6 Digit Input Boxes */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600 text-center">
                                    Enter 6-Digit PIN
                                </label>
                                <div
                                    className="flex justify-center gap-2"
                                    onPaste={handleOtpPaste}
                                >
                                    {otpDigits.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength="1"
                                            ref={(el) => (otpInputRefs.current[idx] = el)}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(e.target.value, idx)}
                                            onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                            className={`w-10 h-12 text-center font-mono font-bold text-xl border outline-none bg-white text-stone-800 rounded-lg shadow-2xs ${
                                                otpError
                                                    ? "border-red-600 bg-red-50 text-red-900"
                                                    : digit
                                                    ? "border-green-700 bg-green-50 text-green-900"
                                                    : "border-stone-200 focus:border-green-700"
                                            }`}
                                        />
                                    ))}
                                </div>
                                {otpError && (
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide text-center mt-1">
                                        {otpError}
                                    </p>
                                )}
                            </div>

                            {/* Resend Timer & Actions */}
                            <div className="flex items-center justify-between text-xs text-stone-600 pt-2 border-t border-stone-200">
                                <span>Did not receive code?</span>
                                {resendCooldown > 0 ? (
                                    <span>
                                        Resend in <span className="font-mono font-bold text-stone-800">{resendCooldown}s</span>
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleRequestOTP}
                                        disabled={isSendingOTP}
                                        className="font-black uppercase tracking-widest text-[10px] text-green-700 hover:text-green-600 inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <RefreshCw size={12} className={isSendingOTP ? "animate-spin" : ""} />
                                        <span>Resend Code</span>
                                    </button>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    className="border border-stone-200 bg-white text-stone-600 font-medium text-sm px-4 py-2.5 rounded-lg shadow-2xs hover:bg-stone-50 transition-colors duration-100 ease-out cursor-pointer"
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => submitVerifyOTP()}
                                    disabled={isVerifyingOTP || otpDigits.join("").length < 6}
                                    className="flex-1 bg-green-700 text-white font-black uppercase tracking-widest text-xs px-4 py-2.5 rounded-lg shadow-xs hover:bg-green-600 transition-colors duration-100 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isVerifyingOTP ? (
                                        <>
                                            <RefreshCw size={15} className="animate-spin" />
                                            <span>Verifying...</span>
                                        </>
                                    ) : (
                                        <span>Verify Code</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* STEP 3: Password & Security */}
                    {/* ========================================================================= */}
                    {currentStep === 3 && (
                        <form
                            onSubmit={handleSubmit(onFinalRegister)}
                            className="space-y-4"
                        >
                            {/* Verification Confirmed Badge */}
                            <div className="bg-green-50 border border-green-600 rounded-lg p-3 flex items-center justify-between text-xs text-green-700">
                                <div className="flex items-center gap-2 font-bold">
                                    <CheckCircle2 size={15} />
                                    <span>Verified: {getValues("phone")}</span>
                                </div>
                                <span className="font-mono font-bold text-stone-800">@{getValues("username")}</span>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600">
                                    Create Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        {...register("password", {
                                            required: "Please create a password",
                                            minLength: {
                                                value: 8,
                                                message: "Password must be at least 8 characters",
                                            },
                                            onChange: clearFormErrors,
                                        })}
                                        className={`w-full h-9 px-3 pl-9 pr-8 bg-white border outline-none text-sm text-stone-800 placeholder:text-stone-400 rounded-lg shadow-2xs ${
                                            errors.password
                                                ? "border-red-600 bg-red-50"
                                                : "border-stone-200 focus:border-green-700"
                                        }`}
                                        placeholder="At least 8 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800 p-0.5 cursor-pointer"
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">{errors.password.message}</p>
                                )}
                            </div>

                            {/* Confirm Password Field */}
                            <div className="space-y-1">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        {...register("confirm_password", {
                                            required: "Please confirm your password",
                                            validate: (val) => val === getValues("password") || "Passwords do not match",
                                            onChange: clearFormErrors,
                                        })}
                                        className={`w-full h-9 px-3 pl-9 pr-8 bg-white border outline-none text-sm text-stone-800 placeholder:text-stone-400 rounded-lg shadow-2xs ${
                                            errors.confirm_password
                                                ? "border-red-600 bg-red-50"
                                                : "border-stone-200 focus:border-green-700"
                                        }`}
                                        placeholder="Repeat password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800 p-0.5 cursor-pointer"
                                        title={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {errors.confirm_password && (
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">{errors.confirm_password.message}</p>
                                )}
                            </div>

                            {/* Password Criteria Checklist */}
                            <div className="bg-stone-100 border border-stone-200 rounded-lg p-3 space-y-1.5 text-xs">
                                <p className="text-[10px] font-black uppercase tracking-widest text-stone-600">Password Checklist</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[9px] ${
                                                hasMinLength ? "bg-green-700 text-white" : "bg-stone-200 text-stone-500"
                                            }`}
                                        >
                                            <Check size={10} strokeWidth={3} />
                                        </div>
                                        <span className={hasMinLength ? "text-stone-800 font-bold" : "text-stone-500"}>
                                            At least 8 characters
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[9px] ${
                                                hasLetterAndNumber ? "bg-green-700 text-white" : "bg-stone-200 text-stone-500"
                                            }`}
                                        >
                                            <Check size={10} strokeWidth={3} />
                                        </div>
                                        <span className={hasLetterAndNumber ? "text-stone-800 font-bold" : "text-stone-500"}>
                                            Contains letters and numbers
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[9px] ${
                                                passwordsMatch && watchedConfirmPassword
                                                    ? "bg-green-700 text-white"
                                                    : "bg-stone-200 text-stone-500"
                                            }`}
                                        >
                                            <Check size={10} strokeWidth={3} />
                                        </div>
                                        <span
                                            className={
                                                passwordsMatch && watchedConfirmPassword
                                                    ? "text-stone-800 font-bold"
                                                    : "text-stone-500"
                                            }
                                        >
                                            Passwords match
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Final Submit Button */}
                            <button
                                id="submit-registration"
                                type="submit"
                                disabled={isSubmitting || !hasMinLength || !passwordsMatch}
                                className="w-full bg-green-700 text-white font-black uppercase tracking-widest text-xs px-4 py-3 rounded-lg shadow-xs hover:bg-green-600 transition-colors duration-100 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw size={15} className="animate-spin" />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    <span>Complete Registration</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Bottom Link: Already registered? */}
                    <div className="pt-4 border-t border-stone-200 text-center space-y-2">
                        <p className="text-xs text-stone-600">
                            Already registered?
                        </p>
                        <Link
                            to="/login"
                            className="w-full inline-block border border-stone-200 bg-white text-stone-800 font-black uppercase tracking-widest text-xs px-4 py-2.5 rounded-lg shadow-xs hover:bg-stone-50 transition-colors duration-100 ease-out cursor-pointer"
                        >
                            Sign In Here
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
