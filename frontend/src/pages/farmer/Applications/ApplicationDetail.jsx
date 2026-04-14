import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from "/src/hooks/useApplications"
import ApplicationHeader from "/src/components/ApplicationHeader"
import { ArrowLeft } from "lucide-react"
import DocumentList from "./DocumentList"


const ApplicationDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { data: application, isLoading, isError } = useApplicationDetail(id)

    
    if (isLoading) return <div className="p-10 text-center font-bold opacity-50">Loading Your Application...</div>;
    if (isError) return <div className="p-10 text-error font-bold">Failed to load data.</div>;

    console.log(application)

    return (

            <div className="max-w-5xl mx-auto p-6 md:p-12 min-h-screen bg-white">
                {/* Minimal Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-green-700 transition-colors mb-10"
                >
                    <ArrowLeft size={16} /> Back to Applications
                </button>

                <div className="space-y-16">
                    <ApplicationHeader data={application} />
                    <DocumentList documents={application.documents}/>
                </div>

            </div>
    )
}

export default ApplicationDetail