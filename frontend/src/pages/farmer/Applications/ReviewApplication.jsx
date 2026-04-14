import { CheckCircle } from "lucide-react";

const ReviewApplication = ({ watch, prevStep, isSubmitting }) => {

    const formData = watch();

    const DetailRow = ({ label, value }) => (
        <div className="flex justify-between py-3 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-bold text-slate-800">{value || "—"}</span>
        </div>
    );

    const DocRow = ({ label, field }) => {
        const fileList = watch(field);
        const fileName = fileList && fileList.length > 0 ? fileList[0].name : "Missing";
        return (
            <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-600">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 truncate max-w-[150px]">{fileName}</span>
                    <CheckCircle size={16} className={fileName !== "Missing" ? "text-green-500" : "text-slate-300"} />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-800 border-b pb-2">3. Review & Submit</h2>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4">Transport Info</h3>
                <DetailRow label="Barangay ID (Origin)" value={formData.origin_barangay} />
                <DetailRow label="Destination" value={formData.destination} />
                <DetailRow label="Transport Date" value={formData.transport_date} />
                <DetailRow label="Number of Heads" value={formData.number_of_pigs} />
                <DetailRow label="Purpose" value={formData.purpose} />
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4">Attached Documents</h3>
                <DocRow label="Trader's Pass" field="traders_pass" />
                <DocRow label="Handler's License" field="handlers_license" />
                <DocRow label="Carrier Registration" field="transport_carrier_reg" />
                <DocRow label="Certificate of Inspection" field="cis" />
                <DocRow label="Endorsement Certificate" field="endorsement_cert" />
            </div>

            <div className="flex justify-between pt-6 border-t mt-8">
                <button type="button" className="btn bg-zinc-300" onClick={prevStep} disabled={isSubmitting}>
                    Back
                </button>
                <button
                    type="submit"
                    className="btn bg-green-500 text-white px-8 border-0"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
            </div>
        </div>
    );
};

export default ReviewApplication;