import { useRef, useEffect } from "react";
import useScrollReveal from '../../../../hooks/useScrollReveal';
import { UserCheck, ClipboardList, ShieldCheck, QrCode } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: UserCheck,
    title: "Create Your Account",
    desc: "Register with your legal name and mobile number. Confirm your identity via one-time SMS security code.",
    deliverable: "Verified Account",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "Submit Transport Request",
    desc: "Specify source barangay, destination, and livestock details. Attach required licenses or standing credentials.",
    deliverable: "OCR Document Check",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Official Verification",
    desc: "Municipal Agriculture Office and Provincial Veterinarian review health certificates and census records.",
    deliverable: "Regulatory Approval",
  },
  {
    number: "04",
    icon: QrCode,
    title: "Receive Verified Permit",
    desc: "Settle statutory fees online or at the Municipal Hall. Download your approved permit with an official checkpoint QR code.",
    deliverable: "Official QR Pass",
  },
];

export default function HowItWorks() {
  const headerRef = useScrollReveal({ threshold: 0.2 });
  const stepsRef  = useRef(null);

  useEffect(() => {
    const container = stepsRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          container.querySelectorAll(".hiw-step").forEach((step, i) => {
            setTimeout(() => step.classList.add("is-visible"), i * 100);
          });
          observer.unobserve(container);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-brand-bg py-20 relative overflow-hidden">
      <div className="relative z-[1] max-w-[1200px] mx-auto px-10 max-[560px]:px-5">
        {/* Header */}
        <div ref={headerRef} className="reveal-block text-center mb-14 max-[560px]:mb-10">
          <h2 className="font-archivo text-[clamp(28px,3.5vw,40px)] text-brand-primary leading-[1.12] mb-3 tracking-[-0.02em]">
            Application Workflow
          </h2>
          <p className="font-jakarta text-[15px] text-stone-600 leading-[1.75] max-w-[520px] mx-auto">
            From initial registration to checkpoint clearance in four auditable steps.
          </p>
        </div>

        {/* Steps Grid */}
        <div ref={stepsRef} className="grid grid-cols-4 gap-6 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {STEPS.map(({ number, icon: Icon, title, desc, deliverable }, i) => (
            <div key={i} className="hiw-step flex flex-col relative opacity-0 translate-y-6 transition-[opacity,transform] duration-300 ease-out">

              {/* Step Card */}
              <div className="bg-white p-6 border border-stone-200 rounded-lg h-full flex flex-col justify-between transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-sm">
                <div>
                  {/* Top row: Icon badge + Monospace step counter */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="w-10 h-10 bg-stone-50 border border-stone-200 rounded-md flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-green-800" strokeWidth={2} />
                    </div>
                    <span className="font-mono text-xs font-semibold text-stone-400">
                      Step {number}
                    </span>
                  </div>

                  <h3 className="font-archivo text-base font-semibold text-stone-900 mb-2 leading-snug tracking-tight">
                    {title}
                  </h3>
                  <p className="font-jakarta text-xs sm:text-sm text-stone-600 leading-relaxed mb-4">
                    {desc}
                  </p>
                </div>

                {/* Bottom deliverable meta */}
                <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-jakarta">
                  <span className="text-stone-400 font-medium">Deliverable</span>
                  <span className="font-semibold text-stone-700 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded text-[11px]">
                    {deliverable}
                  </span>
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}