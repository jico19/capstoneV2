import { useRef, useEffect } from "react";
import useScrollReveal from '../../../../hooks/useScrollReveal';

const STEPS = [
  { number: "01", title: "Create Your Account",     desc: "Sign up with your legal name and mobile number. Confirm your phone via one-time SMS code." },
  { number: "02", title: "Submit Transport Request", desc: "Specify origin barangay, destination, and livestock details. Attach required handler licenses." },
  { number: "03", title: "Official Verification",   desc: "The Municipal Agriculture Office and OPV review health records and validate livestock count." },
  { number: "04", title: "Receive Verified Permit",  desc: "Once approved, download your official transport permit with a checkpoint-ready QR code." },
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
            setTimeout(() => step.classList.add("is-visible"), i * 120);
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
            From initial application to checkpoint clearance in four clear steps.
          </p>
        </div>

        {/* Steps Grid */}
        <div ref={stepsRef} className="grid grid-cols-4 gap-6 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          {STEPS.map(({ number, title, desc }, i) => (
            <div key={i} className="hiw-step flex flex-col relative opacity-0 translate-y-6 transition-[opacity,transform] duration-300 ease-out">

              {/* Step Card */}
              <div className="bg-white p-6 border border-stone-200 rounded-lg h-full flex flex-col justify-between">
                <div>
                  <div className="w-9 h-9 bg-green-700 text-white font-mono font-bold text-xs flex items-center justify-center rounded-md mb-4">
                    {number}
                  </div>
                  <h3 className="font-archivo text-[15px] text-stone-900 mb-2 leading-snug">{title}</h3>
                  <p className="font-jakarta text-[13px] text-stone-600 leading-[1.65]">{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}