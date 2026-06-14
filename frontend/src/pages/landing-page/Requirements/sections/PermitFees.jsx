import useScrollReveal from "/src/hooks/useScrollReveal";
import FeeIcon     from "/src/assets/requirements-icons/fee-icon.png";
import PaymentIcon from "/src/assets/requirements-icons/payment-icon.png";

const FEES = [
  { doc: "Veterinary Health Certificate", fee: "₱50.00" },
  { doc: "Animal Inspection Certificate", fee: "₱50.00" },
  { doc: "Shipping Permit",               fee: "₱50.00" },
];

export default function PermitFees() {
  const sectionRef = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="bg-brand-primary relative overflow-hidden
      before:content-[''] before:absolute before:inset-0 before:pointer-events-none
      before:[background-image:repeating-linear-gradient(-55deg,transparent,transparent_2rem,rgba(255,255,255,0.015)_2rem,rgba(255,255,255,0.015)_2.1rem)]">

      {/* Wave top */}
      <div className="leading-[0] relative z-[1]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-20 block">
          <path d="M0,40 C360,0 1080,80 1440,40 L1440,0 L0,0 Z" fill="#f8faf8"/>
        </svg>
      </div>

      <div ref={sectionRef} className="reveal-block relative z-[1] max-w-[54rem] mx-auto px-8 pt-4 pb-8 max-[640px]:px-5">

        {/* Header */}
        <div className="flex items-center gap-3 pb-[0.9rem] border-b-2 border-white/10 mb-[0.6rem]">
          <img src={FeeIcon} alt="" className="w-7 h-7 object-contain" style={{ filter: "brightness(0) invert(1) opacity(0.85)" }} />
          <h2 className="font-archivo text-[clamp(1.2rem,2vw,2rem)] text-white tracking-[-0.01em]">Permit Fees</h2>
        </div>
        <p className="font-jakarta text-[clamp(0.88rem,1.2vw,0.97rem)] text-white/55 leading-[1.75] mb-6">
          Standard fees for livestock transport permits. All fees are non-refundable.
        </p>

        {/* Table */}
        <div className="border border-white/10 rounded-[14px] overflow-hidden mb-6 w-full">
          <table className="w-full border-collapse font-jakarta">
            <thead>
              <tr className="bg-white/[0.08]">
                <th className="px-5 py-[0.9rem] text-left text-[clamp(0.75rem,1vw,0.82rem)] font-bold text-white/70 tracking-[0.06em] uppercase">Document Type</th>
                <th className="px-5 py-[0.9rem] text-left text-[clamp(0.75rem,1vw,0.82rem)] font-bold text-white/70 tracking-[0.06em] uppercase">Fee</th>
              </tr>
            </thead>
            <tbody>
              {FEES.map(({ doc, fee }, i) => (
                <tr key={i} className="border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.04] transition-colors duration-200">
                  <td className="px-5 py-[0.9rem] text-[clamp(0.85rem,1.2vw,0.95rem)] text-white/80">{doc}</td>
                  <td className="px-5 py-[0.9rem] text-[clamp(0.85rem,1.2vw,0.95rem)] text-brand-amber font-bold">{fee}</td>
                </tr>
              ))}
              <tr className="bg-brand-amber/[0.06] border-t border-brand-amber/20">
                <td className="px-5 py-[0.9rem] text-[clamp(0.9rem,1.3vw,1rem)] text-white"><strong>Total</strong></td>
                <td className="px-5 py-[0.9rem] text-[clamp(0.9rem,1.3vw,1rem)] text-brand-amber font-bold"><strong>₱200.00</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment box */}
        <div className="bg-brand-mint/[0.08] border-[1.5px] border-brand-mint/25 rounded-[14px] px-[1.4rem] py-[1.1rem]">
          <div className="flex items-center gap-[0.6rem] font-archivo text-[clamp(0.85rem,1.1vw,1.1rem)] text-brand-mint mb-3">
            <img src={PaymentIcon} alt="" className="w-5 h-5 object-contain"
              style={{ filter: "brightness(0) saturate(100%) invert(62%) sepia(40%) saturate(400%) hue-rotate(110deg)" }} />
            Payment Information
          </div>
          <p className="font-jakarta text-[clamp(0.82rem,1.1vw,0.9rem)] text-white/65 leading-[1.7] mb-[0.4rem]">
            <strong className="text-white/90">Online Payment Options:</strong> GCash, PayMaya, Bank Transfer (instructions will be provided after approval)
          </p>
          <p className="font-jakarta text-[clamp(0.82rem,1.1vw,0.9rem)] text-white/65 leading-[1.7] mb-[0.4rem]">
            <strong className="text-white/90">In-Person Payment:</strong> Cash payment accepted at Sariaya Municipal Agriculture Office during office hours
          </p>
          <p className="font-jakarta text-[clamp(0.82rem,1.1vw,0.9rem)] text-brand-mint italic leading-[1.7]">
            <strong>Note:</strong> Permits will only be released after payment confirmation
          </p>
        </div>
      </div>

      {/* Wave bottom */}
      <div className="leading-[0] relative z-[1]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-20 block">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8faf8"/>
        </svg>
      </div>
    </section>
  );
}