import useScrollReveal from "../../../../hooks/useScrollReveal";
import LocationIcon from "../../../../assets/about-icons/location.png";

const GMAPS_URL = "https://www.google.com/maps/place/New+Sariaya+Municipal+Hall/@13.9569516,121.5118002,1151m/data=!3m1!1e3!4m6!3m5!1s0x33bd4f001084db1b:0xb64703c8f579b191!8m2!3d13.9566288!4d121.5140318!16s%2Fg%2F11xd8mkr77?entry=ttu&g_ep=EgoyMDI2MDMwNC4xIKXMDSoASAFQAw%3D%3D";
const EMBED_SRC = "https://www.google.com/maps/embed?pb=!4v1772712980735!6m8!1m7!1sCAoSHENJQUJJaEE0Z3VIc1hrRW4tN3ZhNUpIMm9mQ20.!2m2!1d13.95735761845487!2d121.5140318247651!3f324.87219963259867!4f-38.99672389730038!5f0.7820865974627469";

export default function AboutMap() {
  const headerRef  = useScrollReveal({ threshold: 0.2 });
  const contentRef = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="bg-brand-bg py-16 relative overflow-hidden max-[640px]:py-12">
      <div className="max-w-[64rem] mx-auto px-8 max-[640px]:px-5">

        {/* Header */}
        <div ref={headerRef} className="reveal-block text-center mb-8">
          <h2 className="font-archivo text-[clamp(1.6rem,3vw,2.4rem)] text-brand-primary tracking-[-0.02em] mb-2">Office Location</h2>
          <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-stone-600 leading-[1.7]">
            Visit the Sariaya Municipal Agriculture Office for in-person document filing and account support
          </p>
        </div>

        {/* Map card */}
        <div ref={contentRef}
          className="reveal-block bg-white border border-stone-200 rounded-xl overflow-hidden box-border">

          {/* Iframe */}
          <div className="w-full h-[28rem] relative max-[640px]:h-[20rem]">
            <iframe
              src={EMBED_SRC}
              className="absolute inset-0 w-full h-full border-0 block"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="New Sariaya Municipal Hall"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between flex-wrap gap-4 px-6 py-4 border-t border-stone-200 bg-white box-border
            max-[640px]:flex-col max-[640px]:items-start">

            <div className="flex items-center gap-3">
              <img src={LocationIcon} alt="" className="w-5 h-5 object-contain shrink-0" />
              <div>
                <p className="font-archivo text-[14px] text-stone-900 m-0 mb-0.5">Sariaya Municipal Hall</p>
                <p className="font-jakarta text-[12px] text-stone-600 m-0">Municipal Agriculture Office · Mon–Fri, 8:00 AM – 5:00 PM</p>
              </div>
            </div>

            <a href={GMAPS_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-green-700 text-white font-jakarta text-[13px] font-semibold rounded-md no-underline whitespace-nowrap hover:bg-green-600 transition-colors duration-150 max-[640px]:w-full max-[640px]:justify-center">
              Open in Google Maps
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}