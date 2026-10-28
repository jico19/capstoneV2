import Skeleton from 'react-loading-skeleton';
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
    ArrowLeft,
    CheckCircle2,
    User,
    MapPin,
    Truck,
    XCircle,
    FileText,
    ShieldCheck,
    AlertTriangle,
    Phone,
    FileCheck2,
    Eye,
    Compass,
    Calendar,
    BadgeAlert
} from "lucide-react";
import { api } from "../../../lib/api";
import { toast } from "sonner";
import DateFormatter from "../../../components/ui/DateFormatter";
import { useInspectorLogs } from '../../../hooks/useInspectorLogs';
import FileViewerModal from '../../../components/ui/FileViewerModal';

const VerifyApplication = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [application, setApplication] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [isAlreadyChecked, setIsAlreadyChecked] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [location, setLocation] = useState({ lat: 0, lng: 0 });
    const [previewDoc, setPreviewDoc] = useState(null);

    const { createLog } = useInspectorLogs();
    const { register, handleSubmit, formState: { isSubmitting } } = useForm();

    const isValid = application && application.status === 'RELEASED' && !application.is_checked;

    useEffect(() => {
        const fetchDetails = async () => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        });
                    },
                    (error) => console.error("Location error:", error.message),
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            }

            try {
                const res = await api.get(`/application/${token}/verify/`);
                setApplication(res.data);
                if (res.data.is_checked) {
                    setIsAlreadyChecked(true);
                }
                setIsLoading(false);
            } catch (err) {
                setIsError(true);
                setIsLoading(false);

                const backendError = err.response?.data?.error;
                const displayMessage = typeof backendError === 'string'
                    ? backendError
                    : "This permit could not be verified or does not exist.";

                setErrorMessage(displayMessage);
                toast.error("Verification Failed", { description: displayMessage });
            }
        };
        fetchDetails();
    }, [token]);

    const onSubmit = async (data) => {
        const formData = new FormData();
        formData.append('application', application.id);
        formData.append('notes', data.notes || "");
        formData.append('lat', location.lat);
        formData.append('longi', location.lng);

        createLog.mutate(formData, {
            onSuccess: () => {
                toast.success("Checkpoint Inspection Logged", {
                    description: `Permit #${application.application_id} verified successfully.`
                });
                navigate('/inspector/');
            }
        });
    };

    if (isLoading) {
        return (
            <div role="status" aria-label="Loading permit verification..." className="max-w-2xl mx-auto p-4 sm:p-6 min-h-screen bg-stone-50 font-sans space-y-4 sm:space-y-6 pb-24">
                <div className="h-11 flex items-center"><Skeleton width={80} height={20} /></div>
                <div aria-hidden="true" className="p-4 sm:p-5 rounded-xl border border-stone-200 space-y-3 bg-white"><Skeleton width="60%" height={44} /><Skeleton count={2} /><div className="grid grid-cols-2 gap-3"><Skeleton height={40} /><Skeleton height={40} /></div></div>
                <div aria-hidden="true" className="p-4 sm:p-5 rounded-xl border border-stone-200 space-y-4 bg-white"><Skeleton width="40%" height={20} /><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Skeleton count={3} /><Skeleton count={3} /></div></div>
                <div aria-hidden="true" className="p-4 sm:p-5 rounded-xl border border-stone-200 space-y-4 bg-white"><Skeleton width="40%" height={20} /><Skeleton height={120} /></div>
            </div>
        );
    }

    if (isError || !application) {
        return (
            <div className="max-w-md mx-auto p-4 sm:p-6 min-h-screen bg-stone-50 flex items-center justify-center font-sans">
                <div className="bg-white border border-red-200 rounded-xl p-6 sm:p-8 text-center space-y-4 shadow-xs w-full">
                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                        <XCircle size={32} />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                            Clearance Denied
                        </span>
                        <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight pt-1">
                            Invalid Permit
                        </h2>
                        <p className="text-xs text-stone-600 leading-relaxed">
                            {errorMessage || "This QR code could not be verified. Do not allow cargo transport."}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/inspector/scan')}
                        className="w-full h-12 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors"
                    >
                        Scan Another QR
                    </button>
                </div>
            </div>
        );
    }

    const animalTotals = (application.origins || []).reduce((acc, o) => ({
        inahin: acc.inahin + (parseInt(o.inahin, 10) || 0),
        barako: acc.barako + (parseInt(o.barako, 10) || 0),
        starter: acc.starter + (parseInt(o.starter, 10) || 0),
        grower: acc.grower + (parseInt(o.grower, 10) || 0),
        fattener: acc.fattener + (parseInt(o.fattener, 10) || 0),
        bulaw: acc.bulaw + (parseInt(o.bulaw, 10) || 0),
    }), { inahin: 0, barako: 0, starter: 0, grower: 0, fattener: 0, bulaw: 0 });

    const totalSwine = Object.values(animalTotals).reduce((a, b) => a + b, 0) || application.number_of_pigs || 0;
    const opv = application.opv_validation;
    const issuedPermit = application.issued_permit;

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 min-h-screen bg-stone-50 font-sans space-y-4 sm:space-y-6 pb-24">
            {/* Top Navigation Bar with 44px+ hit area */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="h-11 px-3 -ml-2 flex items-center gap-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/50 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                </button>
                {location.lat !== 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold bg-white text-stone-600 px-2.5 py-1 rounded-md border border-stone-200">
                        <Compass size={12} className="text-green-700" />
                        <span>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
                    </div>
                )}
            </div>

            {/* Clearance Status Hero Banner */}
            <div className={`p-4 sm:p-5 rounded-xl border shadow-xs space-y-3 ${
                isAlreadyChecked
                    ? 'border-amber-300 bg-amber-50/70 text-amber-950'
                    : isValid
                        ? 'border-green-300 bg-green-50/70 text-green-950'
                        : 'border-red-300 bg-red-50/70 text-red-950'
            }`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white shrink-0 ${
                            isAlreadyChecked ? 'bg-amber-600' : isValid ? 'bg-green-700' : 'bg-red-600'
                        }`}>
                            {isAlreadyChecked ? <AlertTriangle size={22} /> : isValid ? <ShieldCheck size={22} /> : <XCircle size={22} />}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block leading-tight">
                                Clearance Status
                            </span>
                            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight mt-0.5 leading-none">
                                {isAlreadyChecked
                                    ? "Inspection Already Logged"
                                    : isValid
                                        ? "Permit Verified & Valid"
                                        : "Permit Expired / Invalid"}
                            </h1>
                        </div>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border shrink-0 ${
                        isAlreadyChecked
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : isValid
                                ? 'bg-green-100 text-green-900 border-green-300'
                                : 'bg-red-100 text-red-900 border-red-300'
                    }`}>
                        {isAlreadyChecked ? "ALREADY LOGGED" : isValid ? "CLEARED" : "HOLD CARGO"}
                    </span>
                </div>

                {isAlreadyChecked && (
                    <div className="text-xs font-semibold bg-white/80 p-3 rounded-lg border border-amber-200 flex items-start gap-2 text-amber-900">
                        <BadgeAlert size={16} className="shrink-0 mt-0.5 text-amber-700" />
                        <span>
                            This permit was already scanned at a checkpoint. Verify cargo match before re-logging.
                        </span>
                    </div>
                )}
            </div>

            {/* Quick Summary Cards (High-signal Glance for Checkpoints) */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                        Cargo Count
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-stone-900 font-mono">
                            {totalSwine}
                        </span>
                        <span className="text-xs font-bold text-stone-500 uppercase">pigs</span>
                    </div>
                    <span className="text-[11px] text-stone-500 font-medium truncate block mt-1">
                        Purpose: {application.purpose || 'Livestock'}
                    </span>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                        Permit Code
                    </span>
                    <span className="text-sm sm:text-base font-black font-mono text-stone-900 block truncate">
                        {issuedPermit?.permit_number || application.application_id}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-green-700 font-bold mt-1">
                        <Calendar size={12} />
                        <span>Valid: {application.valid_until ? <DateFormatter date={application.valid_until} /> : '3 Days'}</span>
                    </div>
                </div>
            </div>

            {/* Swine Load Classification Breakdown */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <div className="flex items-center gap-2">
                        <Truck size={16} className="text-green-700" />
                        <h2 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                            Swine Load Breakdown
                        </h2>
                    </div>
                    <span className="text-xs font-bold text-stone-500">
                        Total: <strong className="text-stone-900 font-mono">{totalSwine}</strong>
                    </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] font-black text-stone-400 uppercase block truncate">Inahin</span>
                        <span className="text-base font-black text-stone-900 font-mono">{animalTotals.inahin}</span>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] font-black text-stone-400 uppercase block truncate">Barako</span>
                        <span className="text-base font-black text-stone-900 font-mono">{animalTotals.barako}</span>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] font-black text-stone-400 uppercase block truncate">Biik / Starter</span>
                        <span className="text-base font-black text-stone-900 font-mono">{animalTotals.starter}</span>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] font-black text-stone-400 uppercase block truncate">Grower</span>
                        <span className="text-base font-black text-stone-900 font-mono">{animalTotals.grower}</span>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] font-black text-stone-400 uppercase block truncate">Fattener</span>
                        <span className="text-base font-black text-stone-900 font-mono">{animalTotals.fattener}</span>
                    </div>
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-center">
                        <span className="text-[9px] font-black text-stone-400 uppercase block truncate">Bulaw</span>
                        <span className="text-base font-black text-stone-900 font-mono">{animalTotals.bulaw}</span>
                    </div>
                </div>
            </div>

            {/* Shipper, Origin & Destination */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
                    <User size={16} className="text-stone-400" />
                    <h2 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                        Transit Logistics & Contacts
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                            Shipper / Applicant
                        </span>
                        <p className="text-sm font-bold text-stone-900 uppercase">
                            {application.farmer_name}
                        </p>
                        {application.farmer_phone && (
                            <a
                                href={`tel:${application.farmer_phone}`}
                                className="inline-flex items-center gap-1.5 text-green-700 font-bold hover:underline mt-1"
                            >
                                <Phone size={13} /> {application.farmer_phone}
                            </a>
                        )}
                    </div>

                    <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                            Destination Address
                        </span>
                        <p className="text-xs font-bold text-stone-900 uppercase flex items-start gap-1.5 leading-snug">
                            <MapPin size={15} className="text-green-700 shrink-0 mt-0.5" />
                            <span>{application.destination}</span>
                        </p>
                    </div>
                </div>

                {/* Source origins */}
                {application.origins && application.origins.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-stone-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">
                            Source Farms ({application.origins.length})
                        </span>
                        {application.origins.map((origin, idx) => (
                            <div
                                key={origin.id || idx}
                                className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between text-xs"
                            >
                                <div>
                                    <span className="font-bold text-stone-900 uppercase block">
                                        Brgy. {origin.barangay_name}
                                    </span>
                                    {origin.source_farmer_name && (
                                        <span className="text-[11px] text-stone-500 font-medium">
                                            Owner: {origin.source_farmer_name}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-mono font-black text-stone-800 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                                    {origin.number_of_pigs} pigs
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Official Credentials & Attached Documents */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <div className="flex items-center gap-2">
                        <FileCheck2 size={16} className="text-green-700" />
                        <h2 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                            Official Documents
                        </h2>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono font-bold">
                        {(application.all_documents?.length || 0) + (issuedPermit?.permit_pdf ? 1 : 0) + (opv?.veterinary_health_certificate ? 1 : 0) + (issuedPermit?.mao_certificate_pdf || application?.mao_certificate_pdf ? 1 : 0)} files
                    </span>
                </div>

                <div className="space-y-2">
                    {/* Primary Permit PDF */}
                    {issuedPermit?.permit_pdf && (
                        <div className="p-3 bg-green-50/60 border border-green-200 rounded-lg flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-black uppercase tracking-wider text-green-800 bg-green-200/80 px-1.5 py-0.2 rounded">
                                    Official Pass
                                </span>
                                <p className="text-xs font-bold text-stone-900 truncate">Official Livestock Permit</p>
                                <p className="text-[10px] font-mono text-stone-500">#{issuedPermit.permit_number}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewDoc({
                                    url: issuedPermit.permit_pdf,
                                    title: `Official Transport Permit - ${issuedPermit.permit_number}`,
                                    subtitle: `Issued to ${application.farmer_name}`
                                })}
                                className="h-11 w-11 bg-green-700 hover:bg-green-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow-2xs active:scale-95 transition-all"
                                aria-label="View Official Permit PDF"
                            >
                                <Eye size={18} />
                            </button>
                        </div>
                    )}

                    {/* MAO Health & ASF-Free Certificate */}
                    {(issuedPermit?.mao_certificate_pdf || application?.mao_certificate_pdf) && (
                        <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-1.5 py-0.2 rounded">
                                    MAO Clearance
                                </span>
                                <p className="text-xs font-bold text-stone-900 truncate">MAO ASF-Free Certification</p>
                                <p className="text-[10px] font-mono text-stone-500">
                                    {issuedPermit?.mao_certificate_number || application?.mao_certificate_number || "OMA-ANN-ASFCert"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewDoc({
                                    url: issuedPermit?.mao_certificate_pdf || application?.mao_certificate_pdf,
                                    title: `MAO ASF-Free Health Certification`,
                                    subtitle: `Origin: Brgy. ${application.origins?.[0]?.barangay_name || 'Sariaya'}`
                                })}
                                className="h-11 w-11 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center shrink-0 shadow-2xs active:scale-95 transition-all"
                                aria-label="View MAO ASF Certificate PDF"
                            >
                                <Eye size={18} />
                            </button>
                        </div>
                    )}

                    {/* OPV Health Certificate */}
                    {opv?.veterinary_health_certificate && (
                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-black uppercase tracking-wider text-stone-600 bg-stone-200 px-1.5 py-0.2 rounded">
                                    Health Cert
                                </span>
                                <p className="text-xs font-bold text-stone-900 truncate">Veterinary Clearance</p>
                                <p className="text-[10px] font-mono text-stone-500">Provincial VHC</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewDoc({
                                    url: opv.veterinary_health_certificate,
                                    title: `Veterinary Health Certificate`,
                                    subtitle: `Application #${application.application_id}`
                                })}
                                className="h-11 w-11 border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 rounded-lg flex items-center justify-center shrink-0 shadow-2xs active:scale-95 transition-all"
                                aria-label="View Veterinary Health Certificate"
                            >
                                <Eye size={18} />
                            </button>
                        </div>
                    )}

                    {/* Uploaded farmer docs */}
                    {application.all_documents?.map((doc) => (
                        <div
                            key={doc.id}
                            className="p-3 bg-stone-50/50 border border-stone-200 rounded-lg flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors"
                        >
                            <div className="space-y-0.5 min-w-0">
                                <p className="text-xs font-bold text-stone-800 uppercase truncate">
                                    {doc.document_type_display}
                                </p>
                                <span className="text-[10px] text-stone-400 font-mono block">
                                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Attached File'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewDoc({
                                    url: doc.file,
                                    title: doc.document_type_display,
                                    subtitle: `Application #${application.application_id}`
                                })}
                                className="h-11 w-11 border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 rounded-lg flex items-center justify-center shrink-0 shadow-2xs active:scale-95 transition-all"
                                aria-label={`View ${doc.document_type_display}`}
                            >
                                <Eye size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Document Viewer Modal */}
            <FileViewerModal
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                fileUrl={previewDoc?.url}
                title={previewDoc?.title}
                subtitle={previewDoc?.subtitle}
            />

            {/* Inspection Logging Action Form */}
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="bg-white border border-stone-200 rounded-xl p-4 sm:p-6 space-y-4 shadow-sm"
            >
                <div className="border-b border-stone-100 pb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block leading-tight">
                        Checkpoint Station Action
                    </span>
                    <h2 className="text-base font-black text-stone-900 uppercase tracking-tight">
                        Record Inspection Result
                    </h2>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-stone-600 block">
                        Inspector Notes / Plate No. / Remarks
                    </label>
                    <textarea
                        {...register('notes')}
                        disabled={isSubmitting || !isValid || isAlreadyChecked}
                        placeholder="Vehicle plate number, driver details, visual animal condition notes..."
                        className="w-full p-3 bg-white border border-stone-300 rounded-lg focus:border-green-700 focus:ring-1 focus:ring-green-700/20 outline-none text-sm text-stone-800 resize-none h-24 placeholder:text-stone-400 transition-all disabled:bg-stone-100 disabled:cursor-not-allowed"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !isValid || isAlreadyChecked}
                    className="w-full h-13 bg-green-700 hover:bg-green-600 active:scale-[0.98] text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:bg-stone-300 disabled:text-stone-600 disabled:cursor-not-allowed cursor-pointer"
                >
                    {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm"></span>
                    ) : isAlreadyChecked ? (
                        <>
                            <ShieldCheck size={18} /> Inspection Already Recorded
                        </>
                    ) : (
                        <>
                            <CheckCircle2 size={18} /> Log Checkpoint Inspection
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default VerifyApplication;
