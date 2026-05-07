import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import {
    ArrowLeft, CheckCircle2, User, MapPin,
    Truck, Calendar, XCircle,
    FileText, ExternalLink, ShieldCheck, AlertTriangle,
    Loader2
} from "lucide-react"
import { api } from "/src/lib/api"
import { toast } from "sonner"
import DateFormatter from "/src/components/DateFormatter"
import { useInspectorLogs } from "/src/hooks/useInspectorLogs"

/**
 * Verify Application Page
 * Inspector-specific view for checking permit validity after QR scan.
 * Minimalist, industrial design focused on speed and clarity in the field.
 */
const VerifyApplication = () => {
    const { token } = useParams()
    const navigate = useNavigate()
    const [application, setApplication] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [location, setLocation] = useState({ lat: 0, lng: 0 })

    const { createLog } = useInspectorLogs()
    const { register, handleSubmit, formState: { isSubmitting } } = useForm()

    useEffect(() => {
        const fetchDetails = async () => {
            // 1. Get GPS Location for the audit trail
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

            // 2. Fetch Permit Data
            try {
                const res = await api.get(`/application/${token}/verify/`)
                setApplication(res.data)
                setIsLoading(false)
            } catch (err) {
                setIsError(true)
                setIsLoading(false)
                toast.error("Invalid Code", {
                    description: "This permit could not be verified."
                })
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
                navigate('/inspector/')
            }
        })
    }

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <span className="loading loading-spinner loading-lg text-green-700"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-4">Checking Permit...</p>
        </div>
    )

    if (isError || !application) return (
        <div className="max-w-xl mx-auto p-8 min-h-screen bg-white">
            <div className="bg-red-50 border border-red-100 p-10 flex flex-col items-center text-center space-y-6">
                <XCircle size={48} className="text-red-600" />
                <div className="space-y-2">
                    <h2 className="text-xl font-black text-red-700 uppercase tracking-tighter leading-none">Invalid Permit</h2>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-widest leading-relaxed">
                        This QR code is either fake, expired, or has been revoked. Do not allow transport.
                    </p>
                </div>
                <button 
                    onClick={() => navigate('/inspector/scan')} 
                    className="w-full bg-stone-800 text-white px-10 py-4 text-[10px] font-black uppercase tracking-widest"
                >
                    Try Another Code
                </button>
            </div>
        </div>
    )

    const isValid = ['RELEASED', 'PAID'].includes(application.status)

    return (
        <div className="max-w-xl mx-auto p-4 md:p-8 min-h-screen bg-white font-sans">
            {/* Header */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-stone-400 text-[10px] font-black uppercase tracking-widest hover:text-green-700 transition-colors mb-8"
            >
                <ArrowLeft size={16} /> Cancel
            </button>

            <div className="mb-10 flex justify-between items-end border-b border-stone-100 pb-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Security Check</p>
                    <h1 className="text-3xl font-black text-stone-800 uppercase tracking-tighter">Verification</h1>
                </div>
                {isValid ? (
                    <div className="bg-green-50 border border-green-600 px-3 py-1 flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Valid</span>
                    </div>
                ) : (
                    <div className="bg-red-50 border border-red-600 px-3 py-1 flex items-center gap-1.5 text-red-700">
                        <XCircle size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Invalid</span>
                    </div>
                )}
            </div>

            <div className="space-y-8">
                {/* Farmer / Basic Info */}
                <div className="flex items-center gap-4 bg-stone-50 p-6 border border-stone-200">
                    <div className="w-12 h-12 bg-white border border-stone-200 flex items-center justify-center text-stone-400">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Transport Owner</p>
                        <h2 className="text-xl font-black text-stone-800 uppercase tracking-tight leading-none mt-0.5">{application.farmer_name}</h2>
                        <p className="text-[10px] font-mono font-bold text-stone-500 mt-1">ID: {application.application_id}</p>
                    </div>
                </div>

                {/* Travel Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="border border-stone-200 p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">From</p>
                        <p className="text-sm font-bold text-stone-800 uppercase tracking-tight">
                            {application.origins?.length > 1 ? "Multiple Origins" : (application.origins?.[0]?.barangay_name || application.origin_barangay_name)}
                        </p>
                    </div>
                    <div className="border border-stone-200 p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">To</p>
                        <p className="text-sm font-bold text-stone-800 uppercase tracking-tight">{application.destination}</p>
                    </div>
                    <div className="border border-stone-200 p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Load</p>
                        <p className="text-sm font-bold text-stone-800 uppercase tracking-tight">{application.number_of_pigs} Heads</p>
                    </div>
                    <div className="border border-stone-200 p-4 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Date</p>
                        <div className="text-sm font-bold text-stone-800 uppercase tracking-tight">
                            <DateFormatter date={application.transport_date} />
                        </div>
                    </div>
                </div>

                {/* Documents Evidence */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Document Evidence</p>
                    <div className="space-y-2">
                        {application.all_documents?.map((doc) => (
                            <div key={doc.id} className="border border-stone-200 p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-stone-800 uppercase tracking-tighter">{doc.document_type_display}</p>
                                    <div className="flex items-center gap-1.5">
                                        {doc.ocr?.status === 'PASSED' ? (
                                            <span className="flex items-center gap-1 text-[9px] font-black text-green-700 uppercase tracking-widest">
                                                <ShieldCheck size={12} /> System Verified
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-widest">
                                                <AlertTriangle size={12} /> Visual Check
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <a 
                                    href={doc.file} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="p-2 border border-stone-200 hover:bg-stone-100 text-stone-600"
                                >
                                    <ExternalLink size={16} />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inspection Log Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4 border-t border-stone-100">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-600">Inspector Notes</label>
                        <textarea
                            {...register('notes')}
                            placeholder="Add observations or issues found..."
                            className="w-full p-4 bg-white border border-stone-200 focus:border-green-700 outline-none text-sm font-medium resize-none h-32 placeholder:text-stone-300"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !isValid}
                        className="w-full bg-green-700 hover:bg-green-800 text-white font-black uppercase tracking-widest text-xs h-14 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                            <>
                                <CheckCircle2 size={16} /> Record Inspection
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default VerifyApplication
