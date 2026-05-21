import useScrollReveal from "/src/hooks/useScrollReveal";
import { useNavigate } from "react-router-dom";

export default function FAQsCTA() {
  const ref      = useScrollReveal({ threshold: 0.2 });
  const navigate = useNavigate();

  const handleContact = () => {
    navigate("/about");
    setTimeout(() => {
      const el = document.getElementById("contact-section");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  return (
    <section className="bg-brand-bg px-8 pb-20 box-border max-[640px]:px-5 max-[640px]:pb-16">
      <div ref={ref}
        className="reveal-block relative max-w-[60rem] mx-auto bg-brand-primary rounded-[1.25rem] px-8 py-12 text-center overflow-hidden box-border max-[640px]:px-6 max-[640px]:py-8">

        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "2rem 2rem" }} />

        {/* Glow orb */}
        <div className="absolute w-80 h-80 -top-24 -right-16 rounded-full blur-[40px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(27,107,58,0.4) 0%, transparent 70%)" }} />

        <div className="relative z-[1]">
          <h2 className="font-archivo text-[clamp(1.4rem,3vw,2rem)] text-white tracking-[-0.02em] mb-2">
            Still Have Questions?
          </h2>
          <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-white/55 leading-[1.7] mb-7">
            Can't find the answer you're looking for? We're here to help!
          </p>
          <button onClick={handleContact}
            className="inline-flex items-center px-8 py-3 bg-white text-brand-primary font-jakarta text-[0.95rem] font-bold rounded-[0.65rem]
              transition-[background,transform,box-shadow] duration-200
              hover:bg-[#f0faf4] hover:-translate-y-0.5 hover:shadow-[0_0.5rem_1.5rem_rgba(255,255,255,0.15)]">
            Contact Us
          </button>
        </div>
      </div>
    </section>
  );
}