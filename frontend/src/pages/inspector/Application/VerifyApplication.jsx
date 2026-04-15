import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import {
    ArrowLeft, CheckCircle2, User, MapPin,
    Truck, Calendar, Loader2, XCircle,
    FileText, ExternalLink, ShieldCheck, AlertTriangle
} from "lucide-react"
import { api } from "/src/lib/api"



const VerifyApplication = () => {
    const { token } = useParams()
    const navigate = useNavigate()
    const [application, setApplication] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isError, setIsError] = useState(false)
    const [location, setLocation] = useState({ lat: null, lng: null })

    const { register, handleSubmit, formState: { isSubmitting } } = useForm()

    useEffect(() => {
        const fetchDetails = async () => {
            // 1. Get GPS Location
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setLocation({
                            lat: position.coords.latitude,
                            lgn: position.coords.longitude
                        })
                    },
                    (error) => console.error("Location error:", error.message),
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            }

            // 2. Fetch Permit Data
            try {
                // Uncomment your real API call:
                const res = await api.get(`/application/${token}/verify/`)
                setApplication(res.data)

                // // MOCK DATA (Matches the structure you provided)
                setTimeout(() => {

                    setIsLoading(false);
                }, 800);
            } catch (err) {
                setIsError(true);
                setIsLoading(false);
            }
        }
        fetchDetails()
    }, [])

    const handleLog = async (data) => {
        console.log(location)

        const formData = new FormData()
        formData.append('application', application.id)
        formData.append('notes', data.notes)
        formData.append('lat', location.lat)
        formData.append('longi', location.lgn)

        console.log("Logged Data:", Object.fromEntries(formData));
        const res = await api.post(`/inspector/`, formData)
        console.log(res.data)
        navigate(-1)
    }

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-green-700">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="font-semibold text-sm">Verifying QR Code...</p>
            </div>
        )
    }

    if (isError || !application) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <XCircle size={64} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900">Invalid Permit</h1>
                <p className="mt-2 text-gray-500 text-sm">This permit could not be found or has been revoked.</p>
                <button onClick={() => navigate(-1)} className="mt-8 btn btn-outline rounded-xl w-full">
                    Scan Again
                </button>
            </div>
        )
    }


    const isValid = ['RELEASED', 'PAID'].includes(application.status);

    return (
        <div className="min-h-screen pb-10">

            {/* Header Navigation */}
            <div className="flex items-center gap-4 px-6 py-5">
                <button onClick={() => navigate(-1)} className="text-gray-800 hover:bg-gray-200 p-1 rounded-full transition-colors">
                    <ArrowLeft size={22} />
                </button>
                <h1 className="text-xl font-bold text-gray-900">QR Scanner</h1>
            </div>

            <div className="px-5 space-y-6 max-w-md mx-auto">

                {/* 1. Main Permit Card */}
                <div className={`bg-white rounded-2xl border ${isValid ? 'border-green-200' : 'border-red-200'} shadow-sm overflow-hidden`}>
                    <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            Livestock Transport Permit
                        </span>
                        {isValid ? (
                            <div className="flex items-center gap-1 text-green-700 font-bold text-[11px] uppercase tracking-wider">
                                <CheckCircle2 size={14} /> Valid
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-red-600 font-bold text-[11px] uppercase tracking-wider">
                                <XCircle size={14} /> Invalid
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-700 shrink-0 border border-green-100">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">{application.farmer_name}</h2>
                            <p className="text-sm text-gray-500">{application.application_id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-5 gap-x-4 p-5">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-400">
                                <MapPin size={14} />
                                <span className="text-xs font-medium">Origin</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{application.origin_barangay_name}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-400">
                                <MapPin size={14} />
                                <span className="text-xs font-medium">Destination</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{application.destination}</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-400">
                                <Truck size={14} />
                                <span className="text-xs font-medium">No. of Pigs</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{application.number_of_pigs} heads</p>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-gray-400">
                                <Calendar size={14} />
                                <span className="text-xs font-medium">Transport Date</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{formatDate(application.transport_date)}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Attached Documents Card */}
                {application.documents && application.documents.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center px-5 py-3 border-b border-gray-100 gap-2">
                            <FileText size={16} className="text-gray-400" />
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                Attached Documents
                            </span>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {application.documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-gray-800">{doc.document_type_display}</span>

                                        {/* Status Badge from OCR data */}
                                        {doc.ocr?.status === 'PASSED' ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 mt-1 uppercase">
                                                <ShieldCheck size={12} /> System Verified
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-600 mt-1 uppercase">
                                                <AlertTriangle size={12} /> Manual Check
                                            </span>
                                        )}
                                    </div>

                                    <a
                                        href={doc.file}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-1.5 bg-green-50 text-[#2c7a51] hover:bg-green-100 px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        View <ExternalLink size={14} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Inspection Form */}
                <form onSubmit={handleSubmit(handleLog)} className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-800">Inspection Remarks</label>
                        <textarea
                            {...register('notes')}
                            placeholder="e.g. All pigs accounted for, documents matched"
                            className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 text-sm font-medium resize-none h-28 placeholder:text-gray-400 text-gray-800 shadow-sm"
                        ></textarea>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !isValid}
                        className="w-full bg-[#2c7a51] hover:bg-green-800 text-white font-medium text-sm h-14 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                <CheckCircle2 size={18} /> Submit Inspection Log
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default VerifyApplication