import { useForm } from 'react-hook-form';
import { Users, X, Check } from 'lucide-react';

/**
 * Reusable Farmer Form Modal for Registration & Edit Details
 */
const FarmerFormModal = ({ user, onClose, onSubmit, isSubmitting, barangays }) => {
    const isEdit = !!user;
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            username: user?.username || '',
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            phone_no: user?.phone_no || '',
            address: user?.address || '',
            barangay: user?.barangay || '',
            receive_sms: user?.receive_sms !== undefined ? user.receive_sms : true,
            is_active: user?.is_active !== undefined ? user.is_active : true,
        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xl border border-stone-200 shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <Users size={18} className="text-stone-700" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                            {isEdit ? "Update Farmer Profile" : "Register Swine Owner"}
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Username */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Username / Account ID</label>
                            <input
                                type="text"
                                {...register('username', { required: "Username is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="john_doe"
                            />
                            {errors.username && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.username.message}</p>}
                        </div>

                        {/* Password (only if registering) */}
                        {!isEdit && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Account Password</label>
                                <input
                                    type="password"
                                    {...register('password', { required: "Password is required for new accounts." })}
                                    disabled={isSubmitting}
                                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                    placeholder="••••••••"
                                />
                                {errors.password && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.password.message}</p>}
                            </div>
                        )}
                        
                        {/* First Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">First Name</label>
                            <input
                                type="text"
                                {...register('first_name', { required: "First name is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="Juan"
                            />
                            {errors.first_name && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.first_name.message}</p>}
                        </div>

                        {/* Last Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Last Name</label>
                            <input
                                type="text"
                                {...register('last_name', { required: "Last name is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="Dela Cruz"
                            />
                            {errors.last_name && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.last_name.message}</p>}
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Contact Number</label>
                            <input
                                type="text"
                                {...register('phone_no', { 
                                    required: "Phone number is required.",
                                    pattern: {
                                        value: /^(?:\+639|639|09)\d{9}$/,
                                        message: "Please enter a valid mobile number (e.g. 09171234567)."
                                    }
                                })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="09171234567"
                            />
                            {errors.phone_no && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.phone_no.message}</p>}
                        </div>

                        {/* Barangay Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Barangay</label>
                            <select
                                {...register('barangay', { required: "Selecting a barangay is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold text-stone-800 cursor-pointer"
                            >
                                <option value="">Select Barangay</option>
                                {barangays.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            {errors.barangay && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.barangay.message}</p>}
                        </div>

                        {/* Address */}
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Complete Address</label>
                            <input
                                type="text"
                                {...register('address', { required: "Complete address is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:text-stone-300"
                                placeholder="Purok 4, Sariaya, Quezon"
                            />
                            {errors.address && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.address.message}</p>}
                        </div>

                        {/* Options */}
                        <div className="sm:col-span-2 flex flex-col gap-3 py-2 border-t border-stone-100 mt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...register('receive_sms')}
                                    disabled={isSubmitting}
                                    className="checkbox checkbox-success checkbox-sm rounded-none border-stone-300"
                                />
                                <span className="text-[10px] font-black uppercase tracking-wider text-stone-600">Send SMS notifications to this farmer</span>
                            </label>

                            {isEdit && (
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('is_active')}
                                        disabled={isSubmitting}
                                        className="checkbox checkbox-success checkbox-sm rounded-none border-stone-300"
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-600">Farmer account is active and authorized</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex gap-4 justify-end pt-6 border-t border-stone-100 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-6 py-3 border border-stone-200 hover:bg-stone-50 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-stone-100 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={14} /> {isEdit ? "Save Profile" : "Register Owner"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FarmerFormModal;