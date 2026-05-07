import { CheckCircle } from "lucide-react";

const ReviewApplication = ({ watch, prevStep, isSubmitting, origins }) => {

    const formData = watch();

    const DetailRow = ({ label, value }) => (
        <div className="flex flex-col sm:flex-row justify-between py-3 border-b border-gray-100 last:border-0 gap-1 sm:gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</span>
            <span className="text-sm font-bold text-gray-900 sm:text-right">{value || "—"}</span>
        </div>
    );

    const DocRow = ({ label, field }) => {
        const fileList = watch(field);
        const fileName = fileList && fileList.length > 0 ? fileList[0].name : "MISSING";
        const isMissing = fileName === "MISSING";
        
        return (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</span>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider truncate max-w-[200px] ${isMissing ? 'text-red-500' : 'text-gray-900'}`}>
                        {fileName}
                    </span>
                    <CheckCircle size={14} className={!isMissing ? "text-green-600" : "text-gray-200"} strokeWidth={3} />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8">
            <div className="border-b border-gray-100 pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 3</p>
                <h2 className="text-xl font-black text-gray-900 uppercase">Review & Submit</h2>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Please verify all information before submitting.</p>
            </div>

            <div className="bg-gray-50 p-6 border border-gray-200 rounded-none">
                <h3 className="text-xs font-black tracking-[0.2em] text-gray-900 uppercase mb-4 border-b border-gray-200 pb-2">Transport Info</h3>
                {origins.map((o, index) => (
                    <div key={o.id} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-green-700 mb-2">Origin #{index + 1}</p>
                        <DetailRow label="Barangay ID" value={formData[`barangay_${o.id}`]} />
                        <DetailRow label="Number of Heads" value={formData[`pigs_${o.id}`]} />
                    </div>
                ))}
                <DetailRow label="Destination" value={formData.destination} />
                <DetailRow label="Transport Date" value={formData.transport_date} />
                <DetailRow label="Purpose" value={formData.purpose} />
            </div>

            <div className="bg-gray-50 p-6 border border-gray-200 rounded-none">
                <h3 className="text-xs font-black tracking-[0.2em] text-gray-900 uppercase mb-4 border-b border-gray-200 pb-2">Attached Documents</h3>
                <DocRow label="Trader's Pass" field="traders_pass" />
                <DocRow label="Handler's License" field="handlers_license" />
                <DocRow label="Carrier Registration" field="transport_carrier_reg" />
                {origins.map((o, index) => (
                    <div key={o.id}>
                        <DocRow label={`CIS (Origin #${index + 1})`} field={`origin_${o.id}_cis`} />
                        <DocRow label={`Endorsement (Origin #${index + 1})`} field={`origin_${o.id}_endorsement_cert`} />
                    </div>
                ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between pt-6 border-t border-gray-100 gap-4 mt-8">
                <button 
                    type="button" 
                    className="w-full sm:w-auto border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors" 
                    onClick={prevStep}
                    disabled={isSubmitting}
                >
                    Back
                </button>
                <button
                    type="submit"
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-xs font-black uppercase tracking-widest rounded-none transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "SUBMITTING..." : "SUBMIT APPLICATION"}
                </button>
            </div>
        </div>
    );
};

export default ReviewApplication;