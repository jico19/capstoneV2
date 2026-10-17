import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from '../../../hooks/useApplications'
import ApplicationHeader from "../../../components/ui/ApplicationHeader"
import ApplicationTracker from "../../../components/ui/ApplicationTracker"
import { ArrowLeft, FileText, HandCoins, Download, FileCheck2, ExternalLink, XCircle } from "lucide-react"
import DocumentList from "../../../components/ui/DocumentList"
import { useState } from "react"
import DocumentViewModal from "../../../components/ui/DocumentViewModal"
import ConfirmationModal from "../../../components/ui/ConfirmationModal"
import PaymentCountdownTimer from "../../../components/ui/PaymentCountdownTimer"
import { useQueryClient } from "@tanstack/react-query"
import { api } from "../../../lib/api"
import { toast } from "sonner"


/**
 * Farmer Application Detail View
 * Strictly follows Minimalist Design System: no radius, sharp borders, industrial typography.
 */
const ApplicationDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [selectedDocId, setSelectedDocId] = useState(null)
    const [isCancelling, setIsCancelling] = useState(false)
    const [confirmCancel, setConfirmCancel] = useState(false)
    const { data: application, isLoading, isError } = useApplicationDetail(id)

    const handleCancelRequest = async () => {
        setIsCancelling(true);
        try {
            await api.post(`/application/${id}/cancel/`);
            queryClient.invalidateQueries({ queryKey: ['application', id] });
            toast.success("Request Cancelled", { description: "Your permit request has been cancelled." });
        } catch (err) {
            toast.error("Action Failed", { description: err.response?.data?.detail || err.response?.data?.error || "Could not cancel request." });
        } finally {
            setIsCancelling(false);
            setConfirmCancel(false);
        }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl">
            <span className="loading loading-spinner loading-lg text-green-600"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Retrieving Application...</p>
        </div>
    );

    if (isError) return (
        <div className="max-w-5xl mx-auto p-4 md:p-12 min-h-full bg-white">
            <div className="bg-red-50 border border-red-200 p-10 flex flex-col items-center text-center space-y-4 rounded-xl shadow-xs">
                <h2 className="text-xl font-black text-red-700 uppercase tracking-tighter">Sync Failure</h2>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-relaxed">Could not retrieve application details.</p>
                <button onClick={() => navigate(-1)} className="bg-stone-800 hover:bg-stone-700 text-white px-8 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg shadow-xs transition-colors">Back to Dashboard</button>
            </div>
        </div>
    );

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

            <div className="max-w-5xl mx-auto p-3 sm:p-6 md:p-8 min-h-screen bg-white font-sans">
                {/* Navigation */}
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-stone-500 text-xs font-semibold hover:text-emerald-700 transition-colors mb-4 sm:mb-6 pb-0.5 w-fit"
                >
                    <ArrowLeft size={15} /> Return to Applications
                </button>

                <div className="space-y-6 sm:space-y-8">
                    <ApplicationHeader data={application} />

                    <ApplicationTracker status={application.status} />

                    {application.aic_pdf && (
                        <div className="bg-emerald-50/70 border border-emerald-200 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <FileCheck2 size={16} className="text-emerald-700 shrink-0" />
                                    <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                                        Animal Inspection Certificate (AIC) Issued
                                    </h3>
                                    {application.aic_number && (
                                        <span className="text-[10px] font-mono font-medium bg-white text-emerald-800 px-2 py-0.5 border border-emerald-200 rounded-md">
                                            AIC #{application.aic_number}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-emerald-800/80 leading-normal max-w-xl font-normal">
                                    Your application has been inspected and approved by MAO and forwarded to OPV. You can view or download your official AIC copy.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                                <a 
                                    href={application.aic_pdf}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-tactile bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 px-4 py-2 text-xs font-semibold rounded-lg transition-all w-full sm:w-auto text-center flex items-center justify-center gap-1.5"
                                >
                                    <ExternalLink size={13} /> Open in Browser
                                </a>
                                <a 
                                    href={application.aic_pdf}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={`AIC_${application.application_id || id}.pdf`}
                                    className="btn-tactile bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-all w-full sm:w-auto text-center flex items-center justify-center gap-1.5"
                                >
                                    <Download size={13} /> Download AIC Copy
                                </a>
                            </div>
                        </div>
                    )}
                    
                    {(application.status === "RESUBMISSION" || application.status === "OPV_REJECTED") && (
                        <div className="bg-amber-50/80 border border-amber-200 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Action Required</h3>
                                <p className="text-xs text-amber-800 leading-normal max-w-xl font-normal">
                                    Your application was returned for correction. Please update your details or documents to proceed.
                                </p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => navigate(`/farmer/application/resubmit/${id}`)}
                                className="btn-tactile bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-all w-full md:w-auto text-center"
                            >
                                Resubmit Now
                            </button>
                        </div>
                    )}

                    {application.status === "PAYMENT_PENDING" && (
                        <div className="bg-emerald-50/80 border border-emerald-200 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Payment Required</h3>
                                    {application.issued_permit?.payment_deadline && (
                                        <PaymentCountdownTimer compact deadline={application.issued_permit.payment_deadline} />
                                    )}
                                </div>
                                <p className="text-xs text-emerald-700 leading-normal max-w-xl font-normal">
                                    Your application has been approved. Please complete the permit fee payment to release your transport permit.
                                </p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => navigate(`/farmer/payment/checkout/${id}`)}
                                className="btn-tactile bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-all w-full md:w-auto flex items-center justify-center gap-2"
                            >
                                <HandCoins size={14} /> Pay Fee (₱{application.permit_fee || 150})
                            </button>
                        </div>
                    )}

                    {['PAID', 'RELEASED'].includes(application.status) && (
                        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 border border-emerald-800/40 p-5 sm:p-6 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Permit Issued</h3>
                                </div>
                                <p className="text-xs text-stone-300 leading-normal max-w-xl font-normal">
                                    Your transport permit is active and ready to use. Download or view your official PDF copy.
                                </p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => navigate(`/farmer/application/download/${id}`)}
                                className="btn-tactile bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 text-xs font-semibold rounded-lg shadow-xs transition-all w-full md:w-auto flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> Get Permit PDF
                            </button>
                        </div>
                    )}
                    
                    {application.origins && application.origins.length > 0 && (
                        <div className="border border-stone-200 bg-white p-5 space-y-3 rounded-xl shadow-xs">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                                Swine Source & Origin Details
                            </h3>
                            <div className="divide-y divide-stone-100">
                                {application.origins.map((orig, idx) => (
                                    <div key={orig.id || idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <div>
                                            <span className="text-xs font-semibold text-stone-800 uppercase">
                                                Location #{idx + 1}: Barangay {orig.barangay_name}
                                            </span>
                                            {orig.source_farmer_name && (
                                                <p className="text-xs font-medium text-stone-500">
                                                    Source Farmer: <span className="font-semibold text-stone-700">{orig.source_farmer_name}</span>
                                                    {orig.source_phone_no ? ` • ${orig.source_phone_no}` : ''}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold font-mono text-stone-800 bg-stone-50 px-2.5 py-1 rounded-md border border-stone-200">
                                            {orig.number_of_pigs} pigs
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <section className="pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 hidden sm:block">
                                    <FileText size={18} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Submission Evidence</p>
                                    <h2 className="text-lg sm:text-xl font-bold text-stone-900 uppercase tracking-tight leading-none">Attached Documents</h2>
                                </div>
                            </div>
                            <div className="h-[1px] flex-1 bg-stone-200 hidden sm:block"></div>
                        </div>
                        
                        <DocumentList 
                            documents={application.all_documents} 
                            documentView={viewDocument}
                        />
                    </section>
                </div>

                {['SUBMITTED', 'DRAFT', 'MANUAL', 'OCR_VALIDATED', 'RESUBMISSION'].includes(application.status) && !application.is_checked && (
                    <div className="mt-8 bg-stone-50 border border-stone-200 p-4 sm:p-5 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">Need to Cancel this Request?</h3>
                            <p className="text-xs text-stone-500 mt-0.5 font-normal">
                                You can cancel your permit request before MAO staff inspects or processes it.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setConfirmCancel(true)}
                            className="btn-tactile px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center gap-1.5"
                        >
                            <XCircle size={14} /> Cancel Request
                        </button>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                onYes={handleCancelRequest}
                title="Cancel Permit Request?"
                message="Are you sure you want to cancel this transport permit request? This action cannot be undone."
                yesText="Yes, Cancel Request"
                yesVariant="danger"
                type="danger"
                isSubmitting={isCancelling}
            />
        </>
    )
}

export default ApplicationDetail;