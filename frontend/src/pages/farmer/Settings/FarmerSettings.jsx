import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import useAuthStore from '/src/store/authContext';
import { useProfile } from '/src/hooks/useProfile';
import { useGetMaps } from '/src/hooks/useMaps';
import { 
    User, 
    MapPin, 
    Bell, 
    ShieldCheck, 
    Save, 
    Smartphone,
    UserCircle
} from 'lucide-react';

/**
 * Farmer Settings Page
 * Allows profile management (farm location, contact) and notification preferences.
 * Adheres to Design.MD: Stone neutrals, flat UI, square edges.
 */
const FarmerSettings = () => {
    const { user: authUser } = useAuthStore();
    const { profile, isLoading, updateProfile, isUpdating } = useProfile(authUser?.id);
    const { data: barangays } = useGetMaps();
    
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    // Sync form with profile data when it loads
    useEffect(() => {
        if (profile) {
            reset({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                phone_no: profile.phone_no || '',
                address: profile.address || '',
                barangay: profile.barangay || '',
                receive_sms: profile.receive_sms ?? true,
            });
        }
    }, [profile, reset]);

    const onSubmit = (data) => {
        updateProfile(data);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Loading your settings...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-10 bg-stone-50/50 min-h-full">
            
            {/* Header */}
            <div className="border-b border-stone-200 pb-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Preferences</p>
                <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter">Your Settings</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                
                {/* 1. Profile Information */}
                <section className="bg-white border border-stone-200 rounded-none overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex items-center gap-2">
                        <UserCircle size={16} className="text-stone-400" />
                        <h2 className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Farmer Profile</h2>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">First Name</label>
                            <input 
                                {...register("first_name")}
                                className="w-full h-10 px-3 bg-white border border-stone-200 rounded-none text-sm focus:outline-none focus:border-green-700"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">Last Name</label>
                            <input 
                                {...register("last_name")}
                                className="w-full h-10 px-3 bg-white border border-stone-200 rounded-none text-sm focus:outline-none focus:border-green-700"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">Mobile Number</label>
                            <div className="relative">
                                <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input 
                                    {...register("phone_no", { 
                                        pattern: {
                                            value: /^(?:\+639|639|09)\d{9}$/,
                                            message: "Enter a valid mobile number"
                                        }
                                    })}
                                    placeholder="09123456789"
                                    className={`w-full h-10 pl-10 pr-3 bg-white border rounded-none text-sm focus:outline-none focus:border-green-700 ${errors.phone_no ? 'border-red-500' : 'border-stone-200'}`}
                                />
                            </div>
                            {errors.phone_no && <p className="text-[9px] font-bold text-red-600 uppercase mt-1">{errors.phone_no.message}</p>}
                        </div>
                    </div>
                </section>

                {/* 2. Farm Location */}
                <section className="bg-white border border-stone-200 rounded-none overflow-hidden">
                    <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex items-center gap-2">
                        <MapPin size={16} className="text-stone-400" />
                        <h2 className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Farm Location</h2>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">Barangay</label>
                            <select 
                                {...register("barangay")}
                                className="w-full h-10 px-3 bg-white border border-stone-200 rounded-none text-sm focus:outline-none focus:border-green-700 appearance-none"
                            >
                                <option value="">Select Barangay</option>
                                {barangays?.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">Specific Address / Purok</label>
                            <input 
                                {...register("address")}
                                placeholder="Example: Purok 4, Near Barangay Hall"
                                className="w-full h-10 px-3 bg-white border border-stone-200 rounded-none text-sm focus:outline-none focus:border-green-700"
                            />
                        </div>
                    </div>
                </section>

                {/* 3. Notifications & Security */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="bg-white border border-stone-200 rounded-none overflow-hidden">
                        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex items-center gap-2">
                            <Bell size={16} className="text-stone-400" />
                            <h2 className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Notifications</h2>
                        </div>
                        <div className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-black text-stone-800 uppercase">SMS Updates</p>
                                <p className="text-[10px] font-medium text-stone-500">Receive permit status via SMS</p>
                            </div>
                            <input 
                                type="checkbox" 
                                {...register("receive_sms")}
                                className="checkbox checkbox-success rounded-none border-stone-300 [--chkbg:theme(colors.green.700)] [--chkfg:white]" 
                            />
                        </div>
                    </section>

                    <section className="bg-white border border-stone-200 rounded-none overflow-hidden opacity-50 cursor-not-allowed">
                        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50/50 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-stone-400" />
                            <h2 className="text-[10px] font-black text-stone-600 uppercase tracking-widest">Account Security</h2>
                        </div>
                        <div className="p-6">
                            <button disabled type="button" className="text-[10px] font-black uppercase tracking-widest text-stone-400 underline decoration-2 underline-offset-4">
                                Change Password
                            </button>
                        </div>
                    </section>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-4">
                    <button 
                        type="submit"
                        disabled={isUpdating}
                        className="bg-green-700 hover:bg-green-600 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isUpdating ? <span className="loading loading-spinner loading-xs"></span> : <Save size={16} />}
                        Save Changes
                    </button>
                </div>

            </form>
        </div>
    );
};

export default FarmerSettings;
