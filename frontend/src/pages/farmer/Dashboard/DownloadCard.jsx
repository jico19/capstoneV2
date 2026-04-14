import { Download, ExternalLink } from "lucide-react";



// --- Sub-component: Download Card ---
const DownloadCard = ({ title, description, url, fileName, icon: Icon, isPrimary = false }) => {
    if (!url) return null;

    return (
        <div className={`border-2 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors ${isPrimary ? 'border-green-600 bg-green-50/30' : 'border-gray-200 bg-white'
            }`}>
            <div className="flex gap-4">
                <div className={`p-4 ${isPrimary ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Icon size={28} />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 font-medium max-w-sm leading-relaxed">{description}</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline rounded-none border-gray-300 normal-case font-bold gap-2 text-xs"
                >
                    <ExternalLink size={14} /> Preview
                </a>
                <a
                    href={url}
                    download={fileName}
                    className={`btn rounded-none border-none normal-case font-black gap-2 text-xs px-8 ${isPrimary ? 'btn-primary' : 'bg-gray-900 text-white hover:bg-gray-800'
                        }`}
                >
                    <Download size={14} /> Download PDF
                </a>
            </div>
        </div>
    );
};


export default DownloadCard