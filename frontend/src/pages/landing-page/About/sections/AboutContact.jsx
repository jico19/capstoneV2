import { useRef, useEffect } from "react";
import useScrollReveal from "../../../../hooks/useScrollReveal";
import { MapPin, Clock, Phone, Headphones } from "lucide-react";
import LoginBg      from "../../../../assets/login-bg.png";

const CARDS = [
  {
    icon: MapPin,
    color: "text-amber-300",
    title: "Office Location",
    lines: ["Municipal Agriculture Office", "Ground Floor, Sariaya Municipal Hall", "Sariaya, Quezon Province 4322"],
    bg: "bg-amber-400/15 border-amber-400/30",
  },
  {
    icon: Clock,
    color: "text-emerald-300",
    title: "Service Hours",
    lines: ["Monday to Friday", "8:00 AM – 5:00 PM", "Closed on weekends and public holidays"],
    bg: "bg-emerald-400/15 border-emerald-400/30",
  },
  {
    icon: Phone,
    color: "text-sky-300",
    title: "Direct Inquiries",
    lines: ["Office: (042) 525-8200", "Email: agri@sariaya.gov.ph", "Official Portal: sariaya.gov.ph"],
    bg: "bg-sky-400/15 border-sky-400/30",
  },
  {
    icon: Headphones,
    color: "text-teal-300",
    title: "Online Permitting",
    lines: ["Permit application: 24/7 online", "Staff review: Regular office hours", "Checkpoint QR scans: Active anytime"],
    bg: "bg-teal-400/15 border-teal-400/30",
  },
];

function ContactCard({ card }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("is-visible"); observer.unobserve(el); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Icon = card.icon;

  return (
    <div ref={ref}
      className="contact-card-inner bg-white/10 border border-white/20 p-5 rounded-lg box-border w-full opacity-0 transition-[opacity,transform,background-color] duration-200 hover:bg-white/15 group">

      <div className="flex items-start gap-4">
        {/* Icon wrap */}
        <div className={`w-11 h-11 shrink-0 ${card.bg} border rounded-md flex items-center justify-center mt-0.5 transition-transform duration-200 group-hover:scale-105`}>
          <Icon className={`w-5 h-5 ${card.color}`} strokeWidth={2} />
        </div>

        <div className="min-w-0">
          <h3 className="font-archivo text-[15px] text-white tracking-tight mb-1">
            {card.title}
          </h3>
          <div className="flex flex-col gap-0.5 text-xs text-white/70">
            {card.lines.map((line, i) => (
              <p key={i} className="font-jakarta leading-[1.6] m-0">{line}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutContact() {
  const rightRef = useScrollReveal({ threshold: 0.1 });

  return (
    <section id="contact-section" className="relative overflow-hidden py-20">

      {/* Background image */}
      <img src={LoginBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none" />

      {/* Dark solid overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[#0a2a1a]/90" />

      {/* Content */}
      <div className="relative z-[1] max-w-[1200px] mx-auto px-10 max-[640px]:px-5">
        <div className="max-w-[600px] mb-10">
          <h2 className="font-archivo text-[clamp(28px,3.5vw,40px)] text-white tracking-tight mb-3">
            Contact & Service Information
          </h2>
          <p className="font-jakarta text-[15px] text-white/70 leading-[1.7]">
            Reach out to the Sariaya Municipal Agriculture Office for technical assistance,
            document requirements, or account verification.
          </p>
        </div>

        <div ref={rightRef} className="reveal-block grid grid-cols-2 gap-4 max-[768px]:grid-cols-1">
          {CARDS.map((card, i) => <ContactCard key={i} card={card} />)}
        </div>
      </div>
    </section>
  );
}