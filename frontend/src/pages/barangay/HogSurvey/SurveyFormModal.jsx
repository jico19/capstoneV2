import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Activity, User, Phone, X, Check, PlusCircle, Calendar } from 'lucide-react';

/**
 * Mobile-First Survey Form Modal with Rapid Entry ("Save & Add Another"),
 * inputMode="numeric" for mobile keypad, and real-time total tallying.
 */
const SurveyFormModal = ({ survey, onClose, onSubmit, isSubmitting }) => {
    const isEdit = !!survey;
    const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm({
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

    const counts = useWatch({
        control,
        name: ['inahin', 'barako', 'fattener', 'grower', 'starter', 'bulaw']
    });

    const liveTotal = (
        (parseInt(counts?.[0], 10) || 0) +
        (parseInt(counts?.[1], 10) || 0) +
        (parseInt(counts?.[2], 10) || 0) +
        (parseInt(counts?.[3], 10) || 0) +
        (parseInt(counts?.[4], 10) || 0) +
        (parseInt(counts?.[5], 10) || 0)
    );

    const validateSurveyData = (data) => {
        const name = (data.farmer_name || '').trim();
        if (!name) {
            toast.error("Farmer / Owner name is required.");
            const el = document.getElementById('modal_farmer_name');
            if (el) el.focus();
            return false;
        }

        if (liveTotal <= 0) {
            toast.error("Please enter at least 1 pig count across the categories.");
            return false;
        }

        return true;
    };

    const handleFormSubmit = (data, keepOpen = false) => {
        if (!validateSurveyData(data)) return;
        onSubmit(data);
        if (keepOpen) {
            reset({
                farmer_name: '',
                contact_number: '',
                survey_date: data.survey_date,
                inahin: 0,
                barako: 0,
                fattener: 0,
                grower: 0,
                starter: 0,
                bulaw: 0,
            });
            setTimeout(() => {
                document.getElementById('modal_farmer_name')?.focus();
            }, 100);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-lg border-t sm:border border-stone-200 shadow-xl rounded-t-2xl sm:rounded-xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center px-4 sm:px-6 py-3.5 border-b border-stone-100 bg-stone-50/80 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                            <Activity size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-black text-stone-900 uppercase tracking-tight">
                                {isEdit ? 'Edit Hog Survey' : 'New Hog Survey Entry'}
                            </h3>
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                                Field Swine Inventory
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
                        aria-label="Close dialog"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit((data) => handleFormSubmit(data, false))}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
                >
                    {/* Farmer Identity */}
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-600 block">
                                Farmer / Swine Owner Name <span className="text-red-600">*</span>
                            </label>
                            <div className="relative">
                                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                <input
                                    id="modal_farmer_name"
                                    type="text"
                                    placeholder="e.g. Juan Dela Cruz"
                                    {...register('farmer_name', {
                                        required: "Farmer / Owner name is required.",
                                        validate: (val) => (val && val.trim().length > 0) || "Farmer name cannot be blank."
                                    })}
                                    disabled={isSubmitting}
                                    className="w-full h-11 pl-10 pr-3 bg-white border border-stone-300 rounded-lg shadow-2xs focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/20 text-sm font-medium text-stone-800 placeholder:text-stone-400"
                                />
                            </div>
                            {errors.farmer_name && (
                                <p className="text-[10px] font-bold text-red-600">{errors.farmer_name.message}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-600 block">
                                    Contact Number
                                </label>
                                <div className="relative">
                                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        placeholder="0912 345 6789"
                                        {...register('contact_number')}
                                        disabled={isSubmitting}
                                        className="w-full h-11 pl-10 pr-3 bg-white border border-stone-300 rounded-lg shadow-2xs focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/20 text-sm font-mono text-stone-800 placeholder:text-stone-400"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-stone-600 block">
                                    Survey Date <span className="text-red-600">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        {...register('survey_date', { required: "Date is required." })}
                                        disabled={isSubmitting}
                                        className="w-full h-11 pl-10 pr-3 bg-white border border-stone-300 rounded-lg shadow-2xs focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/20 text-sm font-bold text-stone-800"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Animal Count Grid with Real-time Total Header */}
                    <div className="space-y-2.5 pt-2 border-t border-stone-100">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">
                                Swine Classification Counts
                            </span>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-md">
                                <span className="text-[10px] font-bold text-green-700 uppercase">Live Total:</span>
                                <span className="text-xs font-mono font-black text-green-800">{liveTotal} pigs</span>
                            </div>
                        </div>

                        {/* 2-col on mobile, 3-col on sm */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {[
                                { key: 'inahin', label: 'Inahin (Sow)', desc: 'Breeding female' },
                                { key: 'barako', label: 'Barako (Boar)', desc: 'Breeding male' },
                                { key: 'starter', label: 'Starter / Biik', desc: 'Weaned piglet' },
                                { key: 'grower', label: 'Grower', desc: 'Growing stage' },
                                { key: 'fattener', label: 'Fattener', desc: 'Market weight' },
                                { key: 'bulaw', label: 'Bulaw', desc: 'Castrated male' },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="bg-stone-50 border border-stone-200/90 rounded-lg p-2.5 space-y-1">
                                    <label htmlFor={`survey-${key}`} className="block">
                                        <span className="text-[10px] font-black text-stone-800 uppercase block truncate leading-tight">
                                            {label}
                                        </span>
                                        <span className="text-[9px] text-stone-400 block truncate leading-tight">
                                            {desc}
                                        </span>
                                    </label>
                                    <input
                                        id={`survey-${key}`}
                                        type="number"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        min="0"
                                        placeholder="0"
                                        {...register(key, { valueAsNumber: true })}
                                        disabled={isSubmitting}
                                        className="w-full h-10 px-2 text-center bg-white border border-stone-200 rounded-md text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Actions: 44px+ touch targets */}
                    <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="h-11 px-4 border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors order-3 sm:order-1"
                        >
                            Cancel
                        </button>

                        {!isEdit && (
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleSubmit((data) => handleFormSubmit(data, true))}
                                className="h-11 px-4 border border-green-700 text-green-700 hover:bg-green-50 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 order-2"
                                title="Saves current survey and keeps form open for next farmer"
                            >
                                <PlusCircle size={15} /> Save & Add Next
                            </button>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || (isEdit && !isDirty)}
                            className="h-11 px-6 bg-green-700 hover:bg-green-600 active:scale-[0.98] disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 order-1 sm:order-3 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={16} /> {isEdit ? 'Save Changes' : 'Save Survey'}
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