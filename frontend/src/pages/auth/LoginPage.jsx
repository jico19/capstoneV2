import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "/src/store/authContext";
import { Lock, User, ShieldCheck, ArrowRight, ClipboardCheck, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import AgriLogo from "/src/assets/sariaya-agri-logo.jpg";

/**
 * Login Page
 * Redesigned for Farmer-Friendly simplicity and high-signal minimalism.
 */
const LoginPage = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();
    const [apiError, setApiError] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = async (data) => {
        setApiError(null);
        try {
            await login(data);
            toast.success("Welcome Back", {
                description: "You have successfully logged in to FarmPass.",
            });
            navigate("/");
        } catch (err) {
            console.error("Login failed", err);
            setApiError("Incorrect username or password. Please try again.");
            toast.error("Log In Failed", {
                description: "Please check your details and try again.",
            });
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
            {/* ... left side branding ... */}
            <div className="hidden md:flex md:w-1/2 bg-green-50 p-12 flex-col justify-between relative overflow-hidden border-r border-gray-100">
                {/* Minimalist Decoration */}
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-green-100/50 rounded-none rotate-12"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                        <img src={AgriLogo} alt="Sariaya Logo" className="w-10 h-10 rounded-full object-cover border border-green-200" />
                        <span className="text-gray-900 font-black text-2xl tracking-tighter">
                            Farm<span className="text-green-600">Pass</span>
                        </span>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-5xl font-black text-gray-900 leading-[0.95] tracking-tight max-w-md">
                            Your Simple Way to <br />
                            <span className="text-green-600">Apply for Permits.</span>
                        </h2>
                        <p className="text-gray-600 max-w-sm text-lg font-medium leading-relaxed">
                            A faster, easier digital service for the farmers of Sariaya.
                        </p>
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-3 border border-green-100">
                                <ClipboardCheck className="text-green-600" size={24} />
                            </div>
                            <div>
                                <p className="text-gray-900 font-black text-sm uppercase tracking-tight leading-none">Quick Approval</p>
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Digital Processing</p>
                            </div>
                        </div>
                        <div className="w-px h-10 bg-green-200"></div>
                        <p className="text-gray-500 text-xs font-medium max-w-[180px]">
                            Approved by the Sariaya Municipal Agriculture Office.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-16">
                <div className="w-full max-w-sm space-y-10">

                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">Welcome Back</h1>
                        <p className="text-gray-500 font-medium">Please log in to see your permit records.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        {/* Global Error Banner */}
                        {apiError && (
                            <div className="bg-red-50 border-l-4 border-red-600 p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={18} />
                                <div>
                                    <p className="text-xs font-black text-red-700 uppercase tracking-widest leading-none mb-1">Log In Failed</p>
                                    <p className="text-xs font-medium text-red-600">{apiError}</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Username Field */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-900">Your Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    {/* Register the input field. Pass custom onChange into register options to prevent overriding react-hook-form's own onChange handler. */}
                                    <input
                                        type="text"
                                        {...register("username", {
                                            required: "Please enter your username.",
                                            onChange: () => apiError && setApiError(null)
                                        })}
                                        className={`w-full p-4 pl-12 bg-gray-50 border rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.username ? "border-red-600 text-red-900" : "border-gray-200 text-gray-900 focus:border-green-600"
                                            }`}
                                        placeholder="e.g. juan_farmer"
                                    />
                                </div>
                                {errors.username && (
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">{errors.username.message}</p>
                                )}
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-900">Your Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    {/* Register the input field. Pass custom onChange into register options to prevent overriding react-hook-form's own onChange handler. */}
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        {...register("password", {
                                            required: "Please enter your password.",
                                            onChange: () => apiError && setApiError(null)
                                        })}
                                        className={`w-full p-4 pl-12 pr-12 bg-gray-50 border rounded-none focus:ring-0 outline-none transition-colors text-sm font-medium ${errors.password ? "border-red-600 text-red-900" : "border-gray-200 text-gray-900 focus:border-green-600"
                                            }`}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-stone-900 transition-colors focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mt-1">{errors.password.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-none font-black text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    <span>Logging In...</span>
                                </>
                            ) : (
                                <>
                                    Log In to FarmPass <ArrowRight size={20} strokeWidth={3} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Registration Link */}
                    <div className="pt-8 border-t border-gray-100 text-center">
                        <p className="text-gray-500 text-xs font-medium">
                            Don't have an account yet?
                        </p>
                        <Link to="/register" className="inline-block mt-3 bg-gray-900 hover:bg-black text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors">
                            Create Farmer Account
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LoginPage;