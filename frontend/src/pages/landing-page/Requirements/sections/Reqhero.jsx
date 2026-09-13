export default function ReqHero() {
  return (
    <section className="relative bg-brand-primary px-10 pt-20 pb-28 overflow-hidden text-center max-[640px]:px-6 max-[640px]:pt-16 max-[640px]:pb-24">


      {/* Content */}
      <div className="relative z-[1]">

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
          {["5 Documents Required", "₱150 Total Fees", "15–30 min Processing"].map(pill => (
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