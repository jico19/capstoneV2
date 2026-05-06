import { Download, ExternalLink } from "lucide-react";

// Shows a download option for a specific document.
// Props:
//   title — document name
//   description — what the document is for
//   url — link to the file
//   fileName — suggested name for download
//   icon — Lucide icon component
//   isPrimary — if true, uses the green brand styling
const DownloadCard = ({ title, description, url, fileName, icon: Icon, isPrimary = false }) => {
    if (!url) return null;

    return (
        <div className={`border rounded-none p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors ${
            isPrimary 
            ? 'border-green-600 bg-green-50/30' 
            : 'border-stone-200 bg-white'
        }`}>
            <div className="flex gap-4 items-start">
                <div className={`p-3 shrink-0 rounded-none ${
                    isPrimary ? 'bg-green-700 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                    <Icon size={20} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-tight text-stone-800">
                        {title}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium max-w-sm leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 border border-stone-200 bg-white text-stone-600 font-medium text-[10px] uppercase tracking-widest px-4 py-2 rounded-none hover:bg-stone-100 transition-colors"
                >
                    <ExternalLink size={14} /> Preview
                </a>
                <a
                    href={url}
                    download={fileName}
                    className={`flex-1 md:flex-none inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] px-6 py-2 rounded-none transition-colors ${
                        isPrimary 
                        ? 'bg-green-700 text-white hover:bg-green-600' 
                        : 'bg-stone-800 text-white hover:bg-stone-700'
                    }`}
                >
                    <Download size={14} /> Download
                </a>
            </div>
        </div>
    );
};

export default DownloadCard;