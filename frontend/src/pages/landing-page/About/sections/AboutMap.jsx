import useScrollReveal from "../../../../hooks/useScrollReveal";
import LocationIcon from "../../../../assets/about-icons/location.png";

const GMAPS_URL = "https://www.google.com/maps/place/New+Sariaya+Municipal+Hall/@13.9569516,121.5118002,1151m/data=!3m1!1e3!4m6!3m5!1s0x33bd4f001084db1b:0xb64703c8f579b191!8m2!3d13.9566288!4d121.5140318!16s%2Fg%2F11xd8mkr77?entry=ttu&g_ep=EgoyMDI2MDMwNC4xIKXMDSoASAFQAw%3D%3D";
const EMBED_SRC = "https://www.google.com/maps/embed?pb=!4v1772712980735!6m8!1m7!1sCAoSHENJQUJJaEE0Z3VIc1hrRW4tN3ZhNUpIMm9mQ20.!2m2!1d13.95735761845487!2d121.5140318247651!3f324.87219963259867!4f-38.99672389730038!5f0.7820865974627469";

export default function AboutMap() {
  const headerRef  = useScrollReveal({ threshold: 0.2 });
  const contentRef = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="bg-brand-bg py-16 relative overflow-hidden max-[640px]:py-12
      before:content-[''] before:absolute before:-bottom-24 before:-left-24 before:w-96 before:h-96
      before:rounded-full before:border-[4rem] before:border-brand-primary/[0.03] before:pointer-events-none">

      <div className="max-w-[64rem] mx-auto px-8 max-[640px]:px-5">

        {/* Header */}
        <div ref={headerRef} className="reveal-block text-center mb-10">
          <span className="inline-block font-jakarta text-[0.75rem] font-bold tracking-[0.14em] uppercase text-brand-primary-mid bg-brand-primary-mid/[0.08] border border-brand-primary-mid/20 rounded-full px-[0.9rem] py-[0.3rem] mb-3">
            Where to Find Us
          </span>
          <h2 className="font-archivo text-[clamp(1.6rem,3vw,2.4rem)] text-brand-primary tracking-[-0.02em] mb-2">Find Us</h2>
          <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-[#6c757d] leading-[1.7]">
            Visit the Sariaya Municipal Agriculture Office
          </p>
        </div>

        {/* Map card */}
        <div ref={contentRef}
          className="reveal-block bg-white border border-[#e2ece6] rounded-[1.25rem] overflow-hidden shadow-[0_0.5rem_2rem_rgba(10,42,26,0.07)] box-border">

          {/* Iframe */}
          <div className="w-full h-[32rem] relative max-[640px]:h-[20rem]">
            <iframe
              src={EMBED_SRC}
              className="absolute inset-0 w-full h-full border-0 block"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="New Sariaya Municipal Hall"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-5 border-t border-[#e2ece6] bg-white box-border
            max-[640px]:flex-col max-[640px]:items-start">

            <div className="flex items-center gap-3">
              <img src={LocationIcon} alt="Location" className="w-[1.4rem] h-[1.4rem] object-contain shrink-0"
                style={{ filter: "invert(18%) sepia(50%) saturate(600%) hue-rotate(110deg) brightness(60%)" }} />
              <div>
                <p className="font-archivo text-[0.92rem] text-brand-primary m-0 mb-0.5">New Municipal Hall, Sariaya, Quezon</p>
                <p className="font-jakarta text-[0.78rem] text-[#6c757d] m-0">Municipal Agriculture Office · Mon–Fri, 8AM–5PM</p>
              </div>
            </div>

            <a href={GMAPS_URL} target="_blank" rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-5 py-[0.65rem] bg-brand-primary text-brand-amber font-jakarta text-[0.88rem] font-bold rounded-[0.65rem] no-underline whitespace-nowrap
                transition-[background,transform,box-shadow] duration-200
                hover:bg-brand-primary-light hover:-translate-y-0.5 hover:shadow-[0_0.4rem_1.2rem_rgba(10,42,26,0.2)]
                max-[640px]:w-full max-[640px]:justify-center max-[640px]:box-border">
              <span>Open in Google Maps</span>
              <span className="text-base group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">↗</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}