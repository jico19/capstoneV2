import AgriLogo from "../../../../assets/sariaya-agri-logo.jpg";

export default function ReqHero() {
  return (
    <section className="relative bg-brand-primary px-10 pt-20 pb-28 overflow-hidden text-center max-[640px]:px-6 max-[640px]:pt-16 max-[640px]:pb-24">

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", backgroundSize: "2rem 2rem" }} />

      {/* Orbs */}
      <div className="absolute w-[32rem] h-[32rem] -top-48 -right-24 rounded-full blur-[60px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(27,107,58,0.45) 0%, transparent 70%)" }} />
      <div className="absolute w-80 h-80 -bottom-32 -left-16 rounded-full blur-[60px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)" }} />

      {/* Organic blobs */}
      <div className="absolute w-[28rem] h-72 top-[10%] right-[5%] rounded-[60%_40%_70%_30%/50%_60%_40%_50%] border-2 border-white/40 opacity-[0.06] pointer-events-none animate-blob-float max-[640px]:hidden" />
      <div className="absolute w-72 h-48 bottom-[15%] left-[3%] rounded-[60%_40%_70%_30%/50%_60%_40%_50%] border-2 border-white/40 opacity-[0.06] pointer-events-none max-[640px]:hidden"
        style={{ animation: "blobFloat 10s ease-in-out infinite reverse", transform: "rotate(15deg)" }} />

      {/* Content */}
      <div className="relative z-[1]">

        {/* Badge */}
        {/* <div className="animate-fade-up-1 inline-flex items-center gap-2.5 px-3 py-[6px] bg-brand-amber/12 border border-brand-amber/30 rounded-full font-jakarta text-[0.72rem] font-bold text-brand-amber tracking-[0.08em] uppercase mb-6">
          <img src={AgriLogo} alt="Sariaya Logo" className="w-5 h-5 rounded-full object-cover" />
          Livestock Transport Permit
        </div> */}

        {/* Title */}
        <h1 className="animate-fade-up-2 font-archivo text-[clamp(1.8rem,4vw,3.2rem)] text-white leading-[1.1] tracking-[-0.02em] mb-4">
          Application Requirements
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-up-3 font-jakarta text-[clamp(0.95rem,1.5vw,1.1rem)] text-white/60 max-w-[30rem] mx-auto leading-[1.75] mb-8">
          Everything you need to know before applying for a livestock transport permit
        </p>

        {/* Stat pills */}
        <div className="animate-fade-up-4 flex justify-center flex-wrap gap-3">
          {["6 Documents Required", "₱200 Total Fees", "15–30 min Processing"].map(pill => (
            <span key={pill} className="font-jakarta text-[0.82rem] font-semibold text-white/75 bg-white/[0.07] border border-white/12 rounded-full px-4 py-[6px]">
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* Wave */}
      <div className="absolute bottom-0 left-0 right-0 leading-[0]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-20 block">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8faf8" />
        </svg>
      </div>
    </section>
  );
}