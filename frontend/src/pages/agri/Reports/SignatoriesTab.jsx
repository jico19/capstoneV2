/**
 * Tab 4: Signatories — official 3-tier government attestation chain.
 */
const SignatoriesTab = ({ signatories, onChange }) => {
  return (
    <div className="space-y-6">
      <p className="text-xs text-stone-500 leading-relaxed">
        Official 3-tier government attestation chain. Ensure the officers and designated titles match current municipal administration records.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Prepared By */}
        <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-800">
            1. Prepared By (Drafting Officer)
          </p>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-stone-400">Full Name</label>
            <input
              type="text"
              value={signatories.prepared_by_name}
              onChange={(e) => onChange("prepared_by_name", e.target.value)}
              className="w-full border border-stone-300 p-2 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-stone-400">Designation / Title</label>
            <input
              type="text"
              value={signatories.prepared_by_title}
              onChange={(e) => onChange("prepared_by_title", e.target.value)}
              className="w-full border border-stone-300 p-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-green-700"
            />
          </div>
        </div>

        {/* Verified By */}
        <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-700">
            2. Certified Correct By (Veterinarian)
          </p>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-stone-400">Full Name</label>
            <input
              type="text"
              value={signatories.verified_by_name}
              onChange={(e) => onChange("verified_by_name", e.target.value)}
              className="w-full border border-stone-300 p-2 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-stone-400">Designation / Title</label>
            <input
              type="text"
              value={signatories.verified_by_title}
              onChange={(e) => onChange("verified_by_title", e.target.value)}
              className="w-full border border-stone-300 p-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-green-700"
            />
          </div>
        </div>

        {/* Approved By */}
        <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-700">
            3. Approved By (Municipal Agriculturist)
          </p>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-stone-400">Full Name</label>
            <input
              type="text"
              value={signatories.approved_by_name}
              onChange={(e) => onChange("approved_by_name", e.target.value)}
              className="w-full border border-stone-300 p-2 text-xs font-bold text-stone-900 bg-white focus:outline-none focus:border-green-700"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-stone-400">Designation / Title</label>
            <input
              type="text"
              value={signatories.approved_by_title}
              onChange={(e) => onChange("approved_by_title", e.target.value)}
              className="w-full border border-stone-300 p-2 text-xs text-stone-700 bg-white focus:outline-none focus:border-green-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatoriesTab;