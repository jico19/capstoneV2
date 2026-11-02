import LoadingLayout from '../../../components/ui/LoadingLayout';
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useApplicationDetail, useOCRUpdate } from '../../../hooks/useApplications';
import DocumentList from "../../../components/ui/DocumentList";
import OCRModal from "./OCRModal";
import { useState } from "react";
import ApprovalControls from "./AGRIApprovalControls";
import { api } from "../../../lib/api";
import DocumentViewModal from "../../../components/ui/DocumentViewModal";
import ApplicationHeader from "../../../components/ui/ApplicationHeader";
import ApplicationTracker from "../../../components/ui/ApplicationTracker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmationModal from '../../../components/ui/ConfirmationModal';

/**
 * Agri Permit Detail View
 * Redesigned for Farmer-Friendly simplicity and Minimalist Design System.
 */
const AgriPermitDetail = () => {
    const [activeModal, setActiveModal] = useState(null)
    const [ocrID, setOcrID] = useState(0)
    const [docID, setDocID] = useState(0)
    const [viewedDocIds, setViewedDocIds] = useState([])
    const [isIssuingPermit, setIsIssuingPermit] = useState(false)
    const [confirmModal, setConfirmModal] = useState(null)

    const { id } = useParams();
    const navigate = useNavigate();
    const { data: applicationData, isLoading, isError } = useApplicationDetail(id);
    const application = applicationData || {};
    const { mutate: updateOCR } = useOCRUpdate();
    const query = useQueryClient()
    const {
        data: feeConfig,
        isFetching: isLoadingFees,
        isError: isFeeError,
        refetch: refetchFees,
    } = useQuery({
        queryKey: ['municipal-config'],
        queryFn: async () => {
            const res = await api.get('/municipal-config/');
            return res.data;
        },
        enabled: application.status === 'OPV_VALIDATED',
        retry: false,
    });



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
        if (doc_id && !viewedDocIds.includes(doc_id)) {
            setViewedDocIds((prev) => [...prev, doc_id]);
        }
        setActiveModal('ocr')
    }

    const viewDocument = (doc_id) => {
        setDocID(doc_id)
        if (doc_id && !viewedDocIds.includes(doc_id)) {
            setViewedDocIds((prev) => [...prev, doc_id]);
        }
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
        const allDocs = application?.all_documents || [];
        const unviewedDocs = allDocs.filter(d => d.file && !viewedDocIds.includes(d.id));

        if (unviewedDocs.length > 0) {
            toast.error("Document Review Required", {
                description: `Please view and verify all ${allDocs.length} attached documents before approving. (${unviewedDocs.length} unreviewed document remaining)`
            });
            return Promise.reject(new Error("Unreviewed documents remaining"));
        }

        return new Promise((resolve, reject) => {
            setConfirmModal({
                title: "Approve Permit Request?",
                message: (
                    <div className="space-y-3 normal-case tracking-normal">
                        <p>
                            Are you sure you want to approve this livestock transport permit application?
                            This will forward it to the Office of the Provincial Veterinarian (OPV) for final
                            health validation.
                        </p>
                    </div>
                ),
                yesText: "Yes, Approve",
                yesVariant: "success",
                type: "success",
                onYes: async () => {
                    try {
                        await api.post(`/application/${id}/approve/`, data);
                        query.invalidateQueries({ queryKey: ['application'] });
                        query.invalidateQueries({ queryKey: ['agri_metrics'] });
                        query.invalidateQueries({ queryKey: ['opv_metrics'] });
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
                        query.invalidateQueries({ queryKey: ['agri_metrics'] });
                        query.invalidateQueries({ queryKey: ['farmer_metrics'] });
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

    const handleIssuePermit = (id) => {
        if (!feeConfig || isLoadingFees || isFeeError) return;

        setConfirmModal({
            title: "Issue Official Permit?",
            message: `Issue this permit with the configured municipal fee of ₱${Number(feeConfig.permit_fee).toFixed(2)}? This will notify the farmer and make it ready for payment.`,
            yesText: "Yes, Issue Permit",
            yesVariant: "success",
            type: "success",
            onYes: async () => {
                setIsIssuingPermit(true);
                try {
                    await api.post('/issued-permit/', {
                        application_id: id,
                    });
                    query.invalidateQueries({ queryKey: ['application'] });
                    query.invalidateQueries({ queryKey: ['agri_metrics'] });
                    query.invalidateQueries({ queryKey: ['farmer_metrics'] });
                    toast.success("Permit Issued", {
                        description: "The farmer can now pay the configured municipal fee."
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
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 text-stone-500 text-xs font-semibold hover:text-emerald-700 transition-colors w-fit pb-1"
                >
                    <ArrowLeft size={16} /> Return to Application List
                </button>

                <div className="space-y-8">
                    <ApplicationHeader data={application} />

                    <ApplicationTracker status={application.status} />

                    {application.origins && application.origins.length > 0 && (
                        <div className="border border-stone-200 bg-white p-6 space-y-4 rounded-xl shadow-xs">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Origin Traceability</p>
                                <h3 className="text-base font-bold text-stone-800 uppercase tracking-tight">
                                    Swine Source Farms & Locations
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
                                                    Source Farmer / Farm: <span className="font-semibold text-stone-800">{orig.source_farmer_name}</span>
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

                    <section className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Step 1</p>
                                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Check Documents</h2>
                            </div>
                            <div className="h-[1px] flex-1 bg-stone-200"></div>
                        </div>

                        {/* Document Verification Checklist Banner */}
                        <div className="bg-stone-50 border border-stone-200 p-4 sm:p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">MAO Document Review Checklist</span>
                                <span className="text-xs font-semibold text-stone-800">
                                    {viewedDocIds.length} of {application?.all_documents?.length || 0} attached documents reviewed/fixed
                                </span>
                            </div>
                            {viewedDocIds.length >= (application?.all_documents?.length || 1) ? (
                                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold rounded-md w-fit">
                                    ✓ All Documents Verified / Fixed
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold rounded-md w-fit">
                                    👁 Review All Attached Documents to Enable Approval Actions
                                </span>
                            )}
                        </div>

                        <DocumentList documents={application?.all_documents} fixData={fixDataHandler} documentView={viewDocument} viewedDocIds={viewedDocIds} />
                    </section>

                    {application.status === 'MANUAL' || application.status === 'OCR_VALIDATED' ? (
                        <ApprovalControls
                            onApprove={approveHandler}
                            onReject={rejectHandler}
                            isAllDocsViewed={(application?.all_documents || []).filter(d => d.file && !viewedDocIds.includes(d.id)).length === 0}
                            unviewedCount={(application?.all_documents || []).filter(d => d.file && !viewedDocIds.includes(d.id)).length}
                        />
                    ) : null}

                    {application.status === 'OPV_VALIDATED' ? (
                        <div className="pt-8 border-t border-stone-200">
                             <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-xl shadow-xs flex flex-col items-center gap-6">
                                <div className="text-center space-y-1.5">
                                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">Issue Permit</h2>
                                    <p className="text-xs sm:text-sm text-stone-500 font-normal">Health validation is complete. Issue the permit using the configured municipal fees below.</p>
                                </div>
                                
                                <div className="w-full max-w-md space-y-3" aria-busy={isLoadingFees}>
                                    {isLoadingFees ? (
                                        <p role="status" className="text-sm text-stone-500 text-center">Loading municipal fees...</p>
                                    ) : isFeeError ? (
                                        <div role="alert" className="text-sm text-center space-y-2">
                                            <p className="text-red-600">Could not load municipal fees. Try again before issuing.</p>
                                            <button type="button" onClick={() => refetchFees()} className="text-emerald-700 font-semibold underline rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
                                                Retry loading fees
                                            </button>
                                        </div>
                                    ) : feeConfig ? (
                                        <>
                                            <dl className="bg-stone-50 border border-stone-200 rounded-lg px-4 divide-y divide-stone-200 text-sm">
                                                {[
                                                    ['Veterinary Health Certificate', feeConfig.vet_health_cert_fee],
                                                    ['Transport Pass', feeConfig.transport_pass_fee],
                                                    ['Local Transport Permit', feeConfig.local_transport_permit_fee],
                                                ].map(([label, amount]) => (
                                                    <div key={label} className="flex items-center justify-between gap-4 py-3">
                                                        <dt className="text-stone-600">{label}</dt>
                                                        <dd className="font-mono font-semibold text-stone-900 shrink-0">₱{Number(amount).toFixed(2)}</dd>
                                                    </div>
                                                ))}
                                                <div className="flex items-center justify-between gap-4 py-3 font-bold">
                                                    <dt className="text-stone-900">Total Permit Fee</dt>
                                                    <dd className="font-mono text-emerald-700 shrink-0">₱{Number(feeConfig.permit_fee).toFixed(2)}</dd>
                                                </div>
                                            </dl>
                                            <p className="text-xs text-stone-500 text-center">Fees are set in municipal settings and cannot be changed during issuance.</p>
                                        </>
                                    ) : null}
                                </div>

                                <button
                                    type="button"
                                    className="btn-tactile w-full sm:w-auto bg-emerald-700 hover:bg-emerald-600 text-white px-8 py-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isIssuingPermit || isLoadingFees || isFeeError || !feeConfig}
                                    onClick={() => handleIssuePermit(application.id)}
                                >
                                    {isIssuingPermit ? (
                                        <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
                                    ) : (
                                        <CheckCircle size={15} />
                                    )}
                                    Issue Permit
                                </button>
                             </div>
                        </div>
                    ) : null}

                </div>

            </div>
        </>
        </LoadingLayout>
    );
};

export default AgriPermitDetail;
