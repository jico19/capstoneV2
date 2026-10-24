import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import {
    ArrowLeft,
    Lock,
    User,
    AlertCircle,
    Eye,
    EyeOff,
    RefreshCw,
    X,
    HelpCircle,
    Building2,
    Clock,
    MapPin
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import AgriLogo from "../../assets/sariaya-agri-logo.jpg";

/**
 * Login Page
 * Strictly aligned with FarmPass Design System Version 2.1 (Design.MD):
 * - 3-tier radius: rounded-xl cards, rounded-lg controls/inputs, rounded-md badges
 * - Micro-shadows: shadow-xs, shadow-2xs
 * - Brand green: green-700 (#15803d) and hover green-600 (#16a34a)
 * - Warm stone neutrals
 */
const LoginPage = () => {
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            username: "",
            password: "",
        },
    });

    const [usernameVal, setUsernameVal] = useState("");
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();
    const [apiError, setApiError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [throttleWait, setThrottleWait] = useState(0);

    // Countdown timer for rate limiting/throttling
    useEffect(() => {
        if (throttleWait <= 0) return;
        const interval = setInterval(() => {
            setThrottleWait((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [throttleWait]);

    const onSubmit = async (data) => {
        if (throttleWait > 0) return;
        setApiError(null);
        try {
            await login(data);
            toast.success("Welcome Back", {
                description: "You have successfully logged in to FarmPass.",
            });
            navigate("/");
        } catch (err) {
            console.error("Login failed", err);
            if (err.response?.status === 429) {
                const wait = err.response.data?.wait || 60;
                setThrottleWait(Math.ceil(wait));
                const throttleMsg = `Too many incorrect attempts. Please wait ${Math.ceil(wait)} seconds.`;
                setApiError(throttleMsg);
                toast.error("Login Paused", {
                    description: throttleMsg,
                });
            } else {
                const errDetail = err.response?.data?.detail || err.response?.data?.error || "Incorrect username or password. Please try again.";
                setApiError(errDetail);
                toast.error("Log In Failed", {
                    description: errDetail,
                });
            }
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
            {/* Left Side: Brand Panel */}
            <div className="hidden md:flex md:w-5/12 bg-green-700 p-12 flex-col justify-between text-white border-r border-stone-200">
                <div>
                    <Link
                        to="/"
                        className="flex items-center gap-3 mb-10 hover:opacity-90 transition-opacity w-fit"
                        title="Return to FarmPass Landing Page"
                    >
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
                                Municipality of Sariaya
                            </p>
                        </div>
                    </Link>

                    <div className="space-y-4 max-w-sm">
                        <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                            Livestock Transport <br />
                            Permit Portal
                        </h2>
                        <p className="text-green-50 text-sm font-normal leading-relaxed">
                            Sign in to submit hog shipping permits, track OPV veterinary reviews, and manage municipal checkpoint inspections.
                        </p>
                    </div>

                    {/* Operational Details */}
                    <div className="mt-12 space-y-3 max-w-sm text-xs">
                        <div className="flex gap-3 items-start p-3 bg-white/10 border border-white/20 rounded-lg">
                            <Building2 className="text-green-100 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="font-bold text-white uppercase tracking-tight text-[11px]">Municipal Agriculture Office</p>
                                <p className="text-green-100 text-xs mt-0.5">Livestock & Regulatory Services Division</p>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start p-3 bg-white/10 border border-white/20 rounded-lg">
                            <MapPin className="text-green-100 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="font-bold text-white uppercase tracking-tight text-[11px]">Office Location</p>
                                <p className="text-green-100 text-xs mt-0.5">Ground Floor, Municipal Hall, Sariaya, Quezon</p>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start p-3 bg-white/10 border border-white/20 rounded-lg">
                            <Clock className="text-green-100 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <p className="font-bold text-white uppercase tracking-tight text-[11px]">Service Hours</p>
                                <p className="text-green-100 text-xs mt-0.5">Monday to Friday, 8:00 AM to 5:00 PM</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/20 pt-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-green-100">
                    <span>Sariaya Municipal Agriculture Office</span>
                    <span className="text-green-200">Province of Quezon</span>
                </div>
            </div>

            {/* Right Side: Interactive Login Card */}
            <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 md:p-12 overflow-y-auto">
                <div className="w-full max-w-md my-6 space-y-3">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-stone-500 hover:text-green-700 text-xs font-black uppercase tracking-wider transition-colors w-fit group"
                    >
                        <ArrowLeft size={14} strokeWidth={2.5} className="transition-transform group-hover:-translate-x-1" />
                        <span>Back to Landing Page</span>
                    </Link>

                    <div className="w-full bg-white border border-stone-200 rounded-xl shadow-xs p-6 sm:p-8 md:p-10 space-y-6">

                        {/* Mobile Header Branding (Shown on mobile screens only) */}
                        <div className="flex md:hidden items-center justify-between pb-4 border-b border-stone-200">
                            <Link to="/" className="flex items-center gap-2.5">
                                <img
                                    src={AgriLogo}
                                    alt="Sariaya Agriculture Logo"
                                    className="w-8 h-8 rounded-full object-cover border border-stone-200"
                                />
                                <span className="font-black text-lg text-stone-800 tracking-tighter uppercase">
                                    Farm<span className="text-green-700">Pass</span>
                                </span>
                            </Link>
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">
                                Sariaya Portal
                            </span>
                        </div>

                    {/* Card Title & Description */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-stone-800 uppercase tracking-tight">
                            Sign In
                        </h1>
                        <p className="text-stone-600 text-xs font-normal">
                            Access your farmer portal and livestock permit records.
                        </p>
                    </div>

                    {/* Throttle Alert Banner */}
                    {throttleWait > 0 && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 border border-stone-200 p-3.5 flex items-start gap-3 rounded-lg">
                            <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
                            <div className="text-xs text-stone-800 space-y-0.5">
                                <p className="font-bold text-amber-700 uppercase tracking-wide text-[11px]">Sign In Temporarily Paused</p>
                                <p className="text-stone-600">
                                    Too many incorrect attempts. Please wait{" "}
                                    <span className="font-mono font-bold text-stone-800">{throttleWait}s</span> before retrying.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Global Error Banner */}
                    {apiError && throttleWait <= 0 && (
                        <div className="bg-red-50 border-l-4 border-red-600 border border-stone-200 p-3.5 flex items-start gap-3 rounded-lg">
                            <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={16} />
                            <div className="flex-1 text-xs">
                                <p className="font-bold text-red-700 uppercase tracking-wide text-[11px] mb-0.5">Authentication Failed</p>
                                <p className="text-stone-600 leading-relaxed">{apiError}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setApiError(null)}
                                className="text-stone-400 hover:text-stone-800 p-0.5 cursor-pointer"
                                title="Dismiss error"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {/* Username Field */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                <input
                                    type="text"
                                    autoComplete="username"
                                    disabled={throttleWait > 0}
                                    {...register("username", {
                                        required: "Please enter your username",
                                        onChange: (e) => {
                                            setUsernameVal(e.target.value);
                                            if (apiError) setApiError(null);
                                        },
                                    })}
                                    className={`w-full h-9 px-3 pl-9 pr-8 bg-white border outline-none text-sm text-stone-800 placeholder:text-stone-400 disabled:bg-stone-100 disabled:cursor-not-allowed rounded-lg shadow-2xs ${
                                        errors.username
                                            ? "border-red-600 bg-red-50"
                                            : "border-stone-200 focus:border-green-700"
                                    }`}
                                    placeholder="Enter username"
                                />
                                {usernameVal && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue("username", "");
                                            setUsernameVal("");
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800 p-0.5 cursor-pointer"
                                        title="Clear username"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            {errors.username && (
                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">{errors.username.message}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-stone-600">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    disabled={throttleWait > 0}
                                    {...register("password", {
                                        required: "Please enter your password",
                                        onChange: () => apiError && setApiError(null),
                                    })}
                                    className={`w-full h-9 px-3 pl-9 pr-8 bg-white border outline-none text-sm text-stone-800 placeholder:text-stone-400 disabled:bg-stone-100 disabled:cursor-not-allowed rounded-lg shadow-2xs ${
                                        errors.password
                                            ? "border-red-600 bg-red-50"
                                            : "border-stone-200 focus:border-green-700"
                                    }`}
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button"
                                    disabled={throttleWait > 0}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-800 p-0.5 focus:outline-none disabled:opacity-50 cursor-pointer"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || throttleWait > 0}
                            className="w-full bg-green-700 text-white font-black uppercase tracking-widest text-xs px-4 py-3 rounded-lg shadow-xs hover:bg-green-600 transition-colors duration-100 ease-out flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {throttleWait > 0 ? (
                                <span>Try again in {throttleWait}s</span>
                            ) : isSubmitting ? (
                                <>
                                    <RefreshCw size={15} className="animate-spin" />
                                    <span>Signing In...</span>
                                </>
                            ) : (
                                <span>Sign In</span>
                            )}
                        </button>
                    </form>

                    {/* Support Advisory Tip */}
                    <div className="bg-stone-50 border border-stone-200 p-3 flex items-start gap-2.5 text-xs text-stone-600 rounded-lg">
                        <HelpCircle size={15} className="text-stone-500 mt-0.5 flex-shrink-0" />
                        <p>
                            For password reset or account recovery, please visit the Municipal Agriculture Office in Sariaya with a valid ID.
                        </p>
                    </div>

                    {/* Bottom Link: Register */}
                    <div className="pt-4 border-t border-stone-200 text-center space-y-2">
                        <p className="text-xs text-stone-600">
                            New farmer in Sariaya?
                        </p>
                        <Link
                            to="/register"
                            className="w-full inline-block border border-stone-200 bg-white text-stone-800 font-black uppercase tracking-widest text-xs px-4 py-2.5 rounded-lg shadow-xs hover:bg-stone-50 transition-colors duration-100 ease-out cursor-pointer"
                        >
                            Register for an Account
                        </Link>
                    </div>

                </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
