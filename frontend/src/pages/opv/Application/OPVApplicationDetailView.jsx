import LoadingLayout from '../../../components/ui/LoadingLayout';
import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from '../../../hooks/useApplications'
import ApplicationHeader from "../../../components/ui/ApplicationHeader"
import { ArrowLeft, FileCheck2, ExternalLink, ShieldCheck } from "lucide-react"
import DocumentList from "../../../components/ui/DocumentList"
import OPVApprovalControls from "./OPVApprovalControl"
import { api } from "../../../lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useState } from "react"
import DocumentViewModal from "../../../components/ui/DocumentViewModal"
import ConfirmationModal from '../../../components/ui/ConfirmationModal'
import { getAuthenticatedMediaUrl } from '../../../lib/utils'


/**
 * OPV Application Detail View
 * Redesigned for Farmer-Friendly clarity and Minimalist Design System.
 */
const OPVApplicationDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [selectedDocId, setSelectedDocId] = useState(null)
    const [confirmModal, setConfirmModal] = useState(null)
    const { data: applicationData, isLoading, isError } = useApplicationDetail(id)
    const application = applicationData || {};
    const query = useQueryClient()




    if (isError) return (
        <div className="max-w-5xl mx-auto p-4 md:p-12 min-h-full bg-white">
            <div className="bg-red-50 border border-red-200 p-10 flex flex-col items-center text-center space-y-4 rounded-xl shadow-xs">
                <h2 className="text-xl font-black text-red-700 uppercase tracking-tighter">Sync Failure</h2>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-relaxed">Could not retrieve application details.</p>
                <button onClick={() => navigate(-1)} className="bg-stone-800 hover:bg-stone-700 text-white px-8 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg shadow-xs transition-colors">Back to Dashboard</button>
            </div>
        </div>
    );


    const onApprove = (data) => {
        return new Promise((resolve, reject) => {
            setConfirmModal({
                title: "Confirm Health Validation?",
                message: "Are you sure you want to approve this application and issue the health validation? This will allow the farmer to proceed to the payment step.",
                yesText: "Yes, Validate",
                yesVariant: "success",
                type: "success",
                onYes: async () => {
                    try {
                        const formData = new FormData()
                        formData.append('remarks', data.remarks)
                        formData.append('aic_verified', data.aic_verified ? 'true' : 'false')
                        formData.append('veterinary_health_certificate', data.veterinary_health_certificate[0])
                        formData.append('transportation_pass', data.transportation_pass[0])

                        await api.post(`opv/${id}/approve/`, formData)
                        query.invalidateQueries({ queryKey: ['application'] })
                        query.invalidateQueries({ queryKey: ['opv_metrics'] })
                        query.invalidateQueries({ queryKey: ['agri_metrics'] })
                        query.invalidateQueries({ queryKey: ['farmer_metrics'] })
                        toast.success("Validation Complete", {
                            description: "AIC verified, health documents uploaded, and application validated."
                        })
                        resolve()
                    } catch (error) {
                        const errMsg = error.response?.data?.error || "Could not complete the validation process."
                        toast.error("Validation Failed", {
                            description: errMsg
                        })
                        reject(error)
                    } finally {
                        setConfirmModal(null)
                    }
                },
                onClose: () => {
                    resolve()
                    setConfirmModal(null)
                }
            })
        })
    }

    const onReject = (data) => {
        return new Promise((resolve, reject) => {
            setConfirmModal({
                title: "Permanently Reject Application?",
                message: "Are you sure you want to PERMANENTLY reject this livestock transport request? This action is irreversible and the farmer will have to restart the request process.",
                yesText: "Yes, Reject",
                yesVariant: "danger",
                type: "danger",
                onYes: async () => {
                    try {
                        await api.post(`opv/${id}/reject/`, data)
                        query.invalidateQueries({ queryKey: ['application'] })
                        query.invalidateQueries({ queryKey: ['opv_metrics'] })
                        query.invalidateQueries({ queryKey: ['agri_metrics'] })
                        query.invalidateQueries({ queryKey: ['farmer_metrics'] })
                        toast.success("Application Rejected", {
                            description: "The application has been permanently rejected."
                        })
                        resolve()
                    } catch (error) {
                        toast.error("Action Failed")
                        reject(error)
                    } finally {
                        setConfirmModal(null)
                    }
                },
                onClose: () => {
                    resolve()
                    setConfirmModal(null)
                }
            })
        })
    }

    const onResubmit = (data) => {
        return new Promise((resolve, reject) => {
            setConfirmModal({
                title: "Return Application for Correction?",
                message: "Are you sure you want to return this application to the farmer for correction? The farmer will be notified of your remarks.",
                yesText: "Yes, Return",
                yesVariant: "warning",
                type: "warning",
                onYes: async () => {
                    try {
                        await api.post(`opv/${id}/resubmit/`, data)
                        query.invalidateQueries({ queryKey: ['application'] })
                        query.invalidateQueries({ queryKey: ['opv_metrics'] })
                        query.invalidateQueries({ queryKey: ['agri_metrics'] })
                        query.invalidateQueries({ queryKey: ['farmer_metrics'] })
                        toast.success("Application Returned", {
                            description: "The farmer has been notified to fix the details."
                        })
                        resolve()
                    } catch (error) {
                        toast.error("Action Failed")
                        reject(error)
                    } finally {
                        setConfirmModal(null)
                    }
                },
                onClose: () => {
                    resolve()
                    setConfirmModal(null)
                }
            })
        })
    }

    const viewDocument = (doc_id) => {
        setSelectedDocId(doc_id);
    }

    return (
        <LoadingLayout loading={isLoading}>
        <>
            {confirmModal && (
                <ConfirmationModal
                    isOpen={!!confirmModal}
                    onClose={confirmModal.onClose}
                    onYes={confirmModal.onYes}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    yesText={confirmModal.yesText}
                    yesVariant={confirmModal.yesVariant}
                    type={confirmModal.type}
                />
            )}

            {selectedDocId && (
                <DocumentViewModal 
                    doc_id={selectedDocId} 
                    onClose={() => setSelectedDocId(null)} 
                />
            )}

            <div className="flex-1 max-w-5xl mx-auto p-4 md:p-12 min-h-full bg-white space-y-12">
                {/* Navigation */}
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-stone-500 text-xs font-semibold hover:text-emerald-700 transition-colors w-fit pb-1"
                >
                    <ArrowLeft size={16} /> Return to Application List
                </button>

                <div className="space-y-8">
                    {/* Header Info */}
                    <ApplicationHeader data={application} />

                    {application.origins && application.origins.length > 0 && (
                        <div className="border border-stone-200 bg-white p-6 space-y-4 rounded-xl shadow-xs">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Provincial Review</p>
                                <h3 className="text-base font-bold text-stone-800 uppercase tracking-tight">
                                    Swine Source Farms & Origins
                                </h3>
                            </div>
                            <div className="divide-y divide-stone-100 border-t border-stone-100">
                                {application.origins.map((orig, idx) => (
                                    <div key={orig.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <span className="text-sm font-semibold text-stone-800 uppercase">
                                                Location #{idx + 1}: Barangay {orig.barangay_name}
                                            </span>
                                            {orig.source_farmer_name ? (
                                                <p className="text-xs font-medium text-stone-500">
                                                    Source Farmer: <span className="font-semibold text-stone-800">{orig.source_farmer_name}</span>
                                                    {orig.source_phone_no ? ` • Contact: ${orig.source_phone_no}` : ''}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-stone-400 italic">Source farmer not specified</p>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold font-mono text-stone-800 bg-stone-50 px-3 py-1.5 border border-stone-200 rounded-md">
                                            {orig.number_of_pigs} pigs
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Document Section */}
                    <section className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Step 1</p>
                                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Check Documents</h2>
                            </div>
                            <div className="h-[1px] flex-1 bg-stone-200"></div>
                        </div>

                        {application.aic_pdf && (
                            <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="bg-emerald-700 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md">
                                            MAO Official Certificate
                                        </span>
                                        <span className="text-xs font-mono font-medium text-emerald-950">
                                            AIC No: {application.aic_number || "PENDING"}
                                        </span>
                                        {application.opv_validation?.aic_verified ? (
                                            <span className="bg-emerald-800 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <FileCheck2 size={12} /> Verified by OPV
                                            </span>
                                        ) : application.status === "FORWARDED_TO_OPV" ? (
                                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                Awaiting OPV Verification
                                            </span>
                                        ) : null}
                                    </div>
                                    <h3 className="text-base font-bold text-stone-900 uppercase tracking-tight">
                                        Animal Inspection Certificate (AIC)
                                    </h3>
                                    <p className="text-xs text-stone-600 font-normal leading-relaxed">
                                        Certified by the Municipal Agriculture Office. Swine health & origin verified prior to provincial forwarding.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => viewDocument(`aic-${application.id}`)}
                                        className="btn-tactile bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                                    >
                                        <FileCheck2 size={14} /> Inspect AIC
                                    </button>
                                    <a
                                        href={getAuthenticatedMediaUrl(application.aic_pdf)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-tactile border border-emerald-300 hover:bg-emerald-100/70 text-emerald-900 text-xs font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <ExternalLink size={14} /> Open PDF
                                    </a>
                                </div>
                            </div>
                        )}

                        {application.mao_certificate_pdf && (
                            <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="bg-emerald-700 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <ShieldCheck size={12} /> Official Disease Clearance
                                        </span>
                                        <span className="text-xs font-mono font-medium text-emerald-950">
                                            Cert No: {application.mao_certificate_number || "PENDING"}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-stone-900 uppercase tracking-tight">
                                        MAO Health & ASF-Free Certification
                                    </h3>
                                    <p className="text-xs text-stone-600 font-normal leading-relaxed">
                                        Official municipal certification that the origin barangay has no reported swine disease or ASF mortalities.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => viewDocument(`mao-cert-${application.id}`)}
                                        className="btn-tactile bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all flex items-center gap-1.5"
                                    >
                                        <ShieldCheck size={14} /> Inspect Cert
                                    </button>
                                    <a
                                        href={getAuthenticatedMediaUrl(application.mao_certificate_pdf)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-tactile border border-emerald-300 hover:bg-emerald-100/70 text-emerald-900 text-xs font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <ExternalLink size={14} /> Open PDF
                                    </a>
                                </div>
                            </div>
                        )}
                        
                        <DocumentList 
                            documents={application.all_documents} 
                            documentView={viewDocument}
                        />
                    </section>

                    {/* Actions Section */}
                    {application.status === "FORWARDED_TO_OPV" ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Step 2</p>
                                    <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Health Validation</h2>
                                </div>
                                <div className="h-[1px] flex-1 bg-stone-200"></div>
                            </div>
                            <OPVApprovalControls
                                aicNumber={application.aic_number}
                                onInspectAic={() => viewDocument(`aic-${application.id}`)}
                                onApprove={onApprove}
                                onReject={onReject}
                                onResubmit={onResubmit}
                            />
                        </div>
                    ) : (
                        <div className="bg-white border border-stone-200 p-6 sm:p-8 flex flex-col items-center text-center gap-2 rounded-xl shadow-xs">
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Validation Status</p>
                            <p className="text-sm font-semibold text-stone-900">
                                Current State: <span className="text-emerald-700 font-bold">{application.status_display}</span>
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </>
        </LoadingLayout>
    )
}

export default OPVApplicationDetail;
