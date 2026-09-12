import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Activity, User, Phone, X, Check } from 'lucide-react';

/**
 * Reusable Survey Form Modal for Manual Submissions & Edits
 */
const SurveyFormModal = ({ survey, onClose, onSubmit, isSubmitting }) => {
    const { register, handleSubmit, formState: { errors } } = useForm({
        defaultValues: {
            farmer_name: survey?.farmer_name || '',
            contact_number: survey?.contact_number || '',
            survey_date: survey?.survey_date || new Date().toISOString().split('T')[0],
            inahin: survey?.inahin || 0,
            barako: survey?.barako || 0,
            fattener: survey?.fattener || 0,
            grower: survey?.grower || 0,
            starter: survey?.starter || 0,
            bulaw: survey?.bulaw || 0,
        }
    });

    const validateSurveyData = (data) => {
        const name = (data.farmer_name || '').trim();
        if (!name) {
            toast.error("Farmer / Owner name is required.");
            const el = document.getElementById('modal_farmer_name');
            if (el) el.focus();
            return false;
        }

        const total = (
            (parseInt(data.inahin, 10) || 0) +
            (parseInt(data.barako, 10) || 0) +
            (parseInt(data.fattener, 10) || 0) +
            (parseInt(data.grower, 10) || 0) +
            (parseInt(data.starter, 10) || 0) +
            (parseInt(data.bulaw, 10) || 0)
        );

        if (total <= 0) {
            toast.error("Please enter at least 1 pig count across the categories.");
            return false;
        }

        return true;
    };

    const handleFormSubmit = (data) => {
        if (!validateSurveyData(data)) return;
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xl border border-stone-200 shadow-2xl rounded-none overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <Activity size={18} className="text-stone-700" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                            Edit Hog Survey Record
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={isSubmitting} className="text-stone-400 hover:text-stone-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Farmer / Pig Owner Name */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                Farmer / Pig Owner Name <span className="text-red-600">*</span>
                            </label>
                            <div className="relative">
                                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    id="modal_farmer_name"
                                    type="text"
                                    placeholder="e.g. Juan Dela Cruz"
                                    {...register('farmer_name', {
                                        required: "Farmer / Owner name is required.",
                                        validate: (val) => (val && val.trim().length > 0) || "Farmer name cannot be blank."
                                    })}
                                    disabled={isSubmitting}
                                    className="w-full pl-9 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:font-normal placeholder:text-stone-400"
                                />
                            </div>
                            {errors.farmer_name && (
                                <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.farmer_name.message}</p>
                            )}
                        </div>

                        {/* Cellphone / Contact Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                                Cellphone / Contact Number
                            </label>
                            <div className="relative">
                                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    placeholder="e.g. 09123456789"
                                    {...register('contact_number')}
                                    disabled={isSubmitting}
                                    className="w-full pl-9 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold placeholder:font-normal placeholder:text-stone-400"
                                />
                            </div>
                        </div>

                        {/* Survey Date */}
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Survey Collection Date</label>
                            <input
                                type="date"
                                {...register('survey_date', { required: "Survey collection date is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                            {errors.survey_date && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{errors.survey_date.message}</p>}
                        </div>

                        {/* Inahin */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Inahin (Sow Count)</label>
                            <input
                                type="number"
                                min="0"
                                {...register('inahin', { required: "Inahin is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Barako */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Barako (Boar Count)</label>
                            <input
                                type="number"
                                min="0"
                                {...register('barako', { required: "Barako is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Fattener */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Fattener Count</label>
                            <input
                                type="number"
                                min="0"
                                {...register('fattener', { required: "Fattener is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Grower */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Grower Count</label>
                            <input
                                type="number"
                                min="0"
                                {...register('grower', { required: "Grower is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Starter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Starter Count</label>
                            <input
                                type="number"
                                min="0"
                                {...register('starter', { required: "Starter is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>

                        {/* Bulaw */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Bulaw Count</label>
                            <input
                                type="number"
                                min="0"
                                {...register('bulaw', { required: "Bulaw is required." })}
                                disabled={isSubmitting}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-none focus:outline-none focus:border-stone-500 text-xs font-semibold"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end pt-6 border-t border-stone-100 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold rounded-none transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-stone-100 text-white px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={14} /> Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SurveyFormModal;