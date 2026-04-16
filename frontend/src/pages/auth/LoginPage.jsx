import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import useAuthStore from "/src/store/authContext";
import { Lock, User, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const LoginPage = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        try {
            await login(data);
            toast.success("Login Successful", {
                description: "Welcome back to LivestockPass.",
            });
            navigate("/");
        } catch (err) {
            console.error("Login failed", err);
            toast.error("Login Failed", {
                description: "Please check your credentials and try again.",
            });
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">

            {/* Left Side: Branding/Context (Hidden on Mobile) */}
            <div className="hidden md:flex md:w-1/2 bg-gray-900 p-12 flex-col justify-between relative overflow-hidden">
                {/* Subtle Decorative Grid Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="bg-green-600 p-2">
                            <ShieldCheck className="text-white" size={24} />
                        </div>
                        <span className="text-white font-black text-xl uppercase tracking-tighter">
                            LivestockPass
                        </span>
                    </div>
                    <h2 className="text-5xl font-black text-white leading-tight uppercase tracking-tighter max-w-md">
                        Smart Swine Transport <br />
                        <span className="text-green-500 underline underline-offset-8 decoration-4">Management.</span>
                    </h2>
                    <p className="text-gray-400 mt-6 max-w-sm text-sm font-medium leading-relaxed">
                        Digitized permit issuance and geospatial mapping for the Sariaya Municipal Agriculture Office.
                    </p>
                </div>

                <div className="relative z-10">
                    <div className="flex gap-8">
                        <div className="space-y-1">
                            <p className="text-white font-bold text-lg">OCR</p>
                            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Document Verification</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-white font-bold text-lg">ML</p>
                            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Geospatial Mapping</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 md:p-16">
                <div className="w-full max-w-sm space-y-8">

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Login your account</h1>
                        <p className="text-gray-500 text-sm">Please enter your credentials to continue.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        {/* Username Field */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    {...register("username", { required: "Username is required." })}
                                    className={`input input-bordered w-full pl-12 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium ${errors.username ? "border-red-500" : ""
                                        }`}
                                    placeholder="admin_officer_01"
                                />
                            </div>
                            {errors.username && (
                                <p className="text-[10px] font-bold text-red-600 uppercase italic mt-1">{errors.username.message}</p>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="password"
                                    {...register("password", { required: "Password is required." })}
                                    className={`input input-bordered w-full pl-12 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium ${errors.password ? "border-red-500" : ""
                                        }`}
                                    placeholder="••••••••"
                                />
                            </div>
                            {errors.password && (
                                <p className="text-[10px] font-bold text-red-600 uppercase italic mt-1">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-primary w-full rounded-none normal-case font-black text-sm uppercase tracking-widest border-none h-14"
                        >
                            {isSubmitting ? (
                                <span className="loading loading-spinner"></span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Authenticate Account <ArrowRight size={18} />
                                </div>
                            )}
                        </button>
                    </form>

                    {/* Registration Link */}
                    <div className="pt-6 border-t border-gray-100 text-center">
                        <p className="text-gray-500 text-xs">
                            Don't have an account yet?{" "}
                            <Link to="/register" className="text-green-700 font-black uppercase hover:underline">
                                Create Farmer Account
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LoginPage;