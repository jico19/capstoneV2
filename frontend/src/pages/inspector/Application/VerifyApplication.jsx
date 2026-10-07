import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import {
    ArrowLeft, CheckCircle2, User, MapPin,
    Truck, XCircle, FileText,
    ShieldCheck, AlertTriangle, Phone, FileCheck2,
    Eye, Compass
} from "lucide-react"
import { api } from "../../../lib/api"
import { toast } from "sonner"
import DateFormatter from "../../../components/ui/DateFormatter"
import { useInspectorLogs } from '../../../hooks/useInspectorLogs'
import FileViewerModal from '../../../components/ui/FileViewerModal'

const VerifyApplication = () => {
    const { token } = useParams()
    const navigate = useNavigate()
    const [application, setApplication] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [isAlreadyChecked, setIsAlreadyChecked] = useState(false)
    const [errorMessage, setErrorMessage] = useState("")
    const [location, setLocation] = useState({ lat: 0, lng: 0 })
    const [previewDoc, setPreviewDoc] = useState(null)

    const { createLog } = useInspectorLogs()
    const { register, handleSubmit, formState: { isSubmitting } } = useForm()

    const isValid = application && application.status === 'RELEASED' && !application.is_checked;

    useEffect(() => {
        const fetchDetails = async () => {
            // 1. Get GPS Location for checkpoint log audit
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setLocation({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        })
                    },
                    (error) => console.error("Location error:", error.message),
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            }

            try {
                const res = await api.get(`/application/${token}/verify/`)
                setApplication(res.data)
                if (res.data.is_checked) {
                    setIsAlreadyChecked(true)
                }
                setIsLoading(false)
            } catch (err) {
                setIsError(true)
                setIsLoading(false)

                const backendError = err.response?.data?.error
                const displayMessage = typeof backendError === 'string'
                    ? backendError
                    : "This permit could not be verified or does not exist."

                setErrorMessage(displayMessage)
                toast.error("Verification Failed", { description: displayMessage })
            }
        }
        fetchDetails()
    }, [token])

    const onSubmit = async (data) => {
        const formData = new FormData()
        formData.append('application', application.id)
        formData.append('notes', data.notes || "")
        formData.append('lat', location.lat)
        formData.append('longi', location.lng)

        createLog.mutate(formData, {
            onSuccess: () => {
                toast.success("Checkpoint Inspection Logged", {
                    description: `Permit #${application.application_id} verified successfully.`
                })
                navigate('/inspector/')
            }
        })
    }

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50">
            <span className="loading loading-spinner loading-lg text-green-700"></span>
            <p className="text-xs font-black uppercase tracking-widest text-stone-400 mt-4 animate-pulse">
                Verifying Official Transport Permit...
            </p>
        </div>
    )

    if (isError || !application) return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 min-h-screen bg-stone-50">
            <div className="bg-white border-2 border-red-600 p-8 sm:p-12 text-center space-y-6 shadow-xl">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                    <XCircle size={36} />
                </div>
                <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 bg-red-50 px-3 py-1">
                        Verification Failed
                    </span>
                    <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tight mt-2">
                        Invalid or Expired Permit
                    </h2>
                    <p className="text-xs font-medium text-stone-600 max-w-md mx-auto leading-relaxed">
                        {errorMessage || "This QR code could not be verified. Do not allow livestock transport."}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/inspector/scan')}
                    className="w-full sm:w-auto bg-stone-900 hover:bg-stone-800 text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-colors"
                >
                    Scan Another Permit QR
                </button>
            </div>
        </div>
    )

    // Calculate aggregated animal breakdown across all origins
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
        <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8 min-h-screen bg-stone-50 font-sans pb-24">
            {/* Header Back Link */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-stone-800 transition-colors mb-6"
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            {/* Security Hero Card */}
            <div className={`border-2 p-6 sm:p-8 space-y-4 shadow-lg mb-8 ${
                isAlreadyChecked
                    ? 'border-amber-500 bg-amber-50/50'
                    : isValid
                        ? 'border-green-600 bg-green-50/40'
                        : 'border-red-600 bg-red-50/40'
            }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 text-white ${
                            isAlreadyChecked ? 'bg-amber-600' : isValid ? 'bg-green-700' : 'bg-red-600'
                        }`}>
                            {isAlreadyChecked ? <AlertTriangle size={24} /> : isValid ? <ShieldCheck size={24} /> : <XCircle size={24} />}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                                Checkpoint Security Clearance
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-stone-900 leading-none mt-0.5">
                                {isAlreadyChecked
                                    ? "Inspection Already Recorded"
                                    : isValid
                                        ? "Official Permit Valid"
                                        : "Permit Invalid or Expired"}
                            </h1>
                        </div>
                    </div>

                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 border ${
                        isAlreadyChecked
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : isValid
                                ? 'bg-green-100 text-green-900 border-green-300'
                                : 'bg-red-100 text-red-900 border-red-300'
                    }`}>
                        {isAlreadyChecked ? "RECORDED" : isValid ? "CLEARED FOR TRANSIT" : "UNAUTHORIZED"}
                    </span>
                </div>

                {isAlreadyChecked && (
                    <p className="text-xs font-bold text-amber-900 bg-amber-100/70 p-3 border border-amber-200 uppercase tracking-wide">
                        ⚠️ Note: This permit was previously checked at a municipality checkpoint. Do not duplicate inspection logs unless re-verifying transit cargo.
                    </p>
                )}
            </div>

            <div className="space-y-6">
                {/* Official Credentials Grid */}
                <div className="bg-white border border-stone-200 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <FileCheck2 size={16} className="text-green-700" />
                            Official Permit Credentials
                        </h3>
                        {issuedPermit?.is_paid && (
                            <span className="text-[9px] font-black uppercase bg-green-100 text-green-800 px-2 py-0.5 border border-green-200">
                                ✓ Paid & Released
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div className="bg-stone-50 p-3 border border-stone-200/80">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Permit Reference</span>
                            <span className="font-mono font-black text-stone-900 text-sm block mt-0.5">
                                {issuedPermit?.permit_number || application.application_id}
                            </span>
                        </div>

                        <div className="bg-stone-50 p-3 border border-stone-200/80">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">AIC Number</span>
                            <span className="font-mono font-bold text-stone-900 block mt-0.5">
                                {application.aic_number || issuedPermit?.aic_number || 'AIC Issued'}
                            </span>
                        </div>

                        <div className="bg-stone-50 p-3 border border-stone-200/80">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Validity Expiry</span>
                            <span className="font-bold text-stone-900 block mt-0.5">
                                {application.valid_until ? (
                                    <DateFormatter date={application.valid_until} />
                                ) : (
                                    'Standard 3-Day Window'
                                )}
                            </span>
                        </div>

                        <div className="bg-stone-50 p-3 border border-stone-200/80">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Payment Status</span>
                            <span className="font-bold text-stone-800 block mt-0.5">
                                ₱{application.permit_fee || 150} • {issuedPermit?.payment_method || 'ONLINE'}
                            </span>
                        </div>

                        <div className="bg-stone-50 p-3 border border-stone-200/80 sm:col-span-2">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Issued By Officer</span>
                            <span className="font-bold text-stone-900 block mt-0.5">
                                {issuedPermit?.issued_by || 'MAO Agriculture Officer'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Farmer & Source Farm Details */}
                <div className="bg-white border border-stone-200 p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                        <User size={16} className="text-stone-400" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                            Shipper & Farmer Contact
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Permit Applicant</span>
                            <p className="text-sm font-bold text-stone-900 uppercase">{application.farmer_name}</p>
                            {application.farmer_phone && (
                                <p className="text-xs font-mono text-stone-600 flex items-center gap-1.5 mt-1">
                                    <Phone size={12} className="text-stone-400" /> {application.farmer_phone}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">Destination Address</span>
                            <p className="text-xs font-bold text-stone-900 uppercase flex items-start gap-1">
                                <MapPin size={14} className="text-green-700 shrink-0 mt-0.5" />
                                {application.destination}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Swine Cargo Classification Grid */}
                <div className="bg-white border border-stone-200 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                            <Truck size={16} className="text-green-700" />
                            <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest">
                                Swine Load Breakdown
                            </h3>
                        </div>
                        <span className="text-xs font-mono font-black text-stone-900 bg-stone-100 px-2.5 py-1 border border-stone-200">
                            Total: {totalSwine} pigs
                        </span>
                    </div>

                    {/* Animal Category Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        <div className="bg-stone-50 border border-stone-200 p-2.5 text-center">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Inahin (Sow)</span>
                            <span className="text-base font-black text-stone-900 font-mono">{animalTotals.inahin}</span>
                        </div>
                        <div className="bg-stone-50 border border-stone-200 p-2.5 text-center">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Barako (Boar)</span>
                            <span className="text-base font-black text-stone-900 font-mono">{animalTotals.barako}</span>
                        </div>
                        <div className="bg-stone-50 border border-stone-200 p-2.5 text-center">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Starter (Biik)</span>
                            <span className="text-base font-black text-stone-900 font-mono">{animalTotals.starter}</span>
                        </div>
                        <div className="bg-stone-50 border border-stone-200 p-2.5 text-center">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Grower</span>
                            <span className="text-base font-black text-stone-900 font-mono">{animalTotals.grower}</span>
                        </div>
                        <div className="bg-stone-50 border border-stone-200 p-2.5 text-center">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Fattener</span>
                            <span className="text-base font-black text-stone-900 font-mono">{animalTotals.fattener}</span>
                        </div>
                        <div className="bg-stone-50 border border-stone-200 p-2.5 text-center">
                            <span className="text-[9px] font-black text-stone-400 uppercase block">Bulaw</span>
                            <span className="text-base font-black text-stone-900 font-mono">{animalTotals.bulaw}</span>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-black uppercase text-stone-400">Transport Purpose</span>
                        <span className="font-bold text-stone-800 uppercase bg-stone-100 px-2 py-0.5">
                            {application.purpose || 'Livestock Transport'}
                        </span>
                    </div>

                    {/* Origins breakdown */}
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                        <span className="text-[9px] font-black uppercase tracking-wider text-stone-400 block">Starting Farm Locations</span>
                        {application.origins?.map((origin, idx) => (
                            <div key={origin.id} className="p-3 bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                <div>
                                    <span className="font-bold text-stone-900 uppercase">
                                        Location #{idx + 1}: Barangay {origin.barangay_name}
                                    </span>
                                    {origin.source_farmer_name && (
                                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">
                                            Source Owner: <span className="font-bold text-stone-700">{origin.source_farmer_name}</span>
                                            {origin.source_phone_no ? ` • Tel: ${origin.source_phone_no}` : ''}
                                        </p>
                                    )}
                                </div>
                                <span className="font-black text-stone-800 font-mono">
                                    {origin.number_of_pigs} pigs
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Certificate & Document Evidence Hub */}
                <div className="bg-white border border-stone-200 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={16} className="text-stone-400" />
                            Official Certificates & Document Evidence
                        </h3>
                        <span className="text-[10px] text-stone-400 font-mono font-bold">
                            {(application.all_documents?.length || 0) + (opv?.veterinary_health_certificate ? 2 : 0)} files
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Primary Issued Permit PDF if available */}
                        {issuedPermit?.permit_pdf && (
                            <div className="border-2 border-green-600 bg-green-50/50 p-4 flex items-center justify-between">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-green-700 bg-green-200 px-1.5 py-0.5">
                                        ✓ Official Pass
                                    </span>
                                    <h4 className="font-bold text-stone-900 text-xs mt-1">Official Transport Permit</h4>
                                    <p className="text-[10px] text-stone-500 font-mono">Permit #{issuedPermit.permit_number}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDoc({
                                        url: issuedPermit.permit_pdf,
                                        title: `Official Transport Permit - ${issuedPermit.permit_number}`,
                                        subtitle: `Issued to ${application.farmer_name}`
                                    })}
                                    className="p-2 bg-green-700 hover:bg-green-600 text-white transition-colors cursor-pointer"
                                    title="View Official Permit PDF"
                                >
                                    <Eye size={16} />
                                </button>
                            </div>
                        )}

                        {/* OPV VHC / Shipping Pass if available */}
                        {opv?.veterinary_health_certificate && (
                            <div className="border border-stone-200 bg-stone-50 p-4 flex items-center justify-between">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-600 bg-stone-200 px-1.5 py-0.5">
                                        OPV Health Cert
                                    </span>
                                    <h4 className="font-bold text-stone-900 text-xs mt-1">Veterinary Health Certificate</h4>
                                    <p className="text-[10px] text-stone-500 font-mono">Provincial Veterinary Clearance</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDoc({
                                        url: opv.veterinary_health_certificate,
                                        title: `Veterinary Health Certificate`,
                                        subtitle: `Application #${application.application_id}`
                                    })}
                                    className="p-2 border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
                                >
                                    <Eye size={16} />
                                </button>
                            </div>
                        )}

                        {/* All Uploaded Documents */}
                        {application.all_documents?.map((doc) => (
                            <div key={doc.id} className="border border-stone-200 p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                                <div className="space-y-0.5">
                                    <h4 className="text-xs font-bold text-stone-800 uppercase">{doc.document_type_display}</h4>
                                    <span className="text-[9px] text-stone-400 font-mono block">
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
                                    className="p-2 border border-stone-200 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
                                    title="View Document"
                                >
                                    <Eye size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Built-in Document Viewer Modal */}
                <FileViewerModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc?.url}
                    title={previewDoc?.title}
                    subtitle={previewDoc?.subtitle}
                />

                {/* Inspection Logging Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="bg-white border-2 border-stone-800 p-6 sm:p-8 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Checkpoint Audit</span>
                            <h3 className="text-base font-black text-stone-900 uppercase tracking-tight">Record Inspection Log</h3>
                        </div>
                        {location.lat !== 0 && (
                            <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold bg-stone-100 text-stone-600 px-2 py-1 border border-stone-200">
                                <Compass size={12} className="text-green-700" />
                                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-600 block">
                            Inspector Observations & Checkpoint Notes
                        </label>
                        <textarea
                            {...register('notes')}
                            disabled={isSubmitting}
                            placeholder="Specify truck plate number, driver identity, animal physical condition, or checkpoint notes..."
                            className="w-full p-4 bg-white border border-stone-300 focus:border-stone-900 outline-none text-xs font-medium resize-none h-28 placeholder:text-stone-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !isValid || isAlreadyChecked}
                        className="w-full bg-green-700 hover:bg-green-600 text-white font-black uppercase tracking-widest text-xs h-14 flex items-center justify-center gap-2 transition-colors shadow-md shadow-green-700/20 disabled:opacity-50 disabled:bg-stone-200 disabled:text-stone-500 disabled:shadow-none cursor-pointer"
                    >
                        {isSubmitting ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : isAlreadyChecked ? (
                            <>
                                <ShieldCheck size={18} /> Inspection Already Recorded
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} /> Record Checkpoint Inspection
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default VerifyApplication;
