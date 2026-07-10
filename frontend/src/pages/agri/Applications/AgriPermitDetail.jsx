import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useApplicationDetail, useOCRUpdate } from "/src/hooks/useApplications";
import DocumentList from "../../../components/ui/DocumentList";
import OCRModal from "./OCRModal";
import { useState, useEffect } from "react";
import ApprovalControls from "./AGRIApprovalControls";
import { api } from "../../../lib/api";
import DocumentViewModal from "../../../components/ui/DocumentViewModal";
import ApplicationHeader from "../../../components/ui/ApplicationHeader";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmationModal from "/src/components/ui/ConfirmationModal";

/**
 * Agri Permit Detail View
 * Redesigned for Farmer-Friendly simplicity and Minimalist Design System.
 */
const AgriPermitDetail = () => {
    const [activeModal, setActiveModal] = useState(null)
    const [ocrID, setOcrID] = useState(0)
    const [docID, setDocID] = useState(0)
    const [isIssuingPermit, setIsIssuingPermit] = useState(false)
    const [confirmModal, setConfirmModal] = useState(null)
    const [permitFeeInput, setPermitFeeInput] = useState(150.00)

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await api.get('/municipal-config/');
                if (res.data && res.data.permit_fee) {
                    setPermitFeeInput(res.data.permit_fee);
                }
            } catch (err) {
                console.error("Failed to load default permit fee", err);
            }
        };
        fetchConfig();
    }, []);
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

    const approveHandler = (data) => {
        return new Promise((resolve, reject) => {
            setConfirmModal({
                title: "Approve Permit Request?",
                message: "Are you sure you want to approve this livestock transport permit application? This will forward it to the Office of the Provincial Veterinarian (OPV) for final health validation.",
                yesText: "Yes, Approve",
                yesVariant: "success",
                type: "success",
                onYes: async () => {
                    try {
                        await api.post(`/application/${id}/approve/`, data);
                        query.invalidateQueries({ queryKey: ['application'] });
                        toast.success("Application Approved", {
                            description: "Forwarded to health office for final check."
                        });
                        resolve();
                    } catch (error) {
                        toast.error("Action Failed", {
                            description: "Could not approve the request."
                        });
                        reject(error);
                    } finally {
                        setConfirmModal(null);
                    }
                },
                onClose: () => {
                    resolve();
                    setConfirmModal(null);
                }
            });
        });
    };

    const rejectHandler = (data) => {
        return new Promise((resolve, reject) => {
            setConfirmModal({
                title: "Return Permit Request?",
                message: "Are you sure you want to return this application to the farmer for correction? The farmer will be notified of the remarks.",
                yesText: "Yes, Return",
                yesVariant: "danger",
                type: "warning",
                onYes: async () => {
                    try {
                        await api.post(`/application/${id}/reject/`, data);
                        query.invalidateQueries({ queryKey: ['application'] });
                        toast.success("Application Returned", {
                            description: "The farmer has been notified to fix the details."
                        });
                        resolve();
                    } catch (error) {
                        toast.error("Action Failed", {
                            description: "Could not process the return."
                        });
                        reject(error);
                    } finally {
                        setConfirmModal(null);
                    }
                },
                onClose: () => {
                    resolve();
                    setConfirmModal(null);
                }
            });
        });
    };

    const issue_permit_handler = (id) => {
        const fee = parseFloat(permitFeeInput);
        const finalFee = isNaN(fee) ? 150.00 : fee;

        setConfirmModal({
            title: "Issue Official Permit?",
            message: `Are you sure you want to issue the official transport permit with a fee of ₱${finalFee.toFixed(2)}? This will notify the farmer and make it ready for payment.`,
            yesText: "Yes, Issue Permit",
            yesVariant: "success",
            type: "success",
            onYes: async () => {
                setIsIssuingPermit(true);
                try {
                    await api.post('/issued-permit/', {
                        application_id: id,
                        permit_fee: finalFee
                    });
                    query.invalidateQueries({ queryKey: ['application'] });
                    toast.success("Permit Issued", {
                        description: `Permit fee set to ₱${finalFee.toFixed(2)}.`
                    });
                } catch (error) {
                    toast.error("Issuance Failed", {
                        description: error.response?.data?.error || "Could not issue the official permit."
                    });
                } finally {
                    setIsIssuingPermit(false);
                    setConfirmModal(null);
                }
            },
            onClose: () => {
                setConfirmModal(null);
            }
        });
    };


    return (
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
                        <DocumentList documents={application?.all_documents} fixData={fixDataHandler} documentView={viewDocument} />
                    </section>

                    {application.status === 'MANUAL' || application.status === 'OCR_VALIDATED' ? (
                        <ApprovalControls
                            onApprove={approveHandler}
                            onReject={rejectHandler}
                        />
                    ) : null}

                    {application.status === 'OPV_VALIDATED' ? (
                        <div className="pt-8 border-t border-stone-200">
                             <div className="bg-stone-50 border border-stone-200 p-8 flex flex-col items-center gap-6">
                                <div className="text-center space-y-2">
                                    <h2 className="text-lg font-bold text-stone-800 uppercase tracking-tight">Everything Looks Good</h2>
                                    <p className="text-sm text-stone-500 font-medium">Health validation is complete. You can set the permit price and issue the final permit.</p>
                                </div>
                                
                                {/* Price Control Input Field directly on the page! */}
                                <div className="w-full max-w-xs space-y-2">
                                    <label className="text-[10px] font-black text-stone-600 uppercase tracking-widest block text-center">
                                        Permit Fee Amount (₱)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={permitFeeInput}
                                            onChange={(e) => setPermitFeeInput(e.target.value)}
                                            className="w-full text-center px-4 py-3.5 bg-white border border-stone-200 rounded-none focus:ring-0 focus:border-green-700 outline-none text-base font-black text-stone-800"
                                            placeholder="150.00"
                                        />
                                    </div>
                                    <p className="text-[10px] text-stone-400 font-medium text-center leading-normal">
                                        Standard regulatory fee is ₱150.00. You can edit this.
                                    </p>
                                </div>

                                <button
                                    className="w-full sm:w-auto bg-green-700 hover:bg-green-600 text-white px-12 py-4 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-none"
                                    disabled={isIssuingPermit}
                                    onClick={() => issue_permit_handler(application.id)}
                                >
                                    {isIssuingPermit ? (
                                        <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                                    ) : (
                                        <CheckCircle size={16} />
                                    )}
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