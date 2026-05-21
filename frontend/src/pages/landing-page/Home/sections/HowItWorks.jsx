import { useRef, useEffect } from "react";
import useScrollReveal from "/src/hooks/useScrollReveal";

const STEPS = [
  { number: "01", title: "Create Your Account",     desc: "Sign up in minutes. Fill in your personal information, address, and create your login credentials. Verify your mobile number via SMS.",                                                           accent: "#f5a623" },
  { number: "02", title: "Submit Your Application", desc: "Fill out the livestock transport permit form online. Upload required documents — FarmPass OCR validates them automatically.",                                                                      accent: "#52b788" },
  { number: "03", title: "Automatic Verification",  desc: "Our ML system reviews your application for completeness. The Municipal Agriculture Office is notified instantly for final approval.",                                                    accent: "#4db8e8" },
  { number: "04", title: "Get Your Permit",         desc: "Once approved, your permit is issued with a scannable QR code. Download it directly or receive it via SMS — ready for checkpoint inspection.",                                                    accent: "#f5a623" },
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
            setTimeout(() => step.classList.add("is-visible"), i * 150);
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
    <section className="bg-brand-bg py-24 relative overflow-hidden max-[560px]:py-[72px]">
      {/* BG circles */}
      <div className="absolute -top-[200px] -left-[200px] w-[500px] h-[500px] rounded-full border-[80px] border-brand-primary/[0.03] pointer-events-none" />
      <div className="absolute -bottom-[100px] -right-[80px] w-[320px] h-[320px] rounded-full border-[60px] border-brand-amber/[0.05] pointer-events-none" />

      <div className="relative z-[1] max-w-[1200px] mx-auto px-10 max-[560px]:px-5">

        {/* Header */}
        <div ref={headerRef} className="reveal-block text-center mb-[72px] max-[560px]:mb-12">
          <span className="inline-block font-jakarta text-[12px] font-bold tracking-[0.14em] uppercase text-brand-primary-light bg-brand-primary-light/8 border border-brand-primary-light/20 rounded-full px-[14px] py-[5px] mb-5">
            Simple Process
          </span>
          <h2 className="font-archivo text-[clamp(28px,3.5vw,42px)] text-brand-primary leading-[1.12] mb-4 tracking-[-0.02em]">How It Works</h2>
          <p className="font-jakarta text-[16px] text-[#6c757d] leading-[1.75] max-w-[520px] mx-auto">
            Get your livestock transport permit in four easy steps —
            fully online, no office visit required.
          </p>
        </div>

        {/* Steps */}
        <div ref={stepsRef} className="grid grid-cols-4 gap-0 relative items-start max-[900px]:grid-cols-2 max-[900px]:gap-x-6 max-[900px]:gap-y-10 max-[560px]:grid-cols-1 max-[560px]:gap-8">
          {STEPS.map(({ number, title, desc, accent }, i) => (
            <div key={i} className="hiw-step group flex flex-col items-center relative opacity-0 translate-y-9 transition-[opacity,transform] duration-[550ms] ease-out">

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className="hiw-connector">
                  <div className="hiw-connector-line" />
                  <div className="hiw-connector-arrow" />
                </div>
              )}

              {/* Badge */}
              <div className="w-14 h-14 rounded-full flex items-center justify-center relative z-[1] mb-6 shadow-[0_8px_24px_rgba(0,0,0,0.15)] shrink-0 transition-transform duration-300 group-hover:scale-110"
                style={{ background: accent }}>
                <span className="font-archivo text-[18px] text-white tracking-[-0.02em]">{number}</span>
              </div>

              {/* Card */}
              <div className="bg-white rounded-[16px] px-6 py-7 border border-brand-primary/[0.07] relative overflow-hidden w-full transition-[box-shadow,transform] duration-300 group-hover:shadow-[0_12px_40px_rgba(10,42,26,0.1)] group-hover:-translate-y-1">
                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: accent }} />

                <h3 className="font-archivo text-[16px] text-brand-primary mb-3 tracking-[-0.01em] leading-[1.3]">{title}</h3>
                <p className="font-jakarta text-[13.5px] text-[#6c757d] leading-[1.75]">{desc}</p>

                {/* Dot */}
                <div className="absolute bottom-[14px] right-[14px] w-2 h-2 rounded-full opacity-30 group-hover:opacity-100 transition-opacity duration-300" style={{ background: accent }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}