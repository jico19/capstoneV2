import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, UserPlus, ArrowRight, Mail, Lock, User, Phone } from "lucide-react";

const RegisterPage = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        // I handle the setup, you just build the UI
        console.log("Registering Farmer:", data);
        // await registerFarmer(data)
        // navigate('/login')
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">

            {/* Left Side: Farmer Benefits (Dark) */}
            <div className="hidden md:flex md:w-5/12 bg-green-900 p-12 flex-col justify-between relative overflow-hidden">
                {/* Flat abstract pattern */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-800 -mr-32 -mt-32 rotate-45 opacity-50"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-12">
                        <div className="bg-white p-2">
                            <ShieldCheck className="text-green-900" size={24} />
                        </div>
                        <span className="text-white font-black text-xl uppercase tracking-tighter">
                            LivestockPass
                        </span>
                    </div>

                    <h2 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter">
                        Join the Digital <br />
                        <span className="text-green-400">Agricultural</span> <br />
                        Network.
                    </h2>

                    <ul className="mt-12 space-y-6">
                        <li className="flex gap-4">
                            <div className="h-6 w-6 rounded-none bg-green-400 flex-shrink-0 flex items-center justify-center font-bold text-green-900 text-xs">1</div>
                            <p className="text-green-100 text-sm font-medium">Fast-track permit applications without traveling to the Munisipyo.</p>
                        </li>
                        <li className="flex gap-4">
                            <div className="h-6 w-6 rounded-none bg-green-400 flex-shrink-0 flex items-center justify-center font-bold text-green-900 text-xs">2</div>
                            <p className="text-green-100 text-sm font-medium">Automatic document verification via advanced OCR technology.</p>
                        </li>
                        <li className="flex gap-4">
                            <div className="h-6 w-6 rounded-none bg-green-400 flex-shrink-0 flex items-center justify-center font-bold text-green-900 text-xs">3</div>
                            <p className="text-green-100 text-sm font-medium">Real-time SMS updates on your transport permit status.</p>
                        </li>
                    </ul>
                </div>

                <div className="relative z-10 border-t border-green-800 pt-8">
                    <p className="text-green-400 text-[10px] font-black uppercase tracking-[0.2em]">Sariaya Municipal Agriculture Office</p>
                </div>
            </div>

            {/* Right Side: Registration Form */}
            <div className="flex-1 flex items-center justify-center p-8 md:p-16 bg-white overflow-y-auto">
                <div className="w-full max-w-md space-y-8 py-12">

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Farmer Registration</h1>
                        <p className="text-gray-500 text-sm font-medium">Create your account to start applying for transport permits.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                        {/* Full Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    {...register("fullName", { required: "Full name is required" })}
                                    className="input input-bordered w-full pl-12 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium"
                                    placeholder="Juan Dela Cruz"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Username */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Username</label>
                                <input
                                    type="text"
                                    {...register("username", { required: "Username is required" })}
                                    className="input input-bordered w-full rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium"
                                    placeholder="juan_farmer"
                                />
                            </div>
                            {/* Phone */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="tel"
                                        {...register("phone", { required: "Phone is required" })}
                                        className="input input-bordered w-full pl-10 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium"
                                        placeholder="09123456789"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="email"
                                    {...register("email", { required: "Email is required" })}
                                    className="input input-bordered w-full pl-12 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium"
                                    placeholder="juan@email.com"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Create Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="password"
                                    {...register("password", { required: "Password is required" })}
                                    className="input input-bordered w-full pl-12 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="btn btn-primary w-full rounded-none normal-case font-black text-sm uppercase tracking-widest border-none h-14"
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner"></span>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        Register Account <UserPlus size={18} />
                                    </div>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="pt-6 text-center">
                        <p className="text-gray-500 text-xs font-medium">
                            Already have an account?{" "}
                            <Link to="/login" className="text-green-700 font-black uppercase hover:underline">
                                Sign In Instead
                            </Link>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RegisterPage;