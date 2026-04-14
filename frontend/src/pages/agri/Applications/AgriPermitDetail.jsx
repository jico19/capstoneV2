import { useParams, useNavigate, data } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApplicationDetail, useOCRUpdate } from "/src/hooks/useApplications";
import DocumentList from "./DocumentList";
import OCRModal from "./OCRModal";
import { useState } from "react";
import ApprovalControls from "./AGRIApprovalControls";
import { api } from "/src/lib/api";
import DocumentViewModal from "./DocumentViewModal";
import ApplicationHeader from "/src/components/ApplicationHeader";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
        <div className="flex items-center justify-center min-h-screen">
            <span className="loading loading-spinner loading-lg text-green-700"></span>
        </div>
    );

    if (isError) return (
        <div className="max-w-4xl mx-auto p-8 text-center">
            <div className="alert alert-error rounded-xl">Something went wrong fetching this permit.</div>
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
        console.log(ocrID)
        updateOCR({ id: ocrID, data })
        closeModal()
        toast.success("Successfully fix the data.")
    }

    const approveHandler = async (data) => {
        try {
            const res = await api.post(`/application/${id}/approve/`, data)
            query.invalidateQueries({ queryKey: ['application'] })
            toast.success("Forwarded to the opv.")
        } catch (error) {
            console.log(error.response)
        }

    };

    const rejectHandler = async (data) => {
        try {
            const res = await api.post(`/application/${id}/reject/`, data)
            query.invalidateQueries({ queryKey: ['application'] })
            console.log(res.data)
            toast.success("Successfully rejected.")
        } catch (error) {
            console.log(error.response)
        }
    };

    const issue_permit_handler = async (id) => {
        const res = await api.post('/issued-permit/', {
            application_id: id
        })
        query.invalidateQueries({ queryKey: ['application'] })
        console.log(res.data)
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

            <div className="max-w-5xl mx-auto p-6 md:p-12 min-h-screen bg-white">
                {/* Minimal Navigation */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-green-700 transition-colors mb-10"
                >
                    <ArrowLeft size={16} /> Back to Registry
                </button>

                <div className="space-y-16">
                    <ApplicationHeader data={application} />

                    <section>
                        <div className="flex items-center gap-4 mb-8">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                Verification Checklist
                            </h2>
                            <div className="h-[1px] flex-1 bg-slate-100"></div>
                        </div>
                        <DocumentList documents={application?.documents} fixData={fixDataHandler} documentView={viewDocument} />
                    </section>

                    {application.status === 'MANUAL' || application.status === 'OCR_VALIDATED' ? (
                        <ApprovalControls
                            onApprove={approveHandler}
                            onReject={rejectHandler}
                        />
                    ) : null}

                    <button
                        className="btn btn-success text-white"
                        onClick={() => issue_permit_handler(application.id)}
                    >
                        issued permit
                    </button>

                </div>

            </div>
        </>
    );
};

export default AgriPermitDetail;