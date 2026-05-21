import useScrollReveal from "/src/hooks/useScrollReveal";
import HelpIcon from "/src/assets/requirements-icons/help-icon.png";

export default function NeedHelp() {
  const ref = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="bg-brand-bg py-16 max-[640px]:py-12 px-8 max-[640px]:px-5">
      <div ref={ref}
        className="reveal-block max-w-[54rem] mx-auto bg-white border border-[#e2ece6] rounded-[1rem] px-9 py-8 max-[640px]:px-6 max-[640px]:py-6
          shadow-[0_0.25rem_1.5rem_rgba(10,42,26,0.06)]">

        <div className="flex items-center gap-3 mb-3">
          <img src={HelpIcon} alt="" className="w-7 h-7 object-contain" />
          <h2 className="font-archivo text-[clamp(1.1rem,1.8vw,1.4rem)] text-brand-primary tracking-[-0.01em]">Need Help?</h2>
        </div>

        <p className="font-jakarta text-[clamp(0.88rem,1.2vw,0.97rem)] text-[#6c757d] leading-[1.75] mb-4">
          If you have questions about requirements or need assistance with your application:
        </p>

        <ul className="list-none p-0 m-0 flex flex-col gap-[0.55rem]">
          {[
            <>Check our <a href="/faqs" className="text-brand-primary-mid font-semibold no-underline hover:underline">Frequently Asked Questions</a></>,
            <>Contact us: <strong>(042) XXX-XXXX</strong> or <strong>agri@sariaya.gov.ph</strong></>,
            <>Visit Sariaya Municipal Agriculture Office during office hours <strong>(Mon–Fri, 8AM–5PM)</strong></>,
          ].map((item, i) => (
            <li key={i}
              className="font-jakarta text-[clamp(0.85rem,1.2vw,0.95rem)] text-[#444] pl-5 relative leading-[1.65]
                before:content-['›'] before:absolute before:left-[0.2rem] before:text-brand-primary-mid before:font-bold before:text-[1rem]">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}