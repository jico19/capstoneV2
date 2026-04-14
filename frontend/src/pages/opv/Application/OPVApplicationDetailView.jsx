import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from "/src/hooks/useApplications"
import ApplicationHeader from "/src/components/ApplicationHeader"
import { ArrowLeft } from "lucide-react"
import DocumentList from "../../farmer/Applications/DocumentList"
import OPVApprovalControls from "./OPVApprovalControl"
import { api } from "/src/lib/api"
import { useQueryClient } from "@tanstack/react-query"


const OPVApplicationDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { data: application, isLoading, isError } = useApplicationDetail(id)
    const query = useQueryClient()


    if (isLoading) return <div className="p-10 text-center font-bold opacity-50">Loading Your Application...</div>;
    if (isError) return <div className="p-10 text-error font-bold">Failed to load data.</div>;


    const onApprove = async (data) => {
        try {
            const formData = new FormData()
            formData.append('remarks', data.remarks)
            formData.append('veterinary_health_certificate', data.veterinary_health_certificate[0])
            formData.append('transportation_pass', data.transportation_pass[0])

            const res = await api.post(`opv/${id}/approve/`, formData)
            query.invalidateQueries({ queryKey: ['application'] })
            console.log(res.data)
        } catch (error) {
            console.log(error)
        }
    }

    const onReject = async (data) => {
        console.log(data)
    }

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
                <DocumentList documents={application.documents} />

                {application.status === "FORWARDED_TO_OPV" ? (
                    <OPVApprovalControls
                        onApprove={onApprove}
                        onReject={onReject}
                    />
                ) : (
                    null
                )}

            </div>



        </div>
    )
}

export default OPVApplicationDetail