import { useRef, useEffect } from "react";
import useScrollReveal from '../../../../hooks/useScrollReveal';
import { FileText, AlertTriangle } from "lucide-react";

const DOCUMENTS = [
  { number: "1", title: "Handler's License",
    desc: "Valid license authorizing the handler/trader to transport livestock. Can be saved as a verified standing credential on your profile.",
    format: "PDF or JPG/PNG", size: "10MB", extra: { label: "Profile", value: "Auto-attached if on file", accent: false } },
  { number: "2", title: "Transport Carrier Registration",
    desc: "Official registration certificate (OR/CR) for the transport vehicle. Can be saved as a verified standing credential on your profile.",
    format: "PDF or JPG/PNG", size: "10MB", extra: { label: "Profile", value: "Auto-attached if on file", accent: false } },
  { number: "3", title: "Trader's Pass",
    desc: "Official pass issued by the Office of the Provincial Veterinarian confirming the trader's authorization to conduct livestock trading.",
    format: "PDF or JPG/PNG", size: "10MB", extra: { label: "Validity", value: "Within Quezon Province", accent: false } },
  { number: "4", title: "Certificate of Inspection (CIS)",
    desc: "Official swine health inspection certificate issued by the source barangay confirming herd health condition prior to transport.",
    format: "PDF or JPG/PNG", size: "10MB", extra: { label: "Required", value: "All swine shipments", accent: true } },
  { number: "5", title: "Barangay Endorsement (Pagpapatunay)",
    desc: "Official clearance or Pagpapatunay along with endorsement form from the source barangay agriculture officer. Required only when transporting pigs to destinations outside Sariaya municipality.",
    format: "PDF or JPG/PNG", size: "10MB", extra: { label: "Required", value: "Outside Sariaya", accent: true } },
];

const REMINDERS = [
  "Handler's License and Vehicle Registration are verified once and auto-attached to every permit application",
  "All documents must be valid, legible, and unexpired (up to 10MB per file)",
  "Documents with altered or tampered information will be automatically flagged and rejected",
  "Signatures on documents must match official registered records",
  "For pigs, ASF blood test certification is mandatory as conducted by the municipal agriculture office quarterly",
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
      className="rdoc-card group flex gap-4 items-start bg-white border border-stone-200 p-5 rounded-lg w-full
        opacity-0 translate-y-5 transition-[opacity,transform,border-color] duration-300 ease-out
        hover:border-stone-400">

      {/* Number badge */}
      <div className="w-7 h-7 bg-green-700 flex items-center justify-center text-white font-archivo text-xs font-bold shrink-0 mt-0.5 rounded-md">
        {doc.number}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-archivo text-base text-stone-900 font-semibold mb-1 tracking-tight">{doc.title}</h3>
        <p className="font-jakarta text-xs text-stone-600 leading-relaxed mb-3">{doc.desc}</p>
        <div className="flex flex-wrap gap-2 max-[640px]:flex-col">
          <span className="font-jakarta text-[11px] text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md whitespace-nowrap">
            <strong className="text-stone-900 font-semibold">Format:</strong> {doc.format}
          </span>
          <span className="font-jakarta text-[11px] text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md whitespace-nowrap">
            <strong className="text-stone-900 font-semibold">Max Size:</strong> {doc.size}
          </span>
          <span className={`font-jakarta text-[11px] px-2 py-0.5 rounded-md whitespace-nowrap border
            ${doc.extra.accent ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-stone-100 text-stone-600 border-stone-200"}`}>
            <strong className={doc.extra.accent ? "text-amber-900 font-semibold" : "text-stone-900 font-semibold"}>{doc.extra.label}:</strong> {doc.extra.value}
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
        <div ref={headerRef} className="reveal-block flex items-center gap-3 pb-3 border-b-2 border-stone-200 mb-2">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-emerald-700" />
          </div>
          <h2 className="font-archivo text-2xl text-stone-900 font-bold tracking-tight">Required Documents</h2>
        </div>
        <p className="font-jakarta text-sm text-stone-600 leading-relaxed mb-6">
          Prepare these documents before starting your application. All documents must be clear, legible scans or photos.
        </p>

        {/* Cards */}
        <div className="flex flex-col gap-[0.85rem] mb-6">
          {DOCUMENTS.map((doc, i) => <DocCard key={i} doc={doc} />)}
        </div>

        {/* Reminders */}
        <div className="bg-amber-50/60 border border-amber-200 p-5 rounded-lg">
          <div className="flex items-center gap-2 font-archivo text-sm font-semibold text-amber-900 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0" />
            Important Guidelines
          </div>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {REMINDERS.map((r, i) => (
              <li key={i}
                className="font-jakarta text-xs text-amber-900/90 pl-4 relative leading-relaxed
                  before:content-['•'] before:absolute before:left-0 before:text-amber-700 before:font-bold">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}