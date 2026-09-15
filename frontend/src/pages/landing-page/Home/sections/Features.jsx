import { useRef, useEffect } from "react";
import useScrollReveal from '../../../../hooks/useScrollReveal';
import OcrIcon        from '../../../../assets/home-icons/ocr-icon.svg';
import QrIcon         from '../../../../assets/home-icons/qrcode-icon.svg';
import SmsIcon        from '../../../../assets/home-icons/sms-icon.svg';
import GeospatialIcon from '../../../../assets/home-icons/geospatial-icon.svg';
import FeaturesBg     from '../../../../assets/home-icons/feature-bg.jpg';

const ACCENT_FILTER = {
  "#f5a623": "brightness(0) saturate(100%) invert(70%) sepia(80%) saturate(500%) hue-rotate(350deg) brightness(100%)",
  "#52b788": "brightness(0) saturate(100%) invert(62%) sepia(40%) saturate(400%) hue-rotate(110deg) brightness(95%)",
  "#4db8e8": "brightness(0) saturate(100%) invert(65%) sepia(50%) saturate(400%) hue-rotate(175deg) brightness(100%)",
};

const FEATURES = [
  { icon: OcrIcon,        title: "OCR Document Validation", desc: "Automatically scans and validates livestock documents. Eliminates manual paperwork and reduces filing errors.",                 accent: "#f5a623" },
  { icon: QrIcon,         title: "QR Code Verification",    desc: "Every permit is issued with a tamper-proof QR code. Checkpoints scan instantly to verify authenticity.",                        accent: "#52b788" },
  { icon: SmsIcon,        title: "SMS Notifications",       desc: "Get instant text alerts at every stage: submission, approval, rejection, or when your permit is ready.",                       accent: "#f5a623" },
  { icon: GeospatialIcon, title: "Geospatial Monitoring",   desc: "Track livestock transport routes on a live map. Authorities can monitor all active transport in real time.",                    accent: "#52b788" },
];

export default function Features() {
  const headerRef = useScrollReveal({ threshold: 0.2 });
  const imgRef    = useScrollReveal({ threshold: 0.15 });
  const gridRef   = useRef(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          grid.querySelectorAll(".features-card").forEach((card, i) => {
            setTimeout(() => card.classList.add("is-visible"), i * 120);
          });
          observer.unobserve(grid);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-brand-bg py-24 relative overflow-hidden max-[560px]:py-[72px]">
      <div className="max-w-[1200px] mx-auto px-10 max-[560px]:px-5">

        {/* Top */}
        <div className="flex items-center gap-12 mb-14 max-[900px]:flex-col max-[900px]:gap-8 max-[560px]:mb-10">

          {/* Left */}
          <div ref={headerRef} className="reveal-block flex-1 min-w-0 max-[900px]:flex max-[900px]:flex-col max-[900px]:items-center max-[900px]:text-center">
            <h2 className="font-archivo text-[clamp(28px,3.5vw,42px)] text-brand-primary leading-[1.12] mb-4 tracking-[-0.02em]">
              Smart Features,<br />Secure System
            </h2>
            <p className="font-jakarta text-[16px] text-[#6c757d] leading-[1.75] max-w-[480px] max-[900px]:mx-auto">
              Our platform combines OCR document scanning with secure infrastructure to deliver
              an efficient and verifiable permit processing system.
            </p>
          </div>

          {/* Right */}
          <div ref={imgRef} className="reveal-block flex-1 min-w-0 max-[900px]:w-full">
            <img
              src={FeaturesBg}
              alt="Farmer using FarmPass on tablet"
              className="w-full h-[300px] object-cover object-center rounded-2xl shadow-[0_16px_48px_rgba(10,42,26,0.12)] max-[900px]:h-[260px] max-[560px]:h-[200px]"
            />
          </div>
        </div>

        {/* Bottom */}
        <div ref={gridRef} className="grid grid-cols-3 gap-6 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1 max-[560px]:gap-4">
          {FEATURES.map(({ icon, title, desc, accent }, i) => (
            <div key={i} className="features-card group bg-white rounded-[18px] p-8 border border-brand-primary/[0.07] relative overflow-hidden cursor-default opacity-0 translate-y-8 transition-[opacity,transform,box-shadow,border-color] duration-[550ms] ease-out hover:shadow-[0_16px_48px_rgba(10,42,26,0.1)] hover:border-brand-primary/[0.12]">

              {/* Icon */}
              <div className="w-14 h-14 rounded-[14px] flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-[1.08] group-hover:-rotate-3"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <img src={icon} alt={title} className="w-7 h-7 object-contain" style={{ filter: ACCENT_FILTER[accent] }} />
              </div>

              <h3 className="font-archivo text-[17px] text-brand-primary mb-[10px] tracking-[-0.01em]">{title}</h3>
              <p className="font-jakarta text-[14px] text-[#6c757d] leading-[1.7]">{desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}