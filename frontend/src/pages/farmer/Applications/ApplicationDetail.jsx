import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from "/src/hooks/useApplications"
import ApplicationHeader from "/src/components/ApplicationHeader"
import { ArrowLeft, FileText } from "lucide-react"
import DocumentList from "/src/components/DocumentList"
import { useState } from "react"
import DocumentViewModal from "/src/components/DocumentViewModal"


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

                <div className="space-y-12 md:space-y-20">
                    <ApplicationHeader data={application} />
                    
                    {application.status === "RESUBMISSION" && (
                        <div className="bg-amber-50 border border-amber-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest">Action Required</h3>
                                <p className="text-xs font-bold text-amber-700/70 uppercase tracking-widest leading-relaxed max-w-xl">
                                    Your application was returned for correction. Please update your details or documents to proceed.
                                </p>
                            </div>
                            <button 
                                onClick={() => navigate(`/farmer/application/resubmit/${id}`)}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-10 py-4 text-[10px] font-black uppercase tracking-widest transition-colors w-full md:w-auto"
                            >
                                Resubmit Now
                            </button>
                        </div>
                    )}
                    
                    <section>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8 md:mb-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-gray-900 text-white p-3 hidden sm:block">
                                    <FileText size={20} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Submission Evidence</p>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Attached Documents</h2>
                                </div>
                            </div>
                            <div className="h-[2px] flex-1 bg-gray-100 hidden sm:block"></div>
                        </div>
                        
                        <DocumentList 
                            documents={application.documents} 
                            documentView={viewDocument}
                        />
                    </section>
                </div>

            </div>
        </>
    )
}

export default ApplicationDetail;