import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LandingButton from '../../../../components/ui/LandingButton';
import CtaBg from '../../../../assets/home-icons/CTA-bg.png';

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
    <section className="relative overflow-hidden pt-24 pb-20">

      {/* Background image */}
      <img src={CtaBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none" />

      {/* Solid dark overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[#0a2a1a]/90" />

      {/* Content */}
      <div ref={ctaRef}
        className="reveal-block relative z-[1] max-w-[680px] mx-auto px-6 text-center">

        <h2 className="font-archivo text-[clamp(32px,5vw,52px)] text-white leading-[1.1] mb-5 tracking-[-0.02em]">
          Ready to Apply for Your Transport Permit?
        </h2>

        <p className="font-jakarta text-[16px] text-white/70 leading-[1.7] mb-8 max-w-[500px] mx-auto">
          Submit your livestock shipping request online today. Free registration for licensed Sariaya farmers and haulers.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-[200px] h-[48px]">
            <LandingButton
              label="Create Account"
              bgColor="#f5a623"
              textColor="#0a2a1a"
              baseColor="#f5a623"
              onClick={() => {
                navigate("/register");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
          <button
            type="button"
            className="bg-transparent border-none font-jakarta text-[13px] text-white/60 cursor-pointer transition-colors duration-150 hover:text-white p-2"
            onClick={() => {
              navigate("/login");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Already registered? Sign in
          </button>
        </div>
      </div>
    </section>
  );
}