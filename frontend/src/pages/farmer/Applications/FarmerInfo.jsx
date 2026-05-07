import { useGetMaps } from "/src/hooks/useMaps";
import { MapPin, Navigation, PiggyBank, Calendar, ClipboardList, Plus, Trash2 } from "lucide-react";

const FarmerInfo = ({ register, errors, nextStep, origins, addOrigin, removeOrigin }) => {
    const { data: map, isLoading, isError } = useGetMaps();

    if (isLoading) return <div className="p-10 text-center font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Map Data...</div>;
    if (isError) return <div className="p-10 text-center text-red-600 font-bold bg-red-50 uppercase tracking-widest text-xs">Failed to load barangay data.</div>;

    const inputClass = "w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-none focus:ring-0 focus:border-green-600 outline-none transition-colors text-sm font-medium text-gray-900";

    return (
        <div className="space-y-8">
            <div className="border-b border-gray-100 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 1</p>
                <h2 className="text-xl font-black text-gray-900 uppercase">Transport Details</h2>
            </div>

            {/* Origins Section */}
            <div className="space-y-6">
                {origins.map((origin, index) => (
                    <div key={origin.id} className="p-4 border border-gray-100 bg-gray-50/50 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Origin #{index + 1}</h3>
                            {origins.length > 1 && (
                                <button type="button" onClick={() => removeOrigin(origin.id)} className="text-red-600 hover:text-red-700">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Barangay</label>
                                <select {...register(`barangay_${origin.id}`, { required: true })} className={inputClass}>
                                    <option value="">-- SELECT --</option>
                                    {map?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Number of Heads</label>
                                <input type="number" {...register(`pigs_${origin.id}`, { required: true })} className={inputClass} placeholder="0" />
                            </div>
                        </div>
                    </div>
                ))}
                
                <button type="button" onClick={addOrigin} className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:border-green-600 hover:text-green-600">
                    <Plus size={16} /> Add Another Origin
                </button>
            </div>

            {/* Common Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Destination</label>
                    <div className="relative">
                        <Navigation className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input type="text" className={inputClass} {...register('destination', { required: true })} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Transport Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                        <input type="date" className={inputClass} {...register('transport_date', { required: true })} />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Purpose</label>
                <textarea className={`${inputClass} min-h-[100px]`} {...register('purpose', { required: true })} />
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-100">
                <button type="button" onClick={nextStep} className="w-full md:w-auto bg-green-600 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none">Next Step</button>
            </div>
        </div>
    );
};

export default FarmerInfo;