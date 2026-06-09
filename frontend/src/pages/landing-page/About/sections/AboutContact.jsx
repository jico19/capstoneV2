import { useRef, useEffect, useState } from "react";
import useScrollReveal from "../../../../hooks/useScrollReveal";
import LandingButton from "../../../../components/ui/LandingButton";
import PhoneIcon    from "../../../../assets/about-icons/phone.png";
import LocationIcon from "../../../../assets/about-icons/location.png";
import ServicesIcon from "../../../../assets/about-icons/services.png";
import ClockIcon    from "../../../../assets/about-icons/clock.png";
import LoginBg      from "../../../../assets/login-bg.png";

const CARDS = [
  { icon: LocationIcon, title: "Office Location",
    lines: ["Municipal Agriculture Office", "Sariaya, Quezon Province", "Philippines 4322"],
    accent: "#52b788" },
  { icon: ClockIcon, title: "Office Hours",
    lines: ["Monday – Friday", "8:00 AM – 5:00 PM", "Closed on weekends and holidays"],
    accent: "#f5a623" },
  { icon: PhoneIcon, title: "Contact Information",
    lines: ["Phone: (042) XXX-XXXX", "Mobile: +63 9XX-XXX-XXXX", "Email: agri@sariaya.gov.ph"],
    accent: "#4db8e8" },
  { icon: ServicesIcon, title: "Online Services",
    lines: ["Application submission: 24/7", "Support: During office hours", "Website: www.sariaya.gov.ph"],
    accent: "#52b788" },
];

const SUBJECTS = ["General Inquiry", "Application Issue", "Technical Problem", "Feedback"];

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

  return (
    <div ref={ref}
      className="contact-card-inner group relative bg-white/[0.05] border border-white/[0.10] rounded-2xl p-5 box-border w-full overflow-hidden backdrop-blur-sm
        opacity-0 transition-[opacity,transform,background,box-shadow] duration-500 ease-out
        hover:bg-white/[0.11] hover:-translate-y-1 hover:shadow-[0_0.75rem_2rem_rgba(0,0,0,0.25)]">

      <div className="flex items-center gap-4">
        {/* Icon wrap */}
        <div className="w-[2.6rem] h-[2.6rem] shrink-0 rounded-[0.6rem] flex items-center justify-center"
          style={{ background: `${card.accent}18`, border: `1px solid ${card.accent}35` }}>
          <img src={card.icon} alt={card.title} className="w-[1.3rem] h-[1.3rem] object-contain"
            style={{ filter: "brightness(0) invert(1) opacity(0.85)" }} />
        </div>

        <div className="min-w-0">
          <h3 className="font-archivo text-[clamp(0.88rem,1.2vw,0.97rem)] tracking-[-0.01em] mb-1"
            style={{ color: card.accent }}>
            {card.title}
          </h3>
          <div className="flex flex-col gap-0">
            {card.lines.map((line, i) => (
              <p key={i} className="font-jakarta text-[clamp(0.78rem,1vw,0.85rem)] text-white/60 leading-[1.6] m-0">{line}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] opacity-60 origin-left scale-x-0 group-hover:scale-x-100 group-hover:opacity-100 transition-transform duration-[350ms] ease-out"
        style={{ background: card.accent }} />
    </div>
  );
}

export default function AboutContact() {
  const formRef  = useScrollReveal({ threshold: 0.1 });
  const rightRef = useScrollReveal({ threshold: 0.1 });

  const [form, setForm]           = useState({ name: "", contact: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = () => {
    if (!form.name || !form.contact || !form.subject || !form.message) return;
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setForm({ name: "", contact: "", subject: "", message: "" }); }, 4000);
  };

  const inputCls = "w-full box-border px-4 py-3 bg-white/[0.07] border-[1.5px] border-white/[0.12] rounded-[0.6rem] font-jakarta text-[clamp(0.85rem,1.2vw,0.95rem)] text-white outline-none transition-[border-color,box-shadow,background] duration-200 placeholder:text-white/30 focus:border-brand-amber focus:bg-white/[0.10] focus:shadow-[0_0_0_3px_rgba(245,166,35,0.12)]";

  return (
    <section id="contact-section" className="relative overflow-hidden">

      {/* Background image */}
      <img src={LoginBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none" />

      {/* gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(6,26,15,0.88) 0%, rgba(8,32,18,0.82) 50%, rgba(6,26,15,0.92) 100%)" }} />

      {/* stripe texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(-55deg,transparent,transparent 2rem,rgba(255,255,255,0.012) 2rem,rgba(255,255,255,0.012) 2.1rem)" }} />

      {/* Wave top */}
      <div className="leading-[0] relative z-[1]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-16 max-[640px]:h-10 block">
          <path d="M0,40 C360,0 1080,80 1440,40 L1440,0 L0,0 Z" fill="#f8faf8"/>
        </svg>
      </div>

      <div className="relative z-[1] max-w-[72rem] mx-auto px-8 pb-10 max-[640px]:px-4 max-[640px]:pb-8">

        {/* Centered header */}
        <div className="text-center mb-10">
          <span className="inline-block font-jakarta text-[0.75rem] font-bold tracking-[0.14em] uppercase text-brand-amber bg-brand-amber/10 border border-brand-amber/25 rounded-full px-[0.9rem] py-[0.3rem] mb-3">
            Get in Touch
          </span>
          <h2 className="font-archivo text-[clamp(1.6rem,3vw,2.4rem)] text-white tracking-[-0.02em] mb-2">Contact Us</h2>
          <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-white/50 leading-[1.7]">
            Multiple ways to reach us for your permit and application needs
          </p>
        </div>

        {/* Two-column layout */}
          <div ref={rightRef} className="grid grid-cols-2 gap-4 reveal-block min-w-0 w-full box-border">
            {CARDS.map((card, i) => <ContactCard key={i} card={card} />)}
          </div>
        </div>

      {/* Wave bottom */}
      <div className="leading-[0] relative z-[1]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-16 max-[640px]:h-10 block">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8faf8"/>
        </svg>
      </div>
    </section>
  );
}