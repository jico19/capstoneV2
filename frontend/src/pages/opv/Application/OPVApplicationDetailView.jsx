import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from "/src/hooks/useApplications"
import ApplicationHeader from "/src/components/ApplicationHeader"
import { ArrowLeft, FileText } from "lucide-react"
import DocumentList from "/src/components/DocumentList"
import OPVApprovalControls from "./OPVApprovalControl"
import { api } from "/src/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useState } from "react"
import DocumentViewModal from "/src/components/DocumentViewModal"


/**
 * OPV Application Detail View
 * Redesigned for Farmer-Friendly clarity and Minimalist Design System.
 */
const OPVApplicationDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [selectedDocId, setSelectedDocId] = useState(null)
    const { data: application, isLoading, isError } = useApplicationDetail(id)
    const query = useQueryClient()


    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
            <span className="loading loading-spinner loading-lg text-green-600"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Opening Application...</p>
        </div>
    );

    if (isError) return (
        <div className="max-w-5xl mx-auto p-4 md:p-12 min-h-full bg-white">
            <div className="bg-red-50 border border-red-100 p-10 flex flex-col items-center text-center space-y-4 rounded-none">
                <h2 className="text-xl font-black text-red-700 uppercase tracking-tighter">Sync Failure</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Could not retrieve application details.</p>
                <button onClick={() => navigate(-1)} className="bg-gray-900 hover:bg-gray-800 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest transition-colors">Back to Dashboard</button>
            </div>
        </div>
    );


    const onApprove = async (data) => {
        try {
            const formData = new FormData()
            formData.append('remarks', data.remarks)
            formData.append('veterinary_health_certificate', data.veterinary_health_certificate[0])
            formData.append('transportation_pass', data.transportation_pass[0])

            const res = await api.post(`opv/${id}/approve/`, formData)
            query.invalidateQueries({ queryKey: ['application'] })
            toast.success("Validation Complete", {
                description: "Health documents uploaded and application validated."
            })
            console.log(res.data)
        } catch (error) {
            console.log(error)
            toast.error("Validation Failed", {
                description: "Could not complete the validation process."
            })
        }
    }

    const onReject = async (data) => {
        try {
            await api.post(`opv/${id}/reject/`, data)
            query.invalidateQueries({ queryKey: ['application'] })
            toast.success("Application Returned", {
                description: "The farmer has been notified to fix the details."
            })
        } catch (error) {
            toast.error("Action Failed")
        }
    }

    const viewDocument = (doc_id) => {
        setSelectedDocId(doc_id);
    }

    return (
        <>
            {selectedDocId && (
                <DocumentViewModal 
                    doc_id={selectedDocId} 
                    onClose={() => setSelectedDocId(null)} 
                />
            )}

            <div className="flex-1 max-w-5xl mx-auto p-4 md:p-12 min-h-full bg-white space-y-12">
                {/* Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-green-600 transition-all border-b-2 border-transparent hover:border-green-600 w-fit pb-1"
                >
                    <ArrowLeft size={16} strokeWidth={3} /> Return to Application List
                </button>

                <div className="space-y-16">
                    {/* Header Info */}
                    <ApplicationHeader data={application} />

                    {/* Document Section */}
                    <section className="space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 1</p>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Check Documents</h2>
                            </div>
                            <div className="h-[2px] flex-1 bg-gray-100"></div>
                        </div>
                        
                        <DocumentList 
                            documents={application.documents} 
                            documentView={viewDocument}
                        />
                    </section>

                    {/* Actions Section */}
                    {application.status === "FORWARDED_TO_OPV" ? (
                        <div className="space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 2</p>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Health Validation</h2>
                                </div>
                                <div className="h-[2px] flex-1 bg-gray-100"></div>
                            </div>
                            <OPVApprovalControls
                                onApprove={onApprove}
                                onReject={onReject}
                            />
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-100 p-10 flex flex-col items-center text-center gap-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Validation Status</p>
                            <p className="text-sm font-black text-gray-900 uppercase">
                                Current State: <span className="text-green-600">{application.status_display}</span>
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </>
    )
}

export default OPVApplicationDetail;