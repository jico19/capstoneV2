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
  {
    icon: TimeMoney,
    title: "Reduced Transit Delays",
    desc: "Apply online prior to transport. Skip long checkpoint queues and avoid unnecessary travel to the municipal hall.",
    bg: "bg-amber-400/15 border-amber-400/30",
    filter: "invert(70%) sepia(85%) saturate(1200%) hue-rotate(5deg) brightness(98%)", // warm amber
  },
  {
    icon: Hours24,
    title: "24/7 Portal Access",
    desc: "Submit permit requests outside regular office hours for early morning livestock dispatches.",
    bg: "bg-emerald-400/15 border-emerald-400/30",
    filter: "invert(65%) sepia(60%) saturate(600%) hue-rotate(100deg) brightness(98%)", // emerald
  },
  {
    icon: Tracking,
    title: "Real-Time Tracking",
    desc: "Monitor your permit's progress across barangay endorsement and provincial veterinary clearance.",
    bg: "bg-sky-400/15 border-sky-400/30",
    filter: "invert(65%) sepia(60%) saturate(700%) hue-rotate(170deg) brightness(100%)", // sky blue
  },
  {
    icon: Disease,
    title: "Biosecurity Protection",
    desc: "Supports Sariaya's African Swine Fever surveillance by verifying origin zones and health inspections.",
    bg: "bg-rose-400/15 border-rose-400/30",
    filter: "invert(65%) sepia(60%) saturate(900%) hue-rotate(320deg) brightness(98%)", // rose/coral
  },
  {
    icon: ErrorIcon,
    title: "Document Accuracy",
    desc: "Instant document checks flag incomplete or unverified credentials before submission.",
    bg: "bg-indigo-400/15 border-indigo-400/30",
    filter: "invert(70%) sepia(50%) saturate(700%) hue-rotate(200deg) brightness(100%)", // indigo
  },
  {
    icon: Transparency,
    title: "Official Audit Trail",
    desc: "Every permit approval and checkpoint scan is permanently logged in the municipal records.",
    bg: "bg-teal-400/15 border-teal-400/30",
    filter: "invert(65%) sepia(60%) saturate(600%) hue-rotate(130deg) brightness(98%)", // teal
  },
];

function BenefitCard({ icon, title, desc, bg, filter }) {
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
      className="benefits-card bg-white/5 border border-white/10 p-5 rounded-lg cursor-default opacity-0 translate-y-6 transition-[opacity,transform,background-color] duration-200 hover:bg-white/10 group">

      {/* Icon */}
      <div className={`w-10 h-10 ${bg} border rounded-md flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-105`}>
        <img src={icon} alt="" className="w-5 h-5 object-contain" style={{ filter }} />
      </div>

      <h3 className="font-archivo text-[15px] text-white mb-1.5 tracking-tight">{title}</h3>
      <p className="font-jakarta text-[13px] text-white/70 leading-[1.6]">{desc}</p>
    </div>
  );
}

export default function Benefits() {
  const headerRef = useScrollReveal({ threshold: 0.2 });
  const imgRef    = useScrollReveal({ threshold: 0.15 });

  return (
    <section className="bg-brand-primary relative py-20 overflow-hidden">
      <div className="relative z-[1] max-w-[1200px] mx-auto px-10 max-[560px]:px-5">

        {/* Two-column layout */}
        <div className="flex gap-10 items-center max-[960px]:flex-col">

          {/* Left — image card, hidden on narrow screens */}
          <div ref={imgRef} className="reveal-block w-[380px] shrink-0 max-[960px]:hidden">
            <div className="border border-white/20 bg-white/5 p-2 rounded-xl">
              <img
                src={BenefitsBg}
                alt="Supporting Sariaya Livestock Farmers"
                className="w-full h-[520px] object-cover object-center block rounded-lg"
              />
              <div className="pt-3 px-1">
                <p className="font-archivo text-[14px] text-white mb-0.5">Supporting Sariaya Livestock Farmers</p>
                <p className="font-jakarta text-[12px] text-white/60">Digital permitting for safe, verifiable transport.</p>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="flex-1 min-w-0">

            {/* Header */}
            <div ref={headerRef} className="reveal-block mb-8 max-[960px]:text-center">
              <h2 className="font-archivo text-[clamp(28px,3.5vw,40px)] text-white leading-[1.12] mb-3 tracking-[-0.02em]">
                Benefits for Farmers & Inspectors
              </h2>
              <p className="font-jakarta text-[15px] text-white/70 leading-[1.7] max-w-[520px] max-[960px]:mx-auto">
                Built specifically for the Municipality of Sariaya to ensure regulatory compliance without administrative delays.
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3.5 max-[560px]:grid-cols-1">
              {BENEFITS.map((b, i) => <BenefitCard key={i} {...b} />)}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}