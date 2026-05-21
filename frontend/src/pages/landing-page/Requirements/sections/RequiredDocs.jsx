import { useRef, useEffect } from "react";
import useScrollReveal from "/src/hooks/useScrollReveal";
import RequiredDocsIcon from "/src/assets/requirements-icons/required-docs-icon.png";
import WarningIcon      from "/src/assets/requirements-icons/warning.png";

const DOCUMENTS = [
  { number: "1", title: "Handler's License",
    desc: "Valid license issued by the Municipal Agriculture Office authorizing the handler/trader to transport livestock. Must be current and not expired.",
    format: "PDF or JPG/PNG", size: "5MB", extra: { label: "Required", value: "Yes", accent: false } },
  { number: "2", title: "Transport Carrier Registration",
    desc: "Registration certificate for the vehicle used to transport livestock. Must include whole plate number, capacity, and registration details.",
    format: "PDF or JPG/PNG", size: "5MB", extra: { label: "Validity", value: "Must be active", accent: false } },
  { number: "3", title: "Trader's Pass",
    desc: "Official pass issued by the Office of the Provincial Veterinarian confirming the trader's identity and authorization to conduct livestock trading in the area.",
    format: "PDF or JPG/PNG", size: "5MB", extra: { label: "Validity", value: "Within Quezon Province", accent: false } },
  { number: "4", title: "Certificate of Immediate Slaughter",
    desc: "Certificate confirming the livestock will be slaughtered immediately upon arrival at destination. Required for livestock intended for slaughter.",
    format: "PDF or JPG/PNG", size: "5MB", extra: { label: "Required", value: "For slaughter purposes", accent: true } },
  { number: "5", title: "Endorsement Form",
    desc: "Official endorsement from the source barangay agriculture officer or livestock owner endorsing the transport and confirming livestock details.",
    format: "PDF or JPG/PNG", size: "5MB", extra: { label: "Required", value: "Yes", accent: false } },
  { number: "6", title: "Pagpapatunay",
    desc: "Official document along with endorsement from the source barangay agriculture officer, confirming livestock details.",
    format: "PDF or JPG/PNG", size: "5MB", extra: { label: "Required", value: "Yes", accent: false } },
];

const REMINDERS = [
  "All documents must be valid and not expired",
  "Scanned copies must be clear and readable (no blurry images)",
  "Documents with altered or tampered information will be automatically rejected",
  "Signature on documents must match registered signature in our database",
  "For pigs, ASF blood test certificate is MANDATORY as conducted by municipal agriculture office every 3 months",
];

function DocCard({ doc }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("is-visible"); observer.unobserve(el); } },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}
      className="rdoc-card group flex gap-4 items-start bg-white border border-[#e2ece6] rounded-[14px] px-[1.4rem] py-5 w-full
        opacity-0 translate-y-5 transition-[opacity,transform,box-shadow,border-color] duration-500 ease-out
        hover:shadow-[0_0.4rem_1.5rem_rgba(10,42,26,0.08)] hover:border-[#b2d4be]">

      {/* Number badge */}
      <div className="w-[1.9rem] h-[1.9rem] bg-brand-primary rounded-[0.4rem] flex items-center justify-center text-brand-amber font-archivo text-[0.9rem] shrink-0 mt-[2px] shadow-[0_4px_12px_rgba(10,42,26,0.2)]">
        {doc.number}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-archivo text-[clamp(0.92rem,1.3vw,1.2rem)] text-brand-primary mb-[0.4rem] tracking-[-0.01em]">{doc.title}</h3>
        <p className="font-jakarta text-[clamp(0.82rem,1.1vw,0.9rem)] text-[#6c757d] leading-[1.7] mb-[0.65rem]">{doc.desc}</p>
        <div className="flex flex-wrap gap-2 max-[640px]:flex-col">
          <span className="font-jakarta text-[0.77rem] text-[#555] bg-[#f1f5f2] rounded-[0.4rem] px-[0.6rem] py-[0.2rem] whitespace-nowrap">
            <strong className="text-brand-primary">Format:</strong> {doc.format}
          </span>
          <span className="font-jakarta text-[0.77rem] text-[#555] bg-[#f1f5f2] rounded-[0.4rem] px-[0.6rem] py-[0.2rem] whitespace-nowrap">
            <strong className="text-brand-primary">Max Size:</strong> {doc.size}
          </span>
          <span className={`font-jakarta text-[0.77rem] rounded-[0.4rem] px-[0.6rem] py-[0.2rem] whitespace-nowrap
            ${doc.extra.accent ? "bg-brand-amber/10 text-[#7a4f00]" : "bg-[#f1f5f2] text-[#555]"}`}>
            <strong className={doc.extra.accent ? "text-[#7a4f00]" : "text-brand-primary"}>{doc.extra.label}:</strong> {doc.extra.value}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function RequiredDocs() {
  const headerRef = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="bg-brand-bg pt-16 relative">
      <div className="max-w-[54rem] mx-auto px-8 pb-16 max-[640px]:px-5 max-[640px]:pb-12">

        {/* Header */}
        <div ref={headerRef} className="reveal-block flex items-center gap-3 pb-[0.9rem] border-b-2 border-[#e2ece6] mb-[0.6rem]">
          <img src={RequiredDocsIcon} alt="" className="w-7 h-7 object-contain" />
          <h2 className="font-archivo text-[clamp(1.2rem,2vw,2rem)] text-brand-primary tracking-[-0.01em]">Required Documents</h2>
        </div>
        <p className="font-jakarta text-[clamp(0.88rem,1.2vw,0.97rem)] text-[#6c757d] leading-[1.75] mb-6">
          Prepare these documents before starting your application. All documents must be clear, legible scans or photos.
        </p>

        {/* Cards */}
        <div className="flex flex-col gap-[0.85rem] mb-6">
          {DOCUMENTS.map((doc, i) => <DocCard key={i} doc={doc} />)}
        </div>

        {/* Reminders */}
        <div className="bg-[#fffbf0] border-[1.5px] border-[#f5d97a] rounded-[14px] px-[1.4rem] py-[1.1rem]">
          <div className="flex items-center gap-[0.6rem] font-archivo text-[clamp(0.85rem,1.1vw,1.1rem)] text-[#7a4f00] mb-3">
            <img src={WarningIcon} alt="" className="w-5 h-5 object-contain" />
            Important Reminders
          </div>
          <ul className="list-none p-0 m-0 flex flex-col gap-[0.45rem]">
            {REMINDERS.map((r, i) => (
              <li key={i}
                className="font-jakarta text-[clamp(0.82rem,1.1vw,0.88rem)] text-[#7a4f00] pl-[1.1rem] leading-[1.65] relative
                  before:content-['•'] before:absolute before:left-[0.2rem] before:text-brand-amber before:font-bold">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}