import useScrollReveal from "/src/hooks/useScrollReveal";
import DownloadIcon from "/src/assets/requirements-icons/download.png";
import DocumentIcon from "/src/assets/requirements-icons/document.png";

const DOWNLOADS = [
  { label: "Sample Ownership Certificate", file: "#" },
  { label: "Application Guide (PDF)",       file: "#" },
  { label: "Document Checklist",            file: "#" },
];

export default function Downloads() {
  const sectionRef = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="relative overflow-hidden
      before:content-[''] before:absolute before:inset-0 before:pointer-events-none
      before:[background-image:radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)]
      before:[background-size:2rem_2rem]"
      style={{ background: "linear-gradient(150deg, #0a2a1a 0%, #1b6b3a 60%, #061a0f 100%)" }}>

      {/* Wave top */}
      <div className="leading-[0] relative z-[1]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-20 block">
          <path d="M0,40 C360,0 1080,80 1440,40 L1440,0 L0,0 Z" fill="#f8faf8"/>
        </svg>
      </div>

      <div ref={sectionRef} className="reveal-block relative z-[1] max-w-[54rem] mx-auto px-8 pt-4 pb-8 max-[640px]:px-5">

        {/* Header */}
        <div className="flex items-center gap-3 pb-[0.9rem] border-b-2 border-white/10 mb-[0.6rem]">
          <img src={DownloadIcon} alt="" className="w-7 h-7 object-contain" style={{ filter: "brightness(0) invert(1) opacity(0.85)" }} />
          <h2 className="font-archivo text-[clamp(1.2rem,2vw,2rem)] text-white tracking-[-0.01em]">Download Document Templates</h2>
        </div>
        <p className="font-jakarta text-[clamp(0.88rem,1.2vw,0.97rem)] text-white/55 leading-[1.75] mb-6">
          Download these templates to help prepare your application documents.
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap gap-[0.85rem] max-[640px]:flex-col">
          {DOWNLOADS.map(({ label, file }, i) => (
            <a key={i} href={file} download
              className="group inline-flex items-center gap-[0.6rem] px-[1.4rem] py-[0.8rem] bg-white/[0.06] border-[1.5px] border-white/18 rounded-[0.7rem]
                font-jakarta text-[clamp(0.82rem,1.1vw,0.92rem)] font-semibold text-white no-underline whitespace-nowrap
                transition-[background,border-color,transform,box-shadow,color] duration-[250ms]
                hover:bg-brand-amber hover:border-brand-amber hover:text-brand-primary hover:-translate-y-[0.2rem] hover:shadow-[0_0.5rem_1.5rem_rgba(245,166,35,0.25)]
                max-[640px]:w-full max-[640px]:whitespace-normal">
              <img src={DocumentIcon} alt="" className="w-[1.1rem] h-[1.1rem] object-contain shrink-0
                  [filter:brightness(0)_invert(1)_opacity(0.85)] group-hover:[filter:brightness(0)_opacity(0.7)]" />
              <span className="flex-1">{label}</span>
              <span className="text-[0.85rem] opacity-60 ml-auto group-hover:opacity-100 group-hover:translate-y-[2px] transition-[opacity,transform] duration-200">↓</span>
            </a>
          ))}
        </div>
      </div>

      {/* Wave bottom */}
      <div className="leading-[0] relative z-[1]">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-20 block">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8faf8"/>
        </svg>
      </div>
    </section>
  );
}