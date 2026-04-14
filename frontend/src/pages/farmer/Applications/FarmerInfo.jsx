import { useGetMaps } from "/src/hooks/useMaps";
import { MapPin, Navigation, PiggyBank, Calendar, ClipboardList } from "lucide-react";

const FarmerInfo = ({ register, errors, nextStep }) => {
    const { data: map, isLoading, isError } = useGetMaps();

    if (isLoading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Loading Map Data...</div>;
    if (isError) return <div className="p-10 text-center text-red-500 font-bold bg-red-50 rounded-xl">Failed to load barangay data.</div>;

    const inputClass = "w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all";
    const errorClass = "border-red-400 bg-red-50 focus:ring-red-500/20 focus:border-red-500";

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-2">1. Transport Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Barangay Select */}
                <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Origin Barangay</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <select
                            {...register('origin_barangay', { required: "Barangay is required" })}
                            defaultValue=""
                            className={`${inputClass} ${errors.origin_barangay ? errorClass : ''} appearance-none`}
                        >
                            <option value="" disabled>-- SELECT BARANGAY --</option>
                            {map?.map((data) => (
                                <option key={data.id} value={data.id}>{data.name}</option>
                            ))}
                        </select>
                    </div>
                    {errors.origin_barangay && <span className="text-xs text-red-500">{errors.origin_barangay.message}</span>}
                </div>

                {/* Destination */}
                <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destination</label>
                    <div className="relative">
                        <Navigation className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="e.g. Metro Manila"
                            className={`${inputClass} ${errors.destination ? errorClass : ''}`}
                            {...register('destination', { required: "Destination is required" })}
                        />
                    </div>
                    {errors.destination && <span className="text-xs text-red-500">{errors.destination.message}</span>}
                </div>

                {/* Number of Pigs */}
                <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Number of Heads</label>
                    <div className="relative">
                        <PiggyBank className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input
                            type="number"
                            min="1"
                            placeholder="0"
                            className={`${inputClass} ${errors.number_of_pigs ? errorClass : ''}`}
                            {...register('number_of_pigs', { required: "Quantity is required" })}
                        />
                    </div>
                </div>

                {/* Transport Date */}
                <div className="space-y-1 relative">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transport Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        <input
                            type="date"
                            className={`${inputClass} ${errors.transport_date ? errorClass : ''}`}
                            {...register('transport_date', { required: "Date is required" })}
                        />
                    </div>
                </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1 relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purpose of Transport</label>
                <div className="relative">
                    <ClipboardList className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <textarea
                        className={`${inputClass} min-h-[100px] ${errors.purpose ? errorClass : ''}`}
                        placeholder="e.g. For slaughter, For breeding..."
                        {...register('purpose', { required: "Purpose is required" })}
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button type="button" onClick={nextStep} className="btn btn-primary px-8">Next Step</button>
            </div>
        </div>
    );
};

export default FarmerInfo;