import { useParams } from "react-router-dom"
import { useGetPermit } from "/src/hooks/useApplications"
import {
    FileText,
    Download,
    AlertCircle,
    ArrowLeft,
    FileBadge,
    FileCheck2
} from "lucide-react"
import { Link } from "react-router-dom"
import DownloadCard from "./DownloadCard"

// Page for downloading issued permits and related health documents.
// Only accessible after the permit has been released and paid for.
const DownloadApplication = () => {
    const { id } = useParams()
    const { data: docs, isLoading, isError } = useGetPermit(id)

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 bg-white">
                <span className="loading loading-spinner loading-lg text-green-700"></span>
                <p className="text-stone-400 font-black uppercase text-[10px] tracking-widest">
                    Preparing your documents...
                </p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-3xl mx-auto p-8 mt-12">
                <div className="bg-red-50 border border-red-200 p-8 flex flex-col items-center text-center gap-4 rounded-none">
                    <AlertCircle size={32} className="text-red-600" />
                    <div>
                        <h2 className="font-black uppercase text-sm tracking-widest text-red-700 mb-2">Something went wrong</h2>
                        <p className="text-sm text-red-600 font-medium max-w-sm">
                            We couldn't find your documents. Please make sure the permit is released and your payment is confirmed.
                        </p>
                    </div>
                    <Link 
                        to="/farmer/application" 
                        className="mt-4 px-6 py-2 border border-red-200 text-red-700 text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors"
                    >
                        Back to My Applications
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50/50 p-6 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-12">
                
                {/* Navigation and Title */}
                <div className="space-y-6">
                    <Link 
                        to="/farmer/application" 
                        className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-800 font-black text-[10px] uppercase tracking-widest transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to My Applications
                    </Link>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-600 text-[10px] font-black uppercase tracking-widest">
                                Released
                            </span>
                            <span className="text-stone-400 font-mono text-[10px] font-black uppercase tracking-widest">
                                ID: {id}
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter leading-none">
                            Get Your Permits
                        </h1>
                        <p className="text-stone-600 text-sm font-medium max-w-xl">
                            Your official transport documents are ready. Please download and keep these files with you during livestock movement.
                        </p>
                    </div>
                </div>

                {/* Document List Section */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3">
                        <FileCheck2 size={20} className="text-stone-400" />
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Available Documents
                        </h2>
                        <div className="flex-1 border-t border-stone-200"></div>
                    </div>

                    <div className="grid gap-4">
                        {/* Primary Permit */}
                        <DownloadCard
                            title="Official Transport Permit"
                            description="The main permit for moving swine. This file contains your secure QR code."
                            url={docs?.issued_permit_pdf}
                            fileName={`Permit_${id}.pdf`}
                            icon={FileBadge}
                            isPrimary={true}
                        />

                        {/* VHC */}
                        <DownloadCard
                            title="Health Certificate"
                            description="Animal health clearance issued by the Provincial Veterinarian (OPV)."
                            url={docs?.veterinary_health_certificate}
                            fileName={`VHC_${id}.png`}
                            icon={FileText}
                        />

                        {/* Transportation Pass */}
                        <DownloadCard
                            title="Transport Pass"
                            description="Required document for crossing provincial boundaries."
                            url={docs?.transportation_pass}
                            fileName={`TransportPass_${id}.png`}
                            icon={FileText}
                        />
                    </div>
                </div>

                {/* Information Notice */}
                <div className="bg-white border border-stone-200 p-6 flex gap-4">
                    <AlertCircle size={20} className="text-stone-400 shrink-0" />
                    <p className="text-xs text-stone-500 font-medium leading-relaxed">
                        <span className="font-black text-stone-800 uppercase block mb-1">Important Note</span>
                        Inspectors will scan the QR code on your Transport Permit. Ensure the digital or printed copy is clear and readable at all times during transit.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DownloadApplication;