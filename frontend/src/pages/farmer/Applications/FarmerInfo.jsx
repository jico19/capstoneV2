import { useGetMaps } from "/src/hooks/useMaps";
import { Navigation, Calendar, Plus, Trash2 } from "lucide-react";

const CounterField = ({ label, subLabel, fieldName, watch, setValue }) => {
    const val = parseInt(watch(fieldName) || 0);
    return (
        <div className="flex flex-col bg-white p-3.5 border border-stone-200 w-full transition-colors duration-150">
            <span className="text-[10px] font-black text-stone-800 uppercase tracking-widest text-center">{label}</span>
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider text-center mb-3 leading-none">{subLabel}</span>
            <div className="flex items-center justify-between border border-stone-200 bg-white">
                <button
                    type="button"
                    onClick={() => setValue(fieldName, Math.max(0, val - 1))}
                    className="w-12 h-12 flex items-center justify-center bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-600 hover:text-stone-800 font-bold select-none text-lg transition-colors border-r border-stone-200"
                >
                    -
                </button>
                <input
                    type="number"
                    value={val}
                    onChange={(e) => {
                        const parsed = parseInt(e.target.value);
                        setValue(fieldName, isNaN(parsed) ? 0 : Math.max(0, parsed));
                    }}
                    className="w-full text-center text-base font-black border-0 p-0 focus:ring-0 focus:outline-none text-stone-800 bg-white"
                />
                <button
                    type="button"
                    onClick={() => setValue(fieldName, val + 1)}
                    className="w-12 h-12 flex items-center justify-center bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-600 hover:text-stone-800 font-bold select-none text-lg transition-colors border-l border-stone-200"
                >
                    +
                </button>
            </div>
        </div>
    );
};

const FarmerInfo = ({ register, errors, nextStep, origins, addOrigin, removeOrigin, watch, setValue }) => {
    const { data: map, isLoading, isError } = useGetMaps();

    if (isLoading) return <div className="p-12 text-center font-bold text-stone-400 uppercase tracking-widest text-xs bg-white border border-stone-200">Loading Barangay Data...</div>;
    if (isError) return <div className="p-12 text-center text-red-600 font-bold bg-red-50 border border-red-200 uppercase tracking-widest text-xs">Failed to load barangay data.</div>;

    const inputClass = (error) => `w-full pl-10 pr-4 py-3.5 bg-white border ${error ? 'border-red-600 bg-red-50' : 'border-stone-200'} rounded-none focus:ring-0 focus:border-green-700 outline-none transition-colors text-sm font-medium text-stone-800`;
    const selectClass = (error) => `w-full px-4 py-3.5 bg-white border ${error ? 'border-red-600 bg-red-50' : 'border-stone-200'} rounded-none focus:ring-0 focus:border-green-700 outline-none transition-colors text-sm font-medium text-stone-800`;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;

    return (
        <div className="space-y-8">
            <div className="border-b border-stone-200 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Step 1</p>
                <h2 className="text-lg font-bold text-stone-800 uppercase tracking-tight">Travel & Animal Details</h2>
            </div>

            {/* Origins Section */}
            <div className="space-y-6">
                {origins.map((origin, index) => (
                    <div key={origin.id} className="p-5 border border-stone-200 bg-stone-50/50 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Starting Location #{index + 1}</h3>
                            {origins.length > 1 && (
                                <button 
                                    type="button" 
                                    onClick={() => removeOrigin(origin.id)} 
                                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-2 py-1 transition-colors"
                                >
                                    <Trash2 size={12} /> Remove
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest mb-1 block">Barangay where the pigs are now</label>
                                <select 
                                    {...register(`barangay_${origin.id}`, { required: true })} 
                                    className={selectClass(errors[`barangay_${origin.id}`])}
                                >
                                    <option value="">-- SELECT BARANGAY --</option>
                                    {map?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                {errors[`barangay_${origin.id}`] && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-1">Please select a starting barangay</p>}
                            </div>
                            
                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest block mb-1">How many pigs are you transporting?</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <CounterField label="Sow (Inahin)" subLabel="Mother Pig" fieldName={`inahin_${origin.id}`} watch={watch} setValue={setValue} />
                                    <CounterField label="Boar (Barako)" subLabel="Male Pig" fieldName={`barako_${origin.id}`} watch={watch} setValue={setValue} />
                                    <CounterField label="Fattener" subLabel="Pampataba" fieldName={`fattener_${origin.id}`} watch={watch} setValue={setValue} />
                                    <CounterField label="Grower" subLabel="Lumalaki" fieldName={`grower_${origin.id}`} watch={watch} setValue={setValue} />
                                    <CounterField label="Bulaw" subLabel="Dumalaga" fieldName={`bulaw_${origin.id}`} watch={watch} setValue={setValue} />
                                    <CounterField label="Starter" subLabel="Biik / Piglet" fieldName={`starter_${origin.id}`} watch={watch} setValue={setValue} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                <button 
                    type="button" 
                    onClick={addOrigin} 
                    className="w-full py-4 border border-dashed border-stone-300 hover:border-green-700 bg-white text-stone-600 hover:text-green-700 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus size={14} /> Add Another Starting Location
                </button>
            </div>

            {/* Common Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
                <div className="space-y-2">
                    <div>
                        <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest block mb-1">Where are the pigs going? (Destination)</label>
                        <p className="text-[11px] text-stone-400 font-medium">Specify the farm, buyer, or slaughterhouse address.</p>
                    </div>
                    <div className="relative">
                        <Navigation className="absolute left-3 top-4 text-stone-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Enter destination address" 
                            className={inputClass(errors.destination)} 
                            {...register('destination', { required: true })} 
                        />
                    </div>
                    {errors.destination && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-1">Destination is required</p>}
                </div>
                <div className="space-y-2">
                    <div>
                        <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest block mb-1">When will you transport the pigs? (Travel Date)</label>
                        <p className="text-[11px] text-stone-400 font-medium">Select the date you plan to move the animals.</p>
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-4 text-stone-400" size={16} />
                        <input 
                            type="date" 
                            min={minDate} 
                            className={inputClass(errors.transport_date)} 
                            {...register('transport_date', { required: true })} 
                        />
                    </div>
                    {errors.transport_date && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-1">Date is required</p>}
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <div>
                    <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest block mb-1">Why are the pigs being transported? (Purpose)</label>
                    <p className="text-[11px] text-stone-400 font-medium">Explain the reason (e.g., "For slaughter", "For breeding", "For sale to buyer").</p>
                </div>
                <textarea 
                    placeholder="Describe the purpose of transport..."
                    className={`${inputClass(errors.purpose).replace('pl-10', 'px-4')} min-h-[100px] leading-relaxed`} 
                    {...register('purpose', { required: true })} 
                />
                {errors.purpose && <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mt-1">Purpose is required</p>}
            </div>

            <div className="flex justify-end pt-6 border-t border-stone-200">
                <button 
                    type="button" 
                    onClick={nextStep} 
                    className="w-full sm:w-auto bg-green-700 hover:bg-green-600 text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors duration-100 ease-out"
                >
                    Next: Attach Files
                </button>
            </div>
        </div>
    );
};

export default FarmerInfo;