import { useGetMaps } from "/src/hooks/useMaps";
import { MapPin, Navigation, PiggyBank, Calendar, ClipboardList } from "lucide-react";

const FarmerInfo = ({ register, errors, nextStep }) => {
    const { data: map, isLoading, isError } = useGetMaps();

    if (isLoading) return <div className="p-10 text-center font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Map Data...</div>;
    if (isError) return <div className="p-10 text-center text-red-600 font-bold bg-red-50 uppercase tracking-widest text-xs">Failed to load barangay data.</div>;

    const inputClass = "w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-none focus:ring-0 focus:border-green-600 outline-none transition-colors text-sm font-medium text-gray-900";
    const errorClass = "border-red-600 bg-red-50 focus:border-red-600 text-red-900";

    return (
        <div className="space-y-8">
            <div className="border-b border-gray-100 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 1</p>
                <h2 className="text-xl font-black text-gray-900 uppercase">Transport Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Barangay Select */}
                <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Origin Barangay</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <select
                            {...register('origin_barangay', { required: "Barangay is required" })}
                            defaultValue=""
                            className={`${inputClass} ${errors.origin_barangay ? errorClass : ''} appearance-none cursor-pointer`}
                        >
                            <option value="" disabled>-- SELECT BARANGAY --</option>
                            {map?.map((data) => (
                                <option key={data.id} value={data.id}>{data.name}</option>
                            ))}
                        </select>
                    </div>
                    {errors.origin_barangay && <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">{errors.origin_barangay.message}</span>}
                </div>

                {/* Destination */}
                <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Destination</label>
                    <div className="relative">
                        <Navigation className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="E.G. METRO MANILA"
                            className={`${inputClass} ${errors.destination ? errorClass : ''} placeholder:uppercase`}
                            {...register('destination', { required: "Destination is required" })}
                        />
                    </div>
                    {errors.destination && <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">{errors.destination.message}</span>}
                </div>

                {/* Number of Pigs */}
                <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Number of Heads</label>
                    <div className="relative">
                        <PiggyBank className="absolute left-3 top-3.5 text-gray-400" size={18} />
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
                <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Transport Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input
                            type="date"
                            className={`${inputClass} ${errors.transport_date ? errorClass : ''}`}
                            {...register('transport_date', { required: "Date is required" })}
                        />
                    </div>
                </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Purpose of Transport</label>
                <div className="relative">
                    <ClipboardList className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <textarea
                        className={`${inputClass} min-h-[120px] ${errors.purpose ? errorClass : ''} placeholder:uppercase`}
                        placeholder="E.G. FOR SLAUGHTER, FOR BREEDING..."
                        {...register('purpose', { required: "Purpose is required" })}
                    />
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
                <button 
                    type="button" 
                    onClick={nextStep} 
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors"
                >
                    Next Step
                </button>
            </div>
        </div>
    );
};

export default FarmerInfo;