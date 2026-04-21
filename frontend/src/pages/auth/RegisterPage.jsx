import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, UserPlus, ArrowRight, Mail, Lock, User, Phone } from "lucide-react";
import { useState } from "react";
import { api } from "/src/lib/api";



const RegisterPage = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm();
    const navigate = useNavigate();
    const [isOTP, setIsOTP] = useState(false)
    const [OTP, setOTP] = useState("")

    // Handle the final registration process
    const onRegister = async (data) => {
        console.log("Registering Farmer:", data);

        try {
            const res = await api.post('/user/', {
                username: data.username,
                password: data.password,
                phone_no: data.phone,
                first_name: data.first_name,
                last_name: data.last_name
            })
            console.log(res.data)
            navigate('/login')
        } catch(error) {
            console.log(error.response)
        }
    };  

    // Handle sending the OTP to the provided phone number
    const onSendOTP = async (data) => {
        try {
            const res = await api.post('/user/send_otp/', {
                phone_no: data.phone
            })
            alert(res.data.msg)
            console.log(res.data)
        } catch(error) {
            console.log(error)
        }
    }

    // Handle verification of the entered OTP
    const onVerifyOTP = async () => {
        const phone = register("phone").value || document.querySelector('input[name="phone"]')?.value; 
        // Better way using watch or getValues if available from useForm
        
        try {
            // We need the phone number to verify the specific OTP session
            const phone_no = register("phone").name ? document.querySelector('input[name="phone"]')?.value : "";
            
            const res = await api.post('/user/verify_otp/', {
                otp: OTP,
                phone_no: phone_no 
            })
            setIsOTP(true)
        } catch (error) {
            console.log(error.response)
            alert(error.response?.data?.error || "Invalid OTP")
        }
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">

            {/* Left Side: Branding and Benefits */}
            <div className="hidden md:flex md:w-5/12 bg-green-900 p-12 flex-col justify-between relative overflow-hidden">
                {/* Flat abstract decorative element */}
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

                    <form onSubmit={isOTP ? handleSubmit(onRegister) : handleSubmit(onSendOTP)} className="space-y-5">

                        {/* Name Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* First Name Field */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">First Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        {...register("first_name", { required: "First name is required" })}
                                        className="input input-bordered w-full pl-12 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium"
                                        placeholder="Juan"
                                    />
                                </div>
                                {errors.first_name && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.first_name.message}</p>}
                            </div>

                            {/* Last Name Field */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Last Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        {...register("last_name", { required: "Last name is required" })}
                                        className="input input-bordered w-full pl-12 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium"
                                        placeholder="Dela Cruz"
                                    />
                                </div>
                                {errors.last_name && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.last_name.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Username Field */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Username</label>
                                <input
                                    type="text"
                                    {...register("username", { required: "Username is required" })}
                                    className="input input-bordered w-full rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium"
                                    placeholder="juan_farmer"
                                />
                                {errors.username && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.username.message}</p>}
                            </div>
                            {/* Phone Number Field */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="tel"
                                        {...register("phone", { required: "Phone is required" })}
                                        className={`input input-bordered w-full pl-10 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-medium ${isOTP ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
                                        placeholder="09123456789"
                                        readOnly={isOTP}
                                    />
                                    {isOTP && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600">
                                            <ShieldCheck size={16} />
                                        </div>
                                    )}
                                </div>
                                {errors.phone && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.phone.message}</p>}
                            </div>
                        </div>

                        {/* Password Field */}
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
                            {errors.password && <p className="text-red-500 text-[10px] font-bold uppercase mt-1">{errors.password.message}</p>}
                        </div>

                        {/* OTP Verification Section (Conditional) */}
                        {!isOTP && (
                            <div className="pt-4 border-t border-gray-100 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Verification Code</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="6-digit code"
                                            className="input input-bordered flex-1 rounded-none border-gray-200 focus:outline-none focus:border-green-600 font-mono font-black tracking-widest text-sm"
                                            onChange={(e) => setOTP(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={onVerifyOTP}
                                            disabled={!OTP}
                                            className={`px-6 py-2 text-[10px] font-black uppercase tracking-wider rounded-none transition-colors border-none ${
                                                OTP 
                                                ? "bg-gray-900 text-white hover:bg-black" 
                                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            }`}
                                        >
                                            Verify
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-medium italic">Enter the code sent via SMS to verify your identity.</p>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full h-14 rounded-none px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors border-none ${
                                    isOTP 
                                    ? "bg-green-600 hover:bg-green-700 text-white" 
                                    : "bg-gray-900 hover:bg-black text-white"
                                }`}
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                    <div className="flex items-center justify-center gap-2">
                                        {isOTP ? "Complete Registration" : "Send Verification Code"}
                                        {isOTP ? <UserPlus size={18} /> : <ArrowRight size={18} />}
                                    </div>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer Links */}
                    <div className="pt-6 text-center border-t border-gray-100">
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">
                            Already have an account?{" "}
                            <Link to="/login" className="text-green-700 hover:underline">
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