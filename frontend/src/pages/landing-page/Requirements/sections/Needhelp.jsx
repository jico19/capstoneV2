import { Link } from 'react-router-dom';
import useScrollReveal from '../../../../hooks/useScrollReveal';
import HelpIcon from '../../../../assets/requirements-icons/help-icon.png';

export default function NeedHelp() {
  const ref = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="bg-stone-50 py-16 max-[640px]:py-12 px-8 max-[640px]:px-5">
      <div ref={ref}
        className="reveal-block max-w-[54rem] mx-auto bg-white border border-stone-200 rounded-lg p-8">

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-center shrink-0">
            <img src={HelpIcon} alt="" className="w-5 h-5 object-contain" />
          </div>
          <h2 className="font-archivo text-xl text-stone-900 font-bold tracking-tight">Need Assistance?</h2>
        </div>

        <p className="font-jakarta text-sm text-stone-600 leading-relaxed mb-5">
          For technical issues or clarification regarding requirements, contact the Sariaya Municipal Agriculture Office:
        </p>

        <ul className="list-none p-0 m-0 flex flex-col gap-3">
          {[
            <>Review frequently asked questions in our <Link to="/faqs" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-green-700 font-semibold no-underline hover:underline">Help & FAQs Center</Link></>,
            <>Direct line: <strong className="text-stone-900">(042) 525-8200</strong> or email <strong className="text-stone-900">agri@sariaya.gov.ph</strong></>,
            <>Visit in-person: <strong className="text-stone-900">Municipal Agriculture Office, New Municipal Hall</strong> (Mon–Fri, 8:00 AM – 5:00 PM)</>,
          ].map((item, i) => (
            <li key={i}
              className="font-jakarta text-xs sm:text-sm text-stone-700 pl-4 relative leading-relaxed
                before:content-['—'] before:absolute before:left-0 before:text-stone-400 before:font-bold">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}