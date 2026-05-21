import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LandingButton from "/src/components/ui/LandingButton";
import CtaBg from '/src/assets/home-icons/CTA-bg.png'


export default function CTA() {
  const navigate = useNavigate();
  const ctaRef   = useRef(null);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("is-visible"); observer.unobserve(el); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden pt-[120px] max-[600px]:pt-20">

      {/* Background image */}
      <img src={CtaBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none" />

      {/* gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(6,26,15,0.80) 0%, rgba(10,42,26,0.62) 45%, rgba(6,26,15,0.90) 100%)" }} />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />

      {/* Rings */}
      <div className="absolute w-[600px] h-[600px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04] pointer-events-none" />
      <div className="absolute w-[900px] h-[900px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04] pointer-events-none" />

      {/* Content */}
      <div ref={ctaRef}
        className="reveal-block relative z-[1] max-w-[720px] mx-auto px-10 pb-20 text-center max-[600px]:px-6 max-[600px]:pb-16">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-[18px] py-[7px] bg-brand-amber/12 border border-brand-amber/30 rounded-full font-jakarta text-[12px] font-bold text-brand-amber tracking-[0.05em] uppercase mb-8">
          <span className="animate-cta-pulse w-[7px] h-[7px] bg-brand-amber rounded-full" />
          Join 500+ Filipino Farmers
        </div>

        {/* Title */}
        <h2 className="font-archivo text-[clamp(36px,6vw,72px)] text-white leading-[1.05] mb-6 tracking-[-0.03em]">
          Ready to Get<br />
          <span className="text-brand-amber relative inline-block
            after:content-[''] after:absolute after:bottom-1 after:left-0 after:w-full after:h-1 after:rounded-sm
            after:[background:linear-gradient(90deg,#f5a623,rgba(245,166,35,0.2))]">Started?</span>
        </h2>

        {/* Subtitle */}
        <p className="font-jakarta text-[17px] text-white/60 leading-[1.75] mb-12 max-w-[520px] mx-auto">
          Say goodbye to long queues and paperwork. FarmPass lets you apply
          for livestock transport permits online — fast, secure, and free.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-[220px] h-[52px]">
            <LandingButton label="Create Free Account" bgColor="#f5a623" textColor="#0a2a1a" baseColor="#5a3b00" onClick={() => navigate("/register")} />
          </div>
          <button
            className="bg-transparent border-none font-jakarta text-[14px] text-white/45 cursor-pointer transition-colors duration-200 hover:text-white/85 p-0"
            onClick={() => navigate("/login")}
          >
            Already have an account? Sign in →
          </button>
        </div>

        {/* Trust */}
        <div className="flex items-center justify-center gap-5 flex-wrap max-[600px]:flex-col max-[600px]:gap-[10px]">
          {["No credit card required", "100% free for farmers", "Setup in under 5 minutes"].map((item, i, arr) => (
            <span key={item} className="flex items-center gap-[10px]">
              <span className="flex items-center gap-[6px] font-jakarta text-[13px] text-white/45 font-medium">
                <span className="text-brand-mint font-bold text-[14px]">✓</span>
                {item}
              </span>
              {i < arr.length - 1 && <span className="w-1 h-1 bg-white/15 rounded-full max-[600px]:hidden" />}
            </span>
          ))}
        </div>
      </div>

      {/* Wave into footer */}
      <div className="leading-[0] -mt-[2px]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-[80px] block">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#061a0f" />
        </svg>
      </div>
    </section>
  );
}