import { useRef, useEffect } from "react";
import useScrollReveal from '../../../../hooks/useScrollReveal';
import TimeMoney    from '../../../../assets/home-icons/time-money.svg';
import Hours24      from '../../../../assets/home-icons/24hours-icon.svg';
import Tracking     from '../../../../assets/home-icons/tracking-icon.svg';
import Disease      from '../../../../assets/home-icons/disease-icon.svg';
import ErrorIcon    from '../../../../assets/home-icons/error-icon.svg';
import Transparency from '../../../../assets/home-icons/transparency-icon.svg';
import BenefitsBg   from '../../../../assets/home-icons/benefits-bg.jpg';

const BENEFITS = [
  { icon: TimeMoney,    title: "Save Time and Money",  desc: "No more trips to the municipal office. Submit your permit application online in minutes and eliminate transportation costs.", accent: "#f5a623" },
  { icon: Hours24,      title: "24/7 Access",           desc: "Apply for permits anytime, anywhere. The system is always online so farmers are never limited by office hours.",              accent: "#52b788" },
  { icon: Tracking,     title: "Real-Time Tracking",    desc: "Monitor the exact status of your application at every stage, from submission to approval to permit release.",               accent: "#4db8e8" },
  { icon: Disease,      title: "Disease Control",       desc: "Geospatial monitoring helps authorities track livestock movement and quickly respond to potential disease outbreaks.",        accent: "#e85d5d" },
  { icon: ErrorIcon,    title: "Reduced Errors",        desc: "OCR validation and automated checks catch incomplete or incorrect documents before submission, with fewer rejections.",           accent: "#f5a623" },
  { icon: Transparency, title: "Complete Transparency", desc: "Every action is logged and traceable. Farmers and authorities both have full visibility into the permit process.",            accent: "#52b788" },
];

function BenefitCard({ icon, title, desc, accent }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("is-visible"); observer.unobserve(el); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={cardRef}
      className="benefits-card group relative bg-white/[0.04] border border-white/[0.08] rounded-[16px] px-5 py-6 overflow-hidden cursor-default opacity-0 translate-y-9 transition-[opacity,transform,background,border-color,box-shadow] duration-300 hover:bg-white/[0.07] hover:border-white/[0.14] hover:shadow-[0_24px_60px_rgba(0,0,0,0.3)]">

      {/* Icon */}
      <div className="relative z-[1] w-[46px] h-[46px] rounded-[11px] flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-[4deg]"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
        <img src={icon} alt={title} className="w-5 h-5 object-contain" style={{ filter: "brightness(0) invert(1) opacity(0.85)" }} />
      </div>

      <h3 className="relative z-[1] font-archivo text-[15px] text-white mb-2 tracking-[-0.01em]">{title}</h3>
      <p className="relative z-[1] font-jakarta text-[13px] text-white/50 leading-[1.7] group-hover:text-white/70 transition-colors duration-300">{desc}</p>
    </div>
  );
}

export default function Benefits() {
  const headerRef = useScrollReveal({ threshold: 0.2 });
  const imgRef    = useScrollReveal({ threshold: 0.15 });

  return (
    <section className="bg-brand-primary relative pb-24 overflow-hidden">
      {/* Wave */}
      <div className="leading-[0] -mb-[2px]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-[80px] block">
          <path d="M0,40 C360,0 1080,80 1440,40 L1440,0 L0,0 Z" fill="#f8faf8" />
        </svg>
      </div>

      <div className="relative z-[1] max-w-[1200px] mx-auto px-10 pt-[72px] max-[560px]:px-5 max-[560px]:pt-[60px]">

        {/* Two-column layout */}
        <div className="flex gap-10 items-center max-[960px]:flex-col">

          {/* Left — image card, hidden on narrow screens */}
          <div ref={imgRef} className="reveal-block w-[380px] shrink-0 max-[960px]:hidden">
            <div className="rounded-[20px] overflow-hidden bg-white/[0.06] border border-white/[0.1]">
              <img
                src={BenefitsBg}
                alt="Supporting Filipino Farmers"
                className="w-full h-[700px] object-cover object-center block"
              />
              <div className="px-5 py-4">
                <p className="font-archivo text-[15px] text-white tracking-[-0.01em] mb-1">Supporting Filipino Farmers</p>
                <p className="font-jakarta text-[13px] text-white/50 leading-[1.6]">Making livestock transport safer, faster, and fully digital.</p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex-1 min-w-0">

            {/* Header */}
            <div ref={headerRef} className="reveal-block mb-10 max-[960px]:text-center max-[560px]:mb-8">
              <h2 className="font-archivo text-[clamp(28px,3.5vw,42px)] text-white leading-[1.12] mb-4 tracking-[-0.02em]">
                Benefits You Can<br />Count On
              </h2>
              <p className="font-jakarta text-[16px] text-white/50 leading-[1.75] max-w-[520px] max-[960px]:mx-auto">
                Designed for Filipino farmers and agriculture officers,
                FarmPass brings efficiency, security, and transparency to livestock transport permitting.
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1 max-[560px]:gap-3">
              {BENEFITS.map((b, i) => <BenefitCard key={i} {...b} />)}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}