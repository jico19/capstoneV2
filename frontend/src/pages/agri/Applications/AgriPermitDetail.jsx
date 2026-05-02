import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useApplicationDetail, useOCRUpdate } from "/src/hooks/useApplications";
import DocumentList from "/src/components/DocumentList";
import OCRModal from "./OCRModal";
import { useState } from "react";
import ApprovalControls from "./AGRIApprovalControls";
import { api } from "/src/lib/api";
import DocumentViewModal from "/src/components/DocumentViewModal";
import ApplicationHeader from "/src/components/ApplicationHeader";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Agri Permit Detail View
 * Redesigned for Farmer-Friendly simplicity and Minimalist Design System.
 */
const AgriPermitDetail = () => {
    const [activeModal, setActiveModal] = useState(null)
    const [ocrID, setOcrID] = useState(0)
    const [docID, setDocID] = useState(0)
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: application, isLoading, isError } = useApplicationDetail(id);
    const { mutate: updateOCR } = useOCRUpdate();
    const query = useQueryClient()

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-white">
            <span className="loading loading-spinner loading-lg text-green-600"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-4">Opening Application...</p>
        </div>
    );

    if (isError) return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="bg-red-50 border border-red-100 p-8 text-red-600 text-center font-black uppercase tracking-widest text-xs">
                Could not load this permit. Please go back and try again.
            </div>
        </div>
    );

    const fixDataHandler = ({ ocr_id, doc_id }) => {
        setOcrID(ocr_id)
        setDocID(doc_id)
        setActiveModal('ocr')
    }

    const viewDocument = (doc_id) => {
        setDocID(doc_id)
        setActiveModal('view')
    }

    const closeModal = () => {
        setActiveModal(null)
        setOcrID(null)
        setDocID(null)
    }

    const handleUpdateOCR = (data) => {
        updateOCR({ id: ocrID, data })
        closeModal()
        toast.success("Details updated successfully.")
    }

    const approveHandler = async (data) => {
        try {
            await api.post(`/application/${id}/approve/`, data)
            query.invalidateQueries({ queryKey: ['application'] })
            toast.success("Application Approved", {
                description: "Forwarded to health office for final check."
            })
        } catch (error) {
            toast.error("Action Failed", {
                description: "Could not approve the request."
            })
        }

    };

    const rejectHandler = async (data) => {
        try {
            await api.post(`/application/${id}/reject/`, data)
            query.invalidateQueries({ queryKey: ['application'] })
            toast.success("Application Returned", {
                description: "The farmer has been notified to fix the details."
            })
        } catch (error) {
            toast.error("Action Failed", {
                description: "Could not process the return."
            })
        }
    };

    const issue_permit_handler = async (id) => {
        try {
            await api.post('/issued-permit/', {
                application_id: id
            })
            query.invalidateQueries({ queryKey: ['application'] })
            toast.success("Permit Issued", {
                description: "Document is now ready for payment."
            })
        } catch (error) {
            toast.error("Issuance Failed", {
                description: error.response?.data?.error || "Could not issue the official permit."
            })
        }
    }


    return (
        <>
            {activeModal === 'ocr' && (
                <OCRModal
                    doc_id={docID}
                    onClose={closeModal}
                    onSubmit={handleUpdateOCR}
                />
            )}

            {activeModal === 'view' && (
                <DocumentViewModal
                    doc_id={docID}
                    onClose={closeModal}
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
                    <ApplicationHeader data={application} />

                    <section className="space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Step 1</p>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Check Documents</h2>
                            </div>
                            <div className="h-[2px] flex-1 bg-gray-100"></div>
                        </div>
                        <DocumentList documents={application?.documents} fixData={fixDataHandler} documentView={viewDocument} />
                    </section>

                    {application.status === 'MANUAL' || application.status === 'OCR_VALIDATED' ? (
                        <ApprovalControls
                            onApprove={approveHandler}
                            onReject={rejectHandler}
                        />
                    ) : null}

                    {application.status === 'OPV_VALIDATED' ? (
                        <div className="pt-8 border-t border-gray-100">
                             <div className="bg-green-50 border border-green-100 p-8 flex flex-col items-center gap-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Everything Looks Good</h2>
                                    <p className="text-sm text-gray-600 font-medium">Health validation is complete. You can now issue the final permit.</p>
                                </div>
                                <button
                                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-12 py-5 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-colors"
                                    onClick={() => issue_permit_handler(application.id)}
                                >
                                    <CheckCircle size={20} />
                                    Issue Official Permit
                                </button>
                             </div>
                        </div>
                    ) : null}

                </div>

            </div>
        </>
    );
};

export default AgriPermitDetail;