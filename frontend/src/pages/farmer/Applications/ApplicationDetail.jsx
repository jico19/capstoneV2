import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from '../../../hooks/useApplications'
import ApplicationHeader from "../../../components/ui/ApplicationHeader"
import { ArrowLeft, FileText, HandCoins, Download } from "lucide-react"
import DocumentList from "../../../components/ui/DocumentList"
import { useState } from "react"
import DocumentViewModal from "../../../components/ui/DocumentViewModal"


/**
 * Farmer Application Detail View
 * Strictly follows Minimalist Design System: no radius, sharp borders, industrial typography.
 */
const ApplicationDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [selectedDocId, setSelectedDocId] = useState(null)
    const { data: application, isLoading, isError } = useApplicationDetail(id)

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-none">
            <span className="loading loading-spinner loading-lg text-green-600"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Retrieving Application...</p>
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

            <div className="max-w-5xl mx-auto p-4 md:p-8 min-h-screen bg-white font-sans">
                {/* Minimalist Flat Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-green-600 transition-all mb-8 md:mb-12 border-b-2 border-transparent hover:border-green-600 pb-1 w-fit"
                >
                    <ArrowLeft size={16} strokeWidth={3} /> Return to Applications
                </button>

                <div className="space-y-6 md:space-y-10">
                    <ApplicationHeader data={application} />
                    
                    {(application.status === "RESUBMISSION" || application.status === "OPV_REJECTED") && (
                        <div className="bg-amber-50 border border-amber-200 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest">Action Required</h3>
                                <p className="text-xs font-bold text-amber-700/80 uppercase tracking-wider leading-normal max-w-xl">
                                    Your application was returned for correction. Please update your details or documents to proceed.
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate(`/farmer/application/resubmit/${id}`)}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-colors w-full md:w-auto text-center"
                            >
                                Resubmit Now
                            </button>
                        </div>
                    )}

                    {application.status === "PAYMENT_PENDING" && (
                        <div className="bg-green-50 border border-green-200 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h3 className="text-xs font-black text-green-700 uppercase tracking-widest">Payment Required</h3>
                                <p className="text-xs font-bold text-green-700/80 uppercase tracking-wider leading-normal max-w-xl">
                                    Your application has been approved. Please complete the permit fee payment to release your transport permit.
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate(`/farmer/payment/checkout/${id}`)}
                                className="bg-green-700 hover:bg-green-600 text-white px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-none w-full md:w-auto flex items-center justify-center gap-2"
                            >
                                <HandCoins size={14} /> Pay Fee (₱{application.permit_fee || 150})
                            </button>
                        </div>
                    )}

                    {['PAID', 'RELEASED'].includes(application.status) && (
                        <div className="bg-stone-800 border border-stone-700 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
                            <div className="space-y-1">
                                <h3 className="text-xs font-black uppercase tracking-widest text-green-600">Permit Issued</h3>
                                <p className="text-xs font-bold text-stone-300 uppercase tracking-wider leading-normal max-w-xl">
                                    Your transport permit is active and ready to use. Download or view your official PDF copy.
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate(`/farmer/application/download/${id}`)}
                                className="bg-green-700 hover:bg-green-600 text-white px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-none w-full md:w-auto flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> Get Permit PDF
                            </button>
                        </div>
                    )}
                    
                    <section className="pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-stone-900 text-white p-2.5 hidden sm:block">
                                    <FileText size={18} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Submission Evidence</p>
                                    <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight leading-none">Attached Documents</h2>
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

            </div>
        </>
    )
}

export default ApplicationDetail;