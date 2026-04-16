import { useParams } from "react-router-dom"
import { useGetPermit } from "/src/hooks/useApplications"
import {
    FileText,
    Download,
    ExternalLink,
    ShieldCheck,
    AlertCircle,
    ArrowLeft,
    FileBadge
} from "lucide-react"
import { Link } from "react-router-dom"
import DownloadCard from "./DownloadCard"

const DownloadApplication = () => {
    const { id } = useParams()
    const { data: docs, isLoading, isError } = useGetPermit(id)

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <span className="loading loading-spinner loading-lg text-green-600"></span>
                <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest animate-pulse">
                    Preparing Secure Documents...
                </p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-3xl mx-auto p-8 mt-10">
                <div className="bg-red-50 border border-red-200 p-8 text-red-700 flex flex-col items-center gap-3">
                    <AlertCircle size={32} />
                    <p className="font-black uppercase text-sm tracking-tighter">Access Denied or Not Found</p>
                    <p className="text-sm text-center">We couldn't find the documents for this permit. Ensure the payment is cleared and the permit has been issued.</p>
                    <Link to="/farmer/application" className="btn btn-ghost btn-sm underline uppercase font-bold mt-4">Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10">

            {/* 1. Header Navigation */}
            <div className="max-w-5xl mx-auto">
                <Link to="/farmer/application" className="flex items-center gap-2 text-gray-500 hover:text-green-700 font-bold text-xs uppercase tracking-widest mb-6 transition-colors">
                    <ArrowLeft size={14} /> Back to My Applications
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-200 pb-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest">Released</span>
                            <span className="text-gray-400 font-mono text-xs font-bold tracking-tight">ID: {id}</span>
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Download Permits</h1>
                        <p className="text-gray-500 text-sm font-medium">Your livestock transport documents are ready for download and inspection.</p>
                    </div>
                </div>
            </div>

            {/* 2. Download Grid */}
            <div className="max-w-5xl mx-auto space-y-4">

                {/* Main Permit - Primary Emphasis */}
                <DownloadCard
                    title="Official Transport Permit"
                    description="The primary municipal permit required for transporting swine. Contains the secure QR code for checkpoint validation."
                    url={docs?.issued_permit_pdf}
                    fileName={`Permit_${id}.pdf`}
                    icon={FileBadge}
                    isPrimary={true}
                />

                {/* VHC */}
                <DownloadCard
                    title="Veterinary Health Certificate"
                    description="Document issued by the Office of the Provincial Veterinarian (OPV) confirming animal health status."
                    url={docs?.veterinary_health_certificate}
                    fileName={`VHC_${id}.png`}
                    icon={FileText}
                />

                {/* Transportation Pass */}
                <DownloadCard
                    title="Transportation Pass"
                    description="Additional clearance document required for transit between provincial boundaries."
                    url={docs?.transportation_pass}
                    fileName={`TransportPass_${id}.png`}
                    icon={FileText}
                />

            </div>
        </div>
    );
};

export default DownloadApplication;