import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from "/src/hooks/useApplications"
import ApplicationHeader from "/src/components/ApplicationHeader"
import { ArrowLeft, LayoutDashboard, FileText } from "lucide-react"
import DocumentList from "/src/components/DocumentList"
import OPVApprovalControls from "./OPVApprovalControl"
import { api } from "/src/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useState } from "react"
import DocumentViewModal from "/src/components/DocumentViewModal"


/**
 * OPV Application Detail View
 * Strictly follows Flat UI: no radius, sharp borders, industrial typography.
 * Now supports document review modal for evidence verification.
 */
const OPVApplicationDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [selectedDocId, setSelectedDocId] = useState(null)
    const { data: application, isLoading, isError } = useApplicationDetail(id)
    const query = useQueryClient()


    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
            <span className="loading loading-spinner loading-lg text-indigo-600"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4 animate-pulse">Syncing Audit Data</p>
        </div>
    );

    if (isError) return (
        <div className="max-w-5xl mx-auto p-12">
            <div className="bg-red-50 border border-red-200 p-10 flex flex-col items-center text-center space-y-4">
                <h2 className="text-xl font-black text-red-700 uppercase italic tracking-tighter">Sync.Failure</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Could not retrieve application details from the central registry.</p>
                <button onClick={() => navigate(-1)} className="bg-gray-900 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest">Return to Dashboard</button>
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
                description: "Could not complete the OPV validation process."
            })
        }
    }

    const onReject = async (data) => {
        try {
            await api.post(`opv/${id}/reject/`, data)
            query.invalidateQueries({ queryKey: ['application'] })
            toast.success("Application Returned", {
                description: "Sent back for corrections."
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

            <div className="max-w-6xl mx-auto p-6 md:p-12 min-h-screen bg-white font-sans">
                {/* Minimalist Flat Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-indigo-600 transition-all mb-12 border-b-2 border-transparent hover:border-indigo-600 pb-1"
                >
                    <ArrowLeft size={16} strokeWidth={3} /> Return.to.Applications
                </button>

                <div className="space-y-20">
                    {/* Header Info */}
                    <ApplicationHeader data={application} />

                    {/* Document Section */}
                    <section>
                        <div className="flex items-center gap-6 mb-10">
                            <div className="bg-gray-900 text-white p-3">
                                <FileText size={20} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Audit.Trail</h2>
                                <p className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Evidence.Verification</p>
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
                        <div className="border-t-4 border-gray-900 pt-12">
                            <OPVApprovalControls
                                onApprove={onApprove}
                                onReject={onReject}
                            />
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 p-10 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Workflow.Status</p>
                            <p className="text-sm font-black text-gray-900 uppercase italic mt-2">
                                Audit is in state: <span className="text-indigo-600">[{application.status.replace(/_/g, '.')}]</span>
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </>
    )
}

export default OPVApplicationDetail;