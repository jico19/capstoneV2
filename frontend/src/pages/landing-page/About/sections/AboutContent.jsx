import useScrollReveal from "../../../../hooks/useScrollReveal";
import AgriLogo from "../../../../assets/sariaya-agri-logo.jpg";

const WHY_FEATURES = [
  "Enabling 24/7 online application submission from anywhere",
  "Automatically validating documents using AI technology",
  "Cross-checking livestock counts with census data to prevent fraud",
  "Providing real-time application tracking and SMS notifications",
  "Generating tamper-proof permits with QR codes for checkpoint verification",
  "Supporting ASF disease control through integrated health monitoring",
];

const OFFICE_RESPONSIBILITIES = [
  "Regulating and monitoring livestock transport within and outside the municipality",
  "Conducting quarterly livestock census and health surveys",
  "Managing African Swine Fever (ASF) prevention and control programs",
  "Supporting farmers and traders with agricultural services",
  "Ensuring compliance with livestock transport regulations",
  "Maintaining accurate records of livestock populations per barangay",
];

const SDGS = [
  { code: "SDG 2",  title: "Zero Hunger",
    desc: "Protecting the food supply chain by ensuring safe, legal livestock transport and preventing disease spread.",
    color: "#f5a623" },
  { code: "SDG 9",  title: "Industry, Innovation & Infrastructure",
    desc: "Modernizing agricultural government services with AI/ML technology.",
    color: "#4db8e8" },
  { code: "SDG 16", title: "Peace, Justice & Strong Institutions",
    desc: "Increasing transparency, reducing corruption, and building accountable institutions.",
    color: "#52b788" },
];

function CheckList({ items }) {
  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-2 mb-5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 font-jakarta text-[clamp(0.85rem,1.2vw,0.93rem)] text-[#444] leading-[1.65]">
          <span className="w-5 h-5 bg-brand-primary rounded-full text-brand-mint text-[0.65rem] font-bold flex items-center justify-center shrink-0 mt-[2px]">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AboutContent() {
  const missionRef = useScrollReveal({ threshold: 0.1 });
  const officeRef  = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="bg-brand-bg py-16 relative overflow-hidden max-[640px]:py-12
      before:content-[''] before:absolute before:-top-32 before:-left-32 before:w-[28rem] before:h-[28rem]
      before:rounded-full before:border-[5rem] before:border-brand-primary/[0.025] before:pointer-events-none
      after:content-[''] after:absolute after:-bottom-24 after:-right-24 after:w-[22rem] after:h-[22rem]
      after:rounded-full after:border-[4rem] after:border-brand-amber/[0.04] after:pointer-events-none">

      <div className="max-w-[72rem] mx-auto px-8 max-[640px]:px-5">
        <div className="grid grid-cols-2 gap-14 items-start max-[896px]:grid-cols-1 max-[896px]:gap-10">

          {/* LEFT — Mission */}
          <div ref={missionRef} className="reveal-block">
            <h2 className="font-archivo text-[clamp(1.25rem,2vw,2rem)] text-brand-primary tracking-[-0.02em] leading-[1.2] pb-3 border-b-2 border-[#e2ece6] mb-4">
              Our Mission
            </h2>
            <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-[#444] leading-[1.8] mb-4">
              FarmPass was developed to modernize and streamline the livestock transport permit issuance
              process in Sariaya, Quezon. Our mission is to provide farmers, traders, and haulers with a
              fast, transparent, and secure digital platform that eliminates unnecessary office visits while
              maintaining strict compliance and disease control measures.
            </p>
            <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-[#444] leading-[1.8] mb-4">
              By leveraging cutting-edge technologies including Optical Character Recognition (OCR), Machine
              Learning fraud detection, and Geospatial analytics, we're transforming a traditionally manual,
              time-consuming process into a digital experience that takes minutes.
            </p>
            <h3 className="font-archivo text-[clamp(1rem,1.5vw,1.5rem)] text-brand-primary tracking-[-0.01em] mb-2.5">
              Why FarmPass?
            </h3>
            <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-[#444] leading-[1.8] mb-4">
              The traditional permit application process required multiple office visits, long waiting times,
              and manual verification calls. FarmPass addresses these challenges by:
            </p>
            <CheckList items={WHY_FEATURES} />
          </div>

          {/* RIGHT — Office + SDGs */}
          <div ref={officeRef} className="reveal-block">
            <div className="flex items-center gap-4 pb-3 border-b-2 border-[#e2ece6] mb-4">
              <img src={AgriLogo} alt="Sariaya Agri" className="w-10 h-10 rounded-full object-cover" />
              <h2 className="font-archivo text-[clamp(1.25rem,2vw,2rem)] text-brand-primary tracking-[-0.02em] leading-[1.2]">
                About Sariaya Agriculture Office
              </h2>
            </div>
            <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-[#444] leading-[1.8] mb-4">
              The Municipal Agriculture Office of Sariaya, Quezon plays a vital role in supporting the local
              agricultural sector, including livestock farming. The office is responsible for:
            </p>
            <CheckList items={OFFICE_RESPONSIBILITIES} />

            <h3 className="font-archivo text-[clamp(1rem,1.5vw,1.5rem)] text-brand-primary tracking-[-0.01em] mb-2.5 mt-8">
              Sustainable Development Goals
            </h3>
            <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-[#444] leading-[1.8] mb-4">
              FarmPass aligns with the United Nations Sustainable Development Goals:
            </p>
            <div className="flex flex-col gap-3">
              {SDGS.map(({ code, title, desc, color }) => (
                <div key={code}
                  className="group flex items-start gap-3.5 bg-white border border-[#e2ece6] rounded-xl px-[1.1rem] py-[0.9rem] box-border
                    transition-[box-shadow,transform] duration-200 hover:shadow-[0_0.3rem_1rem_rgba(10,42,26,0.08)] hover:translate-x-1"
                  style={{ borderLeftWidth: "3px", borderLeftColor: color }}>
                  <div className="font-archivo text-[0.8rem] text-white rounded-[0.35rem] px-2 py-1 shrink-0 mt-0.5 whitespace-nowrap"
                    style={{ background: color }}>
                    {code}
                  </div>
                  <p className="font-jakarta text-[clamp(0.82rem,1.1vw,0.9rem)] text-[#444] leading-[1.65] m-0">
                    <strong className="text-brand-primary">{title}</strong> — {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}