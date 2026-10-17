import useScrollReveal from '../../../../hooks/useScrollReveal';
import DownloadIcon from '../../../../assets/requirements-icons/download.png';
import DocumentIcon from '../../../../assets/requirements-icons/document.png';

const DOWNLOADS = [
  { label: "Sample Ownership Certificate", file: "#" },
  { label: "Application Guide (PDF)",       file: "#" },
  { label: "Document Checklist",            file: "#" },
];

export default function Downloads() {
  const sectionRef = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="bg-white py-16 border-b border-stone-200">
      <div ref={sectionRef} className="reveal-block max-w-[54rem] mx-auto px-8 max-[640px]:px-5">

        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-stone-200 mb-2">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-center shrink-0">
            <img src={DownloadIcon} alt="" className="w-5 h-5 object-contain" />
          </div>
          <h2 className="font-archivo text-2xl text-stone-900 font-bold tracking-tight">Download Document Templates</h2>
        </div>
        <p className="font-jakarta text-sm text-stone-600 leading-relaxed mb-6">
          Official printable templates and checklists for farm clearance preparation.
        </p>

        {/* Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DOWNLOADS.map(({ label }, i) => (
            <div key={i}
              className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-md
                font-jakarta text-xs font-medium text-stone-700">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={DocumentIcon} alt="" className="w-4 h-4 object-contain shrink-0 opacity-60" />
                <span className="truncate">{label}</span>
              </div>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider bg-stone-200/70 px-1.5 py-0.5 rounded shrink-0 ml-2">
                Available Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}