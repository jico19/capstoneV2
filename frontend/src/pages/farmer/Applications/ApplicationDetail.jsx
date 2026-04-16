import { useNavigate, useParams } from "react-router-dom"
import { useApplicationDetail } from "/src/hooks/useApplications"
import ApplicationHeader from "/src/components/ApplicationHeader"
import { ArrowLeft, FileText } from "lucide-react"
import DocumentList from "/src/components/DocumentList"
import { useState } from "react"
import DocumentViewModal from "/src/components/DocumentViewModal"


/**
 * Farmer Application Detail View
 * Strictly follows Flat UI: no radius, sharp borders, industrial typography.
 */
const ApplicationDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [selectedDocId, setSelectedDocId] = useState(null)
    const { data: application, isLoading, isError } = useApplicationDetail(id)

    
    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4 animate-pulse">Retrieving Application</p>
        </div>
    );

    if (isError) return (
        <div className="max-w-5xl mx-auto p-12">
            <div className="bg-red-50 border border-red-200 p-10 flex flex-col items-center text-center space-y-4">
                <h2 className="text-xl font-black text-red-700 uppercase italic tracking-tighter">Sync.Failure</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">Could not retrieve application details.</p>
                <button onClick={() => navigate(-1)} className="bg-gray-900 text-white px-10 py-3 text-[10px] font-black uppercase tracking-widest">Back to Dashboard</button>
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

            <div className="max-w-5xl mx-auto p-6 md:p-12 min-h-screen bg-white font-sans">
                {/* Minimalist Flat Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-green-600 transition-all mb-12 border-b-2 border-transparent hover:border-green-600 pb-1"
                >
                    <ArrowLeft size={16} strokeWidth={3} /> Return.to.Applications
                </button>

                <div className="space-y-20">
                    <ApplicationHeader data={application} />
                    
                    <section>
                        <div className="flex items-center gap-6 mb-10">
                            <div className="bg-gray-900 text-white p-3">
                                <FileText size={20} />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Submission.Evidence</h2>
                                <p className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Attached.Documents</p>
                            </div>
                            <div className="h-[2px] flex-1 bg-gray-100"></div>
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