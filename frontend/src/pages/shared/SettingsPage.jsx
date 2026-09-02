import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import useAuthStore from '../../store/authStore';
import { useGetMaps } from '../../hooks/useMaps';
import {
    Bell,
    Save,
    Smartphone,
    UserCircle,
    MapPin,
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';

/**
 * Universal Settings Page — Profile & Preferences only.
 * Agri-specific system configuration has moved to /agri/system-settings/.
 * Adheres to Design.MD: stone neutrals, flat UI, square edges.
 */
const SettingsPage = () => {
    const { user: authUser } = useAuthStore();
    const { profile, isLoading, updateProfile, isUpdating } = useProfile(authUser?.id);
    const { data: barangays } = useGetMaps();

    const { register, handleSubmit, reset, formState: { errors } } = useForm();

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
                <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Loading settings...</p>
            </div>
        );
    }

    const isFarmer = authUser?.role === 'Farmer';

    return (
        <div className="min-h-full bg-stone-50/50">

            {/* Page Header */}
            <div className="bg-white border-b border-stone-200 px-6 md:px-10 py-8">
                <div className="max-w-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Account</p>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-900 uppercase tracking-tighter leading-none">
                        Profile & Settings
                    </h1>
                    <p className="text-xs text-stone-500 font-medium mt-2">
                        Manage your personal information and notification preferences.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="px-6 md:px-10 py-8 space-y-5">

                    {/* Personal Info */}
                    <section className="bg-white border border-stone-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
                            <div className="p-1.5 bg-green-50 border border-green-100">
                                <UserCircle size={15} className="text-green-700" />
                            </div>
                            <h2 className="text-[10px] font-black text-stone-700 uppercase tracking-widest">Personal Info</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">First Name</label>
                                <input
                                    {...register("first_name")}
                                    className="w-full h-10 px-3 bg-white border border-stone-200 rounded-none text-sm focus:outline-none focus:border-green-700"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Last Name</label>
                                <input
                                    {...register("last_name")}
                                    className="w-full h-10 px-3 bg-white border border-stone-200 rounded-none text-sm focus:outline-none focus:border-green-700"
                                />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Mobile Number</label>
                                <div className="relative">
                                    <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        {...register("phone_no", {
                                            pattern: { value: /^(?:\+639|639|09)\d{9}$/, message: "Invalid format" }
                                        })}
                                        placeholder="09..."
                                        className={`w-full h-10 pl-10 pr-3 bg-white border rounded-none text-sm focus:outline-none focus:border-green-700 ${errors.phone_no ? 'border-red-400' : 'border-stone-200'}`}
                                    />
                                </div>
                                {errors.phone_no && <p className="text-[10px] text-red-500 font-medium">{errors.phone_no.message}</p>}
                            </div>
                        </div>
                    </section>

                    {/* Location — Farmers only */}
                    {isFarmer && (
                        <section className="bg-white border border-stone-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
                                <div className="p-1.5 bg-green-50 border border-green-100">
                                    <MapPin size={15} className="text-green-700" />
                                </div>
                                <h2 className="text-[10px] font-black text-stone-700 uppercase tracking-widest">Location</h2>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Barangay</label>
                                    <select
                                        {...register("barangay")}
                                        className="w-full h-10 px-3 bg-white border border-stone-200 rounded-none text-sm focus:outline-none focus:border-green-700 appearance-none"
                                    >
                                        <option value="">Select Barangay</option>
                                        {barangays?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Address Details</label>
                                    <input
                                        {...register("address")}
                                        className="w-full h-10 px-3 bg-white border border-stone-200 rounded-none text-sm focus:outline-none focus:border-green-700"
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Notifications — Farmers only */}
                    {isFarmer && (
                        <section className="bg-white border border-stone-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
                                <div className="p-1.5 bg-green-50 border border-green-100">
                                    <Bell size={15} className="text-green-700" />
                                </div>
                                <h2 className="text-[10px] font-black text-stone-700 uppercase tracking-widest">Notifications</h2>
                            </div>
                            <div className="px-6 py-5 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-stone-800 uppercase tracking-wide">SMS Updates</p>
                                    <p className="text-[10px] font-medium text-stone-400 mt-0.5">Receive status alerts via text message</p>
                                </div>
                                <input
                                    type="checkbox"
                                    {...register("receive_sms")}
                                    className="checkbox checkbox-success rounded-none border-stone-300"
                                />
                            </div>
                        </section>
                    )}

                    <div className="flex justify-end pb-10">
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="bg-green-700 hover:bg-green-600 text-white px-10 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors flex items-center gap-2 disabled:opacity-60"
                        >
                            {isUpdating
                                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                : <><Save size={13} /> Save Profile</>
                            }
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
