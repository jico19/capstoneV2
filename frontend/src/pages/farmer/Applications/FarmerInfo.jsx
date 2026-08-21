import { useState, useEffect, useRef } from "react";
import { useGetMaps } from "/src/hooks/useMaps";
import { Navigation, Calendar, Plus, Trash2, ArrowRight, ChevronRight, ChevronDown } from "lucide-react";

const ANIMAL_CATEGORIES = [
    {
        name: "Breeding",
        items: [
            { key: "inahin", label: "Sow (Inahin)" },
            { key: "barako", label: "Boar (Barako)" }
        ]
    },
    {
        name: "Growing",
        items: [
            { key: "starter", label: "Starter" },
            { key: "grower", label: "Grower" },
            { key: "fattener", label: "Fattener" }
        ]
    },
    {
        name: "Other",
        items: [
            { key: "bulaw", label: "Bulaw" }
        ]
    }
];

const Stepper = ({ fieldName, watch, setValue }) => {
    const rawVal = watch(fieldName);
    const val = rawVal !== undefined ? parseInt(rawVal, 10) : 0;
    const displayVal = isNaN(val) ? 0 : val;

    const handleDecrement = () => {
        setValue(fieldName, Math.max(0, displayVal - 1), { shouldValidate: true, shouldDirty: true });
    };

    const handleIncrement = () => {
        setValue(fieldName, displayVal + 1, { shouldValidate: true, shouldDirty: true });
    };

    const handleInputChange = (e) => {
        const text = e.target.value;
        if (text === '') {
            setValue(fieldName, '', { shouldValidate: true, shouldDirty: true });
            return;
        }
        const parsed = parseInt(text, 10);
        setValue(fieldName, isNaN(parsed) ? 0 : Math.max(0, parsed), { shouldValidate: true, shouldDirty: true });
    };

    const handleBlur = () => {
        if (watch(fieldName) === '') {
            setValue(fieldName, 0, { shouldValidate: true, shouldDirty: true });
        }
    };

    return (
        <div className="flex items-center justify-between border border-stone-200 bg-white select-none h-9 w-[110px] sm:w-[130px] rounded-none shrink-0">
            <button
                type="button"
                onClick={handleDecrement}
                aria-label="Decrease quantity"
                disabled={displayVal <= 0}
                className="w-8 h-full flex items-center justify-center bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-700 font-bold text-base transition-colors border-r border-stone-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-none shrink-0"
            >
                −
            </button>
            <input
                type="number"
                value={rawVal ?? 0}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onFocus={(e) => e.target.select()}
                className="w-full text-center text-xs font-black border-0 p-0 focus:ring-0 focus:outline-none text-stone-900 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
                type="button"
                onClick={handleIncrement}
                aria-label="Increase quantity"
                className="w-8 h-full flex items-center justify-center bg-stone-50 hover:bg-stone-100 active:bg-stone-200 text-stone-700 font-bold text-base transition-colors border-l border-stone-200 rounded-none shrink-0"
            >
                +
            </button>
        </div>
    );
};

const FarmerInfo = ({ register, errors, nextStep, origins, addOrigin, removeOrigin, watch, setValue }) => {
    const { data: map, isLoading, isError } = useGetMaps();
    const [activeOriginId, setActiveOriginId] = useState(origins[0]?.id || null);
    const prevLength = useRef(origins.length);

    useEffect(() => {
        if (prevLength.current === 0 && origins.length > 0) {
            // Initial data load - expand the first location
            setActiveOriginId(origins[0].id);
        } else if (origins.length > prevLength.current && origins.length > 0) {
            // New starting location added - expand it
            setActiveOriginId(origins[origins.length - 1].id);
        } else if (origins.length < prevLength.current) {
            // A location was removed
            const exists = origins.some(o => o.id === activeOriginId);
            if (!exists && origins.length > 0) {
                setActiveOriginId(origins[origins.length - 1].id);
            }
        }
        prevLength.current = origins.length;
    }, [origins, activeOriginId]);

    const getOriginTotal = (originId) => {
        const inahin = parseInt(watch(`inahin_${originId}`) || 0, 10);
        const barako = parseInt(watch(`barako_${originId}`) || 0, 10);
        const fattener = parseInt(watch(`fattener_${originId}`) || 0, 10);
        const grower = parseInt(watch(`grower_${originId}`) || 0, 10);
        const bulaw = parseInt(watch(`bulaw_${originId}`) || 0, 10);
        const starter = parseInt(watch(`starter_${originId}`) || 0, 10);
        return inahin + barako + fattener + grower + bulaw + starter;
    };

    const getGlobalTotal = () => {
        return origins.reduce((acc, o) => acc + getOriginTotal(o.id), 0);
    };

    const globalTotal = getGlobalTotal();

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
        <div className="space-y-8 pb-20 sm:pb-0">
            <div className="border-b border-stone-200 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Step 1</p>
                <h2 className="text-lg font-bold text-stone-800 uppercase tracking-tight">Travel & Animal Details</h2>
            </div>

            {/* Origins Section */}
            <div className="space-y-4">
                {origins.map((origin, index) => {
                    const barangayId = watch(`barangay_${origin.id}`);
                    const barangayName = map?.find(m => String(m.id) === String(barangayId))?.name;
                    const isActive = activeOriginId === origin.id;

                    return (
                        <div key={origin.id} className="border border-stone-200 bg-white">
                            {/* Accordion Header */}
                            <div 
                                onClick={() => setActiveOriginId(isActive ? null : origin.id)}
                                className="flex justify-between items-center px-5 py-4 bg-white cursor-pointer select-none transition-colors hover:bg-stone-50"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Starting Location #{index + 1}</span>
                                    <span className="text-sm font-bold text-stone-800 flex items-center gap-2">
                                        {barangayName ? `Barangay ${barangayName}` : 'Select Barangay'}
                                        <span className="text-stone-500 font-medium text-xs ml-2 normal-case">
                                            ({getOriginTotal(origin.id)} {getOriginTotal(origin.id) === 1 ? 'pig' : 'pigs'})
                                        </span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {origins.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeOrigin(origin.id);
                                            }} 
                                            className="text-[9px] font-black uppercase tracking-widest text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-2 py-1 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <div className="text-stone-400">
                                        {isActive ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>
                                </div>
                            </div>

                            {/* Accordion Body */}
                            {isActive && (
                                <div className="p-5 border-t border-stone-200 bg-stone-50/10 space-y-5">
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
                                        <div className="border border-stone-200 bg-white">
                                            {/* Compact 2-Column Responsive Animal Grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-stone-50/50">
                                                {ANIMAL_CATEGORIES.flatMap(cat => cat.items.map(item => ({ ...item, category: cat.name }))).map((item) => (
                                                    <div 
                                                        key={item.key} 
                                                        className="flex items-center justify-between p-2.5 bg-white border border-stone-200"
                                                    >
                                                        <div className="min-w-0 pr-2">
                                                            <span className="text-xs font-black text-stone-800 uppercase block truncate leading-tight">
                                                                {item.label}
                                                            </span>
                                                            <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400">
                                                                {item.category}
                                                            </span>
                                                        </div>
                                                        <Stepper
                                                            fieldName={`${item.key}_${origin.id}`}
                                                            watch={watch}
                                                            setValue={setValue}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Origin Total Summary Bar */}
                                            <div className="flex justify-between items-center px-4 py-3 bg-stone-100/70 border-t border-stone-200">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">
                                                    Subtotal (This Location)
                                                </span>
                                                <span className="text-sm font-black text-stone-900 font-mono">
                                                    {getOriginTotal(origin.id)} <span className="text-[10px] font-normal text-stone-500 font-sans">pigs</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                
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
                    <p className="text-[11px] text-stone-400 font-medium">Select the main reason for moving the animals.</p>
                </div>
                <select 
                    className={selectClass(errors.purpose)} 
                    {...register('purpose', { required: true })} 
                >
                    <option value="">-- SELECT PURPOSE --</option>
                    <option value="Slaughter">Slaughter / Katayan (For Meat)</option>
                    <option value="Breeding">Breeding / Pampalahi</option>
                    <option value="Fattening">Fattening / Pagpapataba</option>
                    <option value="Sale / Commercial">Sale to Buyer / Pagbebenta</option>
                    <option value="Transfer / Relocation">Transfer to another Farm / Paglipat ng Bukid</option>
                </select>
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

            {/* Sticky Mobile Footer (Step 1 only) */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-5 py-4 flex items-center justify-between z-50">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 leading-none mb-1">Total Pigs</span>
                    <span className="text-lg font-black text-stone-800 leading-none">
                        {globalTotal} {globalTotal === 1 ? 'pig' : 'pigs'}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={nextStep}
                    className="bg-green-700 active:bg-green-800 hover:bg-green-600 text-white font-black uppercase tracking-widest text-xs px-5 py-3.5 rounded-none flex items-center gap-2 transition-colors duration-100 ease-out"
                >
                    Continue <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default FarmerInfo;