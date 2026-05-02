import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, UserPlus, ArrowRight, Lock, User, Phone, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { api } from "/src/lib/api";
import { toast } from "sonner";

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
    const [isOTPVerified, setIsOTPVerified] = useState(false)
    const [otpCode, setOtpCode] = useState("")
    const [isSendingOTP, setIsSendingOTP] = useState(false)

    // Handle the final registration process
    const onRegister = async (data) => {
        try {
            await api.post('/user/', {
                username: data.username,
                password: data.password,
                phone_no: data.phone,
                first_name: data.first_name,
                last_name: data.last_name
            })
            toast.success("Account Created", {
                description: "You can now sign in with your new credentials."
            });
            navigate('/login')
        } catch(error) {
            console.error(error.response)
            toast.error("Registration Failed", {
                description: error.response?.data?.error || "Could not create your account."
            });
        }
    };  

    // Handle sending the OTP
    const onSendOTP = async (data) => {
        setIsSendingOTP(true);
        try {
            await api.post('/user/send_otp/', {
                phone_no: data.phone
            })
            toast.info("Verification Code Sent", {
                description: "Please check your phone for the 6-digit code."
            });
        } catch(error) {
            console.error(error)
            toast.error("Failed to Send Code", {
                description: "Please check your phone number and try again."
            });
        } finally {
            setIsSendingOTP(false);
        }
    }

    // Handle verification of the OTP
    const onVerifyOTP = async () => {
        const phone_no = getValues("phone");
        if (!otpCode) return;

        try {
            await api.post('/user/verify_otp/', {
                otp: otpCode,
                phone_no: phone_no 
            })
            setIsOTPVerified(true)
            toast.success("Identity Verified", {
                description: "You can now complete your registration."
            });
        } catch (error) {
            console.error(error.response)
            toast.error("Invalid Code", {
                description: "The verification code you entered is incorrect."
            });
        }
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">

            {/* Left Side: Branding and Benefits (Friendly & Green) */}
            <div className="hidden md:flex md:w-5/12 bg-green-600 p-12 flex-col justify-between relative overflow-hidden border-r border-gray-100">
                {/* Minimalist Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-none -mr-32 -mt-32 rotate-45"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="bg-white p-2.5">
                            <ShieldCheck className="text-green-600" size={28} strokeWidth={2.5} />
                        </div>
                        <span className="text-white font-black text-2xl tracking-tighter">
                            Livestock<span className="text-green-100">Pass</span>
                        </span>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
                            Start Applying for <br />
                            <span className="text-green-200">Permits Today.</span>
                        </h2>
                        <p className="text-green-50 text-lg font-medium">It only takes a few minutes to join.</p>
                    </div>

                    <ul className="mt-16 space-y-8">
                        <li className="flex gap-5">
                            <div className="h-8 w-8 rounded-none bg-white/20 border border-white/30 flex-shrink-0 flex items-center justify-center font-black text-white text-sm italic">01</div>
                            <div>
                                <p className="text-white font-black text-sm uppercase tracking-tight">Save Your Time</p>
                                <p className="text-green-50 text-xs mt-1 font-medium leading-relaxed">Apply for permits from your farm, no need to travel to the office.</p>
                            </div>
                        </li>
                        <li className="flex gap-5">
                            <div className="h-8 w-8 rounded-none bg-white/20 border border-white/30 flex-shrink-0 flex items-center justify-center font-black text-white text-sm italic">02</div>
                            <div>
                                <p className="text-white font-black text-sm uppercase tracking-tight">Fast Checks</p>
                                <p className="text-green-50 text-xs mt-1 font-medium leading-relaxed">Our system checks your documents automatically for speed.</p>
                            </div>
                        </li>
                        <li className="flex gap-5">
                            <div className="h-8 w-8 rounded-none bg-white/20 border border-white/30 flex-shrink-0 flex items-center justify-center font-black text-white text-sm italic">03</div>
                            <div>
                                <p className="text-white font-black text-sm uppercase tracking-tight">Instant Updates</p>
                                <p className="text-green-50 text-xs mt-1 font-medium leading-relaxed">Get text messages when your permit is ready or needs a fix.</p>
                            </div>
                        </li>
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
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-1">Getting Started</p>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">Create Account</h1>
                        <p className="text-gray-500 font-medium">Join our digital network to start your applications.</p>
                    </div>

                    <form onSubmit={isOTPVerified ? handleSubmit(onRegister) : handleSubmit(onSendOTP)} className="space-y-8">

                        <div className="space-y-6">
                            {/* Name Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-900">First Name</label>
                                    <input
                                        type="text"
                                        {...register("first_name", { required: "Required" })}
                                        className={`w-full p-4 bg-gray-50 border rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.first_name ? 'border-red-600' : 'border-gray-200 focus:border-green-600'}`}
                                        placeholder="Juan"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-900">Last Name</label>
                                    <input
                                        type="text"
                                        {...register("last_name", { required: "Required" })}
                                        className={`w-full p-4 bg-gray-50 border rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.last_name ? 'border-red-600' : 'border-gray-200 focus:border-green-600'}`}
                                        placeholder="Dela Cruz"
                                    />
                                </div>
                            </div>

                            {/* Username & Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-900">Username</label>
                                    <input
                                        type="text"
                                        {...register("username", { required: "Required" })}
                                        className={`w-full p-4 bg-gray-50 border rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.username ? 'border-red-600' : 'border-gray-200 focus:border-green-600'}`}
                                        placeholder="juan_farmer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-900">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="tel"
                                            {...register("phone", { required: "Required" })}
                                            className={`w-full p-4 pl-12 rounded-none border focus:ring-0 outline-none transition-colors text-sm font-medium ${isOTPVerified ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 focus:border-green-600'}`}
                                            placeholder="09123456789"
                                            readOnly={isOTPVerified}
                                        />
                                        {isOTPVerified && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600">
                                                <CheckCircle2 size={18} strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-900">Choose Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        {...register("password", { required: "Required" })}
                                        className={`w-full p-4 pl-12 bg-gray-50 border rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.password ? 'border-red-600' : 'border-gray-200 focus:border-green-600'}`}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* OTP Verification Section (Conditional) */}
                        {!isOTPVerified && (
                            <div className="pt-6 border-t border-gray-100 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-900">Enter Verification Code</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="text"
                                            placeholder="6-DIGIT CODE"
                                            className="w-full p-4 bg-white border border-gray-200 rounded-none focus:ring-0 focus:border-green-600 outline-none transition-colors font-mono font-black tracking-[0.3em] text-center text-lg"
                                            onChange={(e) => setOtpCode(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={onVerifyOTP}
                                            disabled={!otpCode || isSendingOTP}
                                            className={`px-8 font-black uppercase tracking-widest text-xs rounded-none transition-colors border-none ${
                                                otpCode 
                                                ? "bg-gray-900 text-white hover:bg-black" 
                                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            }`}
                                        >
                                            Verify
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Sent via SMS to your number.</p>
                                </div>
                            </div>
                        )}

                        {/* Main Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting || isSendingOTP}
                                className={`w-full py-5 rounded-none font-black text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-3 disabled:opacity-50 ${
                                    isOTPVerified 
                                    ? "bg-green-600 hover:bg-green-700 text-white" 
                                    : "bg-gray-900 hover:bg-black text-white"
                                }`}
                            >
                                {isSubmitting || isSendingOTP ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                ) : (
                                    <>
                                        {isOTPVerified ? "Complete Registration" : "Send Code to My Phone"}
                                        {isOTPVerified ? <UserPlus size={20} strokeWidth={3} /> : <ArrowRight size={20} strokeWidth={3} />}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer Links */}
                    <div className="pt-8 text-center border-t border-gray-100">
                        <p className="text-gray-500 text-xs font-medium">
                            Already have an account?
                        </p>
                        <Link to="/login" className="inline-block mt-3 border border-gray-200 hover:bg-gray-50 text-gray-900 px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors">
                            Sign In Instead
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RegisterPage;