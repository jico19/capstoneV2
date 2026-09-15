import { useNavigate } from "react-router-dom";
import LandingButton from '../../../../components/ui/LandingButton';
import MockupImage from '../../../../assets/home-icons/mock-up.png';

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative bg-brand-primary min-h-[calc(100vh-68px)] flex flex-col overflow-hidden">

      {/* Inner grid */}
      <div className="relative z-[1] flex-1 max-w-[1200px] w-full mx-auto px-10 pt-20 pb-24
                      grid grid-cols-2 gap-[60px] items-center
                      max-[900px]:grid-cols-1 max-[900px]:px-6 max-[900px]:pt-14 max-[900px]:pb-20 max-[900px]:text-center">

        {/* LEFT: Content */}
        <div className="flex flex-col">

          {/* Title */}
          <h1 className="animate-hero-title opacity-0 font-archivo text-[clamp(36px,4.5vw,58px)] leading-[1.08] text-white mb-6 tracking-[-0.02em]">
            Streamline Your<br />
            <span className="text-brand-amber relative inline-block
              after:content-[''] after:absolute after:bottom-[2px] after:left-0 after:w-full after:h-[3px] after:rounded-sm after:origin-left after:scale-x-0 after:animate-hero-underline
              after:[background:linear-gradient(90deg,#f5a623,rgba(245,166,35,0.2))]">Livestock Transport</span><br />
            Permits
          </h1>

          {/* Subtitle */}
          <p className="animate-hero-subtitle opacity-0 font-jakarta text-[16px] leading-[1.75] text-white/62 mb-10 max-w-[480px] max-[900px]:mx-auto">
            FarmPass digitizes the entire livestock transport permit process.
            Submit applications online, track real-time status, and receive
            your permit with a scannable QR code, all from your phone.
          </p>

          {/* Actions */}
          <div className="animate-hero-actions opacity-0 flex items-center gap-5 mb-10 max-[900px]:justify-center flex-wrap">
            <div className="w-[180px] h-[48px] shrink-0">
              <LandingButton
                label="Create Account"
                bgColor="#f5a623"
                textColor="#0a2a1a"
                baseColor="#5a3b00"
                onClick={() => {
                  navigate("/register");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
            <button
              type="button"
              className="hero-btn-ghost inline-flex items-center gap-2 bg-transparent border border-white/20 rounded-md text-white/75 font-jakarta text-[15px] font-semibold px-[22px] py-[10px] cursor-pointer transition-all duration-200 hover:border-white/50 hover:text-white"
              onClick={() => {
                navigate("/requirements");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              View Requirements
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Trust row */}
          <div className="animate-hero-trust opacity-0 flex items-center gap-[14px] max-[900px]:justify-center">
            <p className="font-jakarta text-[13.5px] text-white/60">
              Official municipal portal serving farmers and livestock traders in Sariaya
            </p>
          </div>
        </div>

        {/* RIGHT: Visual */}
        <div className="animate-hero-visual opacity-0 relative flex items-center justify-center max-[900px]:mt-0">

          {/* Mockup frame */}
          <div className="relative z-[1] rounded-xl overflow-hidden border border-white/20">
            <img src={MockupImage} alt="FarmPass app mockup" className="w-full max-w-[460px] block rounded-xl" />
          </div>

          {/* Float card 1 */}
          <div className="animate-hero-float-1 opacity-0 absolute top-[12%] -left-8 bg-white/6 backdrop-blur-[16px] border border-white/12 rounded-lg px-[18px] py-3 flex flex-col gap-[2px] z-[2] max-[480px]:hidden"
            style={{ animation: "heroSlideUp 0.6s ease 1.0s forwards" }}>
            <span className="font-archivo text-[18px] text-brand-amber leading-none">Paperless</span>
            <span className="font-jakarta text-[11px] text-white/55 whitespace-nowrap">Online application</span>
          </div>

          {/* Float card 2 */}
          <div className="animate-hero-float-2 opacity-0 absolute bottom-[18%] -right-6 bg-white/6 backdrop-blur-[16px] border border-white/12 rounded-lg px-[18px] py-3 flex flex-col gap-[2px] z-[2] max-[480px]:hidden"
            style={{ animation: "heroSlideUp 0.6s ease 1.2s forwards" }}>
            <span className="font-archivo text-[18px] text-brand-amber leading-none">Secure</span>
            <span className="font-jakarta text-[11px] text-white/55 whitespace-nowrap">QR Verification</span>
          </div>

          {/* Float card 3 */}
          <div className="animate-hero-float-3 opacity-0 absolute bottom-[6%] left-[10%] bg-white/6 backdrop-blur-[16px] border border-white/12 rounded-lg px-[18px] py-3 flex flex-row items-center gap-2 z-[2] max-[480px]:hidden"
            style={{ animation: "heroSlideUp 0.6s ease 1.3s forwards" }}>
            <span className="w-2 h-2 bg-brand-mint rounded-full shrink-0" />
            <span className="font-jakarta text-[11px] text-white/55 whitespace-nowrap">System online</span>
          </div>
        </div>
      </div>

      {/* Wave */}
      <div className="relative z-[1] leading-[0] mt-auto">
        <svg viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" className="w-full h-[80px] block">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f8faf8" />
        </svg>
      </div>
    </section>
  );
}