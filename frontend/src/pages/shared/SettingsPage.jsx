import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import useAuthStore from '../../store/authStore';
import { useGetMaps } from '../../hooks/useMaps';
import {
    Bell,
    Save,
    Smartphone,
    UserCircle,
    MapPin,
    SlidersHorizontal,
    Building2,
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import MunicipalSystemConfig from './MunicipalSystemConfig';

const AUTHORIZED_SYSTEM_ROLES = ['Agri', 'Admin'];

/**
 * Universal Settings Hub — Role-Gated & Consolidated
 * - Standard users (Farmers, Barangay Officials, OPVs, Inspectors): Personal Profile & Preferences.
 * - Authorized users (Agri, Admin): Personal Profile + Municipal System Configuration tabs.
 */
const SettingsPage = () => {
    const { user: authUser } = useAuthStore();
    const { profile, isLoading, updateProfile, isUpdating } = useProfile(authUser?.id);
    const { data: barangays } = useGetMaps();

    const [searchParams, setSearchParams] = useSearchParams();
    const canAccessSystemSettings = AUTHORIZED_SYSTEM_ROLES.includes(authUser?.role);

    // Default to 'profile' unless 'system' is explicitly selected by an authorized role
    const tabParam = searchParams.get('tab');
    const activeTab = canAccessSystemSettings && tabParam === 'system' ? 'system' : 'profile';

    const handleTabChange = (tabKey) => {
        setSearchParams({ tab: tabKey });
    };

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
                <div className="w-8 h-8 border-3 border-green-700 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-semibold text-stone-400 mt-3">Loading settings...</p>
            </div>
        );
    }

    const isFarmer = authUser?.role === 'Farmer';

    return (
        <div className="min-h-full bg-stone-50/40">

            {/* Page Header */}
            <div className="bg-white border-b border-stone-200 px-6 md:px-10 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                                {authUser?.role || 'User'} Portal
                            </span>
                            <span className="text-stone-300">•</span>
                            <span className="text-xs text-stone-500">
                                Settings & Administration
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
                            {canAccessSystemSettings ? "Settings Hub" : "Profile & Settings"}
                        </h1>
                        <p className="text-xs text-stone-600 font-normal mt-1 max-w-xl">
                            {canAccessSystemSettings
                                ? "Manage personal account credentials and calibrate municipal regulatory permit configurations."
                                : "Manage your personal contact information, location, and alert preferences."}
                        </p>
                    </div>

                    {/* Role Authority Badge */}
                    {canAccessSystemSettings && (
                        <div className="self-start sm:self-center flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                            <Building2 size={14} className="text-green-700" />
                            Authorized Municipal Officer
                        </div>
                    )}
                </div>

                {/* Role-Gated Segmented Tab Navigation */}
                {canAccessSystemSettings && (
                    <div className="flex items-center gap-2 mt-6 border-b border-stone-200 -mb-6">
                        <button
                            type="button"
                            onClick={() => handleTabChange('profile')}
                            className={`btn-tactile pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                                activeTab === 'profile'
                                    ? 'border-green-700 text-green-800 font-bold'
                                    : 'border-transparent text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            <UserCircle size={15} />
                            Personal Profile
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabChange('system')}
                            className={`btn-tactile pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                                activeTab === 'system'
                                    ? 'border-green-700 text-green-800 font-bold'
                                    : 'border-transparent text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            <SlidersHorizontal size={15} />
                            Municipal System Configuration
                        </button>
                    </div>
                )}
            </div>

            {/* Page Content Body */}
            <div className="px-6 md:px-10 py-8">
                {activeTab === 'system' && canAccessSystemSettings ? (
                    /* TAB 2: Municipal Configuration (Authorized Only) */
                    <MunicipalSystemConfig />
                ) : (
                    /* TAB 1: Personal Profile Form (All Users) */
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Personal Info Card */}
                        <section className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
                            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
                                <div className="p-1.5 bg-green-50 border border-green-200 rounded-lg">
                                    <UserCircle size={16} className="text-green-700" />
                                </div>
                                <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wide">Personal Details</h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label htmlFor="first-name-input" className="block text-xs font-semibold text-stone-600">First Name</label>
                                    <input
                                        id="first-name-input"
                                        {...register("first_name")}
                                        className="w-full h-10 px-3 bg-white border border-stone-200 rounded-lg shadow-2xs text-sm text-stone-900 focus:outline-none focus:border-green-700"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="last-name-input" className="block text-xs font-semibold text-stone-600">Last Name</label>
                                    <input
                                        id="last-name-input"
                                        {...register("last_name")}
                                        className="w-full h-10 px-3 bg-white border border-stone-200 rounded-lg shadow-2xs text-sm text-stone-900 focus:outline-none focus:border-green-700"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label htmlFor="phone-no-input" className="block text-xs font-semibold text-stone-600">Mobile Contact Number</label>
                                    <div className="relative">
                                        <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                        <input
                                            id="phone-no-input"
                                            {...register("phone_no", {
                                                pattern: { value: /^(?:\+639|639|09)\d{9}$/, message: "Invalid Philippine mobile number format (e.g. 09171234567)" }
                                            })}
                                            placeholder="09..."
                                            className={`w-full h-10 pl-10 pr-3 bg-white border rounded-lg shadow-2xs text-sm text-stone-900 focus:outline-none focus:border-green-700 font-mono ${errors.phone_no ? 'border-red-400' : 'border-stone-200'}`}
                                        />
                                    </div>
                                    {errors.phone_no && <p className="text-xs text-red-500 font-medium">{errors.phone_no.message}</p>}
                                </div>
                            </div>
                        </section>

                        {/* Location: Farmers only */}
                        {isFarmer && (
                            <section className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
                                    <div className="p-1.5 bg-green-50 border border-green-200 rounded-lg">
                                        <MapPin size={16} className="text-green-700" />
                                    </div>
                                    <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wide">Farm Location Details</h2>
                                </div>
                                <div className="p-6 space-y-5">
                                    <div className="space-y-1.5">
                                        <label htmlFor="barangay-select" className="block text-xs font-semibold text-stone-600">Registered Barangay</label>
                                        <select
                                            id="barangay-select"
                                            {...register("barangay")}
                                            className="w-full h-10 px-3 bg-white border border-stone-200 rounded-lg shadow-2xs text-sm text-stone-800 focus:outline-none focus:border-green-700 appearance-none"
                                        >
                                            <option value="">Select Barangay</option>
                                            {barangays?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="address-input" className="block text-xs font-semibold text-stone-600">Sitio / Street / Landmark</label>
                                        <input
                                            id="address-input"
                                            {...register("address")}
                                            className="w-full h-10 px-3 bg-white border border-stone-200 rounded-lg shadow-2xs text-sm text-stone-900 focus:outline-none focus:border-green-700"
                                        />
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Notifications: Farmers only */}
                        {isFarmer && (
                            <section className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
                                    <div className="p-1.5 bg-green-50 border border-green-200 rounded-lg">
                                        <Bell size={16} className="text-green-700" />
                                    </div>
                                    <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wide">SMS Broadcast Notifications</h2>
                                </div>
                                <div className="px-6 py-5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-stone-800">SMS Status Alerts</p>
                                        <p className="text-xs text-stone-500 mt-0.5">Receive instant SMS alerts when permits are reviewed, approved, or verified</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        {...register("receive_sms")}
                                        className="checkbox checkbox-success rounded-md border-stone-300"
                                    />
                                </div>
                            </section>
                        )}

                        {/* Save Button */}
                        <div className="flex justify-end pb-8">
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="btn-tactile bg-green-700 hover:bg-green-600 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                            >
                                {isUpdating ? (
                                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving Profile...</>
                                ) : (
                                    <><Save size={14} /> Save Profile Settings</>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;
