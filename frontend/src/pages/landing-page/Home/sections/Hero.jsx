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
          <h1 className="font-archivo text-[clamp(36px,4.5vw,56px)] leading-[1.08] text-white mb-6 tracking-[-0.02em]">
            Streamline Your<br />
            <span className="text-brand-amber">Livestock Transport</span><br />
            Permits
          </h1>

          {/* Subtitle */}
          <p className="font-jakarta text-[16px] leading-[1.75] text-white/70 mb-10 max-w-[480px] max-[900px]:mx-auto font-normal">
            FarmPass digitizes the livestock shipping permit workflow for Sariaya.
            Apply for transport permits online, track regulatory reviews in real-time,
            and present verified permits at municipal checkpoints.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-4 mb-10 max-[900px]:justify-center flex-wrap">
            <div className="w-[180px] h-[46px] shrink-0">
              <LandingButton
                label="Create Account"
                bgColor="#f5a623"
                textColor="#0a2a1a"
                baseColor="#f5a623"
                onClick={() => {
                  navigate("/register");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center bg-transparent border border-white/30 text-white font-jakarta text-[14px] font-semibold px-6 py-2.5 h-[46px] rounded-md cursor-pointer transition-colors duration-150 hover:bg-white/10 hover:border-white"
              onClick={() => {
                navigate("/requirements");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              View Requirements
            </button>
          </div>

          {/* Trust row */}
          <div className="flex items-center gap-3 max-[900px]:justify-center">
            <p className="font-jakarta text-[13px] text-white/60">
              Official livestock regulatory portal · Sariaya Municipal Agriculture Office
            </p>
          </div>
        </div>

        {/* RIGHT: Visual Mockup */}
        <div className="relative flex items-center justify-center max-[900px]:mt-2">
          {/* Mockup frame */}
          <div className="relative z-[1] border border-white/20 bg-black/20 p-2 rounded-lg">
            <img src={MockupImage} alt="FarmPass application preview" className="w-full max-w-[460px] block rounded-md" />
          </div>
        </div>
      </div>

      {/* Grounding divider */}
      <div className="relative z-[1] leading-[0] mt-auto">
        <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full h-[60px] block">
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#f8faf8" />
        </svg>
      </div>
    </section>
  );
}