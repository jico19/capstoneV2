import { CheckCircle } from "lucide-react";
import { useGetMaps } from "/src/hooks/useMaps";

const ReviewApplication = ({ watch, prevStep, isSubmitting, origins }) => {
    const { data: map } = useGetMaps();
    const formData = watch();

    const DetailRow = ({ label, value }) => (
        <div className="flex flex-col sm:flex-row justify-between py-3 border-b border-stone-200 last:border-0 gap-1 sm:gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{label}</span>
            <span className="text-sm font-bold text-stone-800 sm:text-right">{value || "—"}</span>
        </div>
    );

    const DocRow = ({ label, field }) => {
        const fileVal = watch(field);
        
        const isExisting = fileVal && fileVal.isExisting;
        const isNewUpload = fileVal && (
            (typeof FileList !== "undefined" && fileVal instanceof FileList && fileVal.length > 0) ||
            (Array.isArray(fileVal) && fileVal.length > 0)
        );
        
        const fileName = isNewUpload ? fileVal[0].name : (isExisting ? fileVal.name : "MISSING");
        const isMissing = fileName === "MISSING";
        
        return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 border-b border-stone-200 last:border-0 gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">{label}</span>
                <div className="flex items-center gap-2 max-w-full">
                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[200px] sm:max-w-[300px] ${isMissing ? 'text-red-500' : 'text-stone-800'}`}>
                        {fileName}
                    </span>
                    <CheckCircle size={14} className={!isMissing ? "text-green-700" : "text-stone-200"} strokeWidth={2.5} />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="border-b border-stone-200 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Step 3</p>
                <h2 className="text-lg font-bold text-stone-800 uppercase tracking-tight">Review & Send Request</h2>
                <p className="text-xs text-stone-500 mt-1">Please check your details below. Make sure all your answers are correct before sending.</p>
            </div>

            {/* Transport Details Card */}
            <div className="bg-white p-5 border border-stone-200 rounded-none space-y-4">
                <h3 className="text-xs font-black tracking-[0.2em] text-stone-800 uppercase border-b border-stone-200 pb-2.5">Transport Information</h3>
                
                <DetailRow label="Where are the pigs going? (Destination)" value={formData.destination} />
                <DetailRow label="When will you travel? (Date)" value={formData.transport_date} />
                <DetailRow label="Why are you transporting? (Purpose)" value={formData.purpose} />
            </div>

            {/* Swine Details Card */}
            <div className="bg-white p-5 border border-stone-200 rounded-none space-y-4">
                <h3 className="text-xs font-black tracking-[0.2em] text-stone-800 uppercase border-b border-stone-200 pb-2.5">Swine Quantities & Locations</h3>
                
                {origins.map((o, index) => {
                    const barangayName = map?.find(m => String(m.id) === String(formData[`barangay_${o.id}`]))?.name || formData[`barangay_${o.id}`];
                    const inahin = parseInt(formData[`inahin_${o.id}`] || 0);
                    const barako = parseInt(formData[`barako_${o.id}`] || 0);
                    const fattener = parseInt(formData[`fattener_${o.id}`] || 0);
                    const grower = parseInt(formData[`grower_${o.id}`] || 0);
                    const bulaw = parseInt(formData[`bulaw_${o.id}`] || 0);
                    const starter = parseInt(formData[`starter_${o.id}`] || 0);
                    const total = inahin + barako + fattener + grower + bulaw + starter;

                    return (
                        <div key={o.id} className="pb-4 border-b border-stone-200 last:border-0 last:pb-0 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Origin #{index + 1}: Barangay {barangayName}</p>
                            <DetailRow label="Total Swine" value={`${total} Pigs`} />
                            {total > 0 && (
                                <div className="pl-4 py-2 border-l-2 border-green-700 text-[10px] font-bold text-stone-500 uppercase tracking-widest space-y-1 bg-stone-50 p-3">
                                    {inahin > 0 && <div>• Sow (Inahin): {inahin}</div>}
                                    {barako > 0 && <div>• Boar (Barako): {barako}</div>}
                                    {fattener > 0 && <div>• Fattener (Pampataba): {fattener}</div>}
                                    {grower > 0 && <div>• Grower (Lumalaki): {grower}</div>}
                                    {bulaw > 0 && <div>• Bulaw (Dumalaga): {bulaw}</div>}
                                    {starter > 0 && <div>• Starter (Biik): {starter}</div>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Attached Photos Card */}
            <div className="bg-white p-5 border border-stone-200 rounded-none space-y-4">
                <h3 className="text-xs font-black tracking-[0.2em] text-stone-800 uppercase border-b border-stone-200 pb-2.5">Attached Documents (Photos)</h3>
                <DocRow label="Trader's Pass" field="traders_pass" />
                <DocRow label="Handler's License" field="handlers_license" />
                <DocRow label="Carrier Registration" field="transport_carrier_reg" />
                {origins.map((o, index) => (
                    <div key={o.id} className="space-y-1">
                        <DocRow label={`CIS (Location #${index + 1})`} field={`origin_${o.id}_cis`} />
                        <DocRow label={`Endorsement (Location #${index + 1})`} field={`origin_${o.id}_endorsement_cert`} />
                    </div>
                ))}
            </div>

            {/* Desktop Navigation Buttons */}
            <div className="hidden sm:flex justify-between pt-6 border-t border-stone-200 gap-4 mt-8">
                <button 
                    type="button" 
                    className="border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 px-8 py-3.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors duration-100 ease-out" 
                    onClick={prevStep}
                    disabled={isSubmitting}
                >
                    Back
                </button>
                <button
                    type="submit"
                    className="bg-green-700 hover:bg-green-600 text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest rounded-none transition-colors duration-100 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                >
                    {isSubmitting && <span className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin"></span>}
                    {isSubmitting ? "SENDING..." : "SEND PERMIT REQUEST"}
                </button>
            </div>

            {/* Sticky Mobile Navigation Bar */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 flex items-center justify-between z-50">
                <button
                    type="button"
                    onClick={prevStep}
                    disabled={isSubmitting}
                    className="border border-stone-200 bg-white active:bg-stone-100 text-stone-700 text-[10px] font-black uppercase tracking-wider px-4 py-3 rounded-none"
                >
                    Back
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-700 active:bg-green-800 hover:bg-green-600 text-white font-black uppercase tracking-widest text-xs px-5 py-3 rounded-none transition-colors flex items-center gap-2"
                >
                    {isSubmitting && <span className="w-3 h-3 border-2 border-t-transparent border-white rounded-full animate-spin"></span>}
                    {isSubmitting ? "Sending..." : "Send Request ✓"}
                </button>
            </div>
        </div>
    );
};

export default ReviewApplication;