import useScrollReveal from "../../../../hooks/useScrollReveal";
import AgriLogo from "../../../../assets/sariaya-agri-logo.jpg";

const WHY_FEATURES = [
  "Enabling 24/7 online application submission from anywhere",
  "Automatically validating documents using OCR scanning",
  "Cross-checking livestock counts with census data to prevent fraud",
  "Providing real-time application tracking and SMS notifications",
  "Generating tamper-proof permits with QR codes for checkpoint verification",
  "Supporting African Swine Fever (ASF) disease control through biosecurity monitoring",
];

const OFFICE_RESPONSIBILITIES = [
  "Regulating and monitoring livestock transport within and outside the municipality",
  "Conducting quarterly livestock census and health surveys",
  "Managing African Swine Fever (ASF) prevention and control programs",
  "Supporting farmers and traders with agricultural services",
  "Ensuring compliance with national livestock transport regulations",
  "Maintaining accurate records of livestock populations per barangay",
];

const SDGS = [
  {
    code: "SDG 2", title: "Zero Hunger",
    desc: "Protecting the livestock supply chain by ensuring safe, legal livestock transport and disease containment.",
  },
  {
    code: "SDG 9", title: "Industry, Innovation & Infrastructure",
    desc: "Deploying resilient digital infrastructure for transparent municipal livestock permit management.",
  },
  {
    code: "SDG 16", title: "Peace, Justice & Strong Institutions",
    desc: "Establishing traceable, auditable government processes with verifiable digital signatures.",
  },
];

function CheckList({ items }) {
  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-2 mb-5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 font-jakarta text-[14px] text-stone-700 leading-[1.65]">
          <span className="w-4 h-4 bg-green-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-[3px] rounded">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AboutContent() {
  const missionRef = useScrollReveal({ threshold: 0.1 });
  const officeRef = useScrollReveal({ threshold: 0.1 });

  return (
    <section className="bg-brand-bg py-16 relative overflow-hidden max-[640px]:py-12">
      <div className="max-w-[72rem] mx-auto px-8 max-[640px]:px-5">
        <div className="grid grid-cols-2 gap-12 items-start max-[896px]:grid-cols-1">

          {/* LEFT — Mission */}
          <div ref={missionRef} className="reveal-block">
            <h2 className="font-archivo text-[clamp(1.25rem,2vw,1.8rem)] text-brand-primary tracking-[-0.02em] leading-[1.2] pb-3 border-b border-stone-200 mb-4">
              Our Mission
            </h2>
            <p className="font-jakarta text-[14px] text-stone-700 leading-[1.8] mb-4">
              FarmPass was developed to modernize and streamline the livestock transport permit issuance
              process in Sariaya, Quezon. Our mission is to provide farmers, traders, and haulers with a
              fast, transparent, and secure digital platform that eliminates unnecessary office visits while
              maintaining strict compliance and disease control measures.
            </p>
            <p className="font-jakarta text-[14px] text-stone-700 leading-[1.8] mb-4">
              By combining OCR document scanning, census verification, and geospatial analytics, we transform a traditionally manual,
              time-consuming workflow into an efficient digital process.
            </p>
            <h3 className="font-archivo text-[16px] text-brand-primary tracking-[-0.01em] mb-2.5">
              Why FarmPass?
            </h3>
            <p className="font-jakarta text-[14px] text-stone-700 leading-[1.8] mb-4">
              The traditional permit application process required multiple office visits, long waiting times,
              and manual verification calls. FarmPass addresses these challenges by:
            </p>
            <CheckList items={WHY_FEATURES} />
          </div>

          {/* RIGHT — Office + SDGs */}
          <div ref={officeRef} className="reveal-block">
            <div className="flex items-center gap-3 pb-3 border-b border-stone-200 mb-4">
              <img src={AgriLogo} alt="" className="w-8 h-8 rounded-full object-cover border border-stone-200" />
              <h2 className="font-archivo text-[clamp(1.25rem,2vw,1.8rem)] text-brand-primary tracking-[-0.02em] leading-[1.2]">
                Sariaya Agriculture Office
              </h2>
            </div>
            <p className="font-jakarta text-[14px] text-stone-700 leading-[1.8] mb-4">
              The Municipal Agriculture Office of Sariaya, Quezon plays a vital role in supporting the local
              agricultural sector, including livestock farming. The office is responsible for:
            </p>
            <CheckList items={OFFICE_RESPONSIBILITIES} />

            <h3 className="font-archivo text-[16px] text-brand-primary tracking-[-0.01em] mb-2.5 mt-6">
              Sustainable Development Goals
            </h3>
            <p className="font-jakarta text-[14px] text-stone-700 leading-[1.8] mb-4">
              FarmPass aligns with the United Nations Sustainable Development Goals:
            </p>
            <div className="flex flex-col gap-2.5">
              {SDGS.map(({ code, title, desc }) => (
                <div key={code}
                  className="flex items-start gap-3 bg-white border border-stone-200 rounded-lg p-3.5 box-border">
                  <div className="font-mono text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 shrink-0 mt-0.5 whitespace-nowrap">
                    {code}
                  </div>
                  <p className="font-jakarta text-[13px] text-stone-700 leading-[1.6] m-0">
                    <strong className="text-stone-900">{title}</strong>: {desc}
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