import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import useAuthStore from '../../../store/authStore';
import { 
    ShieldCheck, 
    UploadCloud, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    ArrowLeft, 
    FileText, 
    Calendar, 
    AlertTriangle,
    FileCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import FileViewerModal from '../../../components/ui/FileViewerModal';

const DOC_CONFIG = [
    {
        type: 'handlers_license',
        title: "Handler's License",
        subtitle: "Bureau of Animal Industry (BAI) Accreditation",
        description: "Official license permitting handler transport and care of livestock.",
    },
    {
        type: 'transport_carrier_reg',
        title: "Transport License / Vehicle Registration",
        subtitle: "Transport Carrier Registration or Vehicle OR/CR",
        description: "Valid certificate of registration and official receipt for the transport vehicle.",
    },
    {
        type: 'traders_pass',
        title: "Trader's Pass",
        subtitle: "LGU / Municipal Livestock Trader Permit",
        description: "Municipal livestock trading clearance issued by Sariaya Agriculture Office.",
    },
];

const DocumentVerificationPage = () => {
    const { user, updateUser, fetchUserProfile } = useAuthStore();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Local form states
    const [files, setFiles] = useState({});
    const [expirations, setExpirations] = useState({});
    const [licenseNumbers, setLicenseNumbers] = useState({});
    const [previews, setPreviews] = useState({});
    const [viewerDoc, setViewerDoc] = useState(null); // { url, title, subtitle }


    // Fetch existing documents from backend
    const { data: docData, isLoading } = useQuery({
        queryKey: ['farmer-documents'],
        queryFn: async () => {
            const res = await api.get('/user/documents/');
            return res.data;
        },
        refetchInterval: (query) => {
            // Auto-poll every 3s if any document OCR is still PENDING
            const docs = query.state.data?.documents || [];
            const hasPendingOCR = docs.some((d) => d.ocr_status === 'PENDING');
            return hasPendingOCR ? 3000 : false;
        },
    });

    useEffect(() => {
        if (docData) {
            // Update auth store if status changed
            if (docData.verification_status && docData.verification_status !== user?.verification_status) {
                updateUser({
                    verification_status: docData.verification_status,
                    verification_remarks: docData.verification_remarks,
                });
            }

            // Populate existing expirations and license numbers
            if (docData.documents) {
                const expMap = {};
                const licMap = {};
                docData.documents.forEach((doc) => {
                    if (doc.expiration_date) {
                        expMap[doc.document_type] = doc.expiration_date;
                    }
                    if (doc.license_number) {
                        licMap[doc.document_type] = doc.license_number;
                    }
                });
                setExpirations((prev) => ({ ...expMap, ...prev }));
                setLicenseNumbers((prev) => ({ ...licMap, ...prev }));
            }
        }
    }, [docData, updateUser, user?.verification_status]);

    const handleFileChange = (type, file) => {
        if (!file) return;
        setFiles((prev) => ({ ...prev, [type]: file }));

        // Generate preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                setPreviews((prev) => ({ ...prev, [type]: reader.result }));
            };
            reader.readAsDataURL(file);
        } else {
            setPreviews((prev) => ({ ...prev, [type]: null }));
        }
    };

    const handleDateChange = (type, date) => {
        setExpirations((prev) => ({ ...prev, [type]: date }));
    };

    const handleLicenseNoChange = (type, val) => {
        setLicenseNumbers((prev) => ({ ...prev, [type]: val }));
    };

    const uploadMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData();
            Object.keys(files).forEach((type) => {
                if (files[type]) {
                    formData.append(type, files[type]);
                }
            });
            Object.keys(expirations).forEach((type) => {
                if (expirations[type]) {
                    formData.append(`${type}_expiry`, expirations[type]);
                }
            });
            Object.keys(licenseNumbers).forEach((type) => {
                if (licenseNumbers[type]) {
                    formData.append(`${type}_license_number`, licenseNumbers[type]);
                }
            });

            const res = await api.post('/user/documents/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success("Documents submitted successfully!", {
                description: "OCR is scanning your files. Expiry and license numbers will auto-populate shortly.",
            });
            updateUser({
                verification_status: data.verification_status,
                verification_remarks: data.verification_remarks,
            });
            queryClient.invalidateQueries({ queryKey: ['farmer-documents'] });
            fetchUserProfile();
        },
        onError: (err) => {
            console.error(err);
            const msg = err.response?.data?.error || "Failed to submit documents. Please try again.";
            toast.error("Submission Failed", { description: msg });
        },
    });


    const status = docData?.verification_status || user?.verification_status || 'UNVERIFIED';
    const remarks = docData?.verification_remarks || user?.verification_remarks;

    const existingDocsMap = {};
    if (docData?.documents) {
        docData.documents.forEach((d) => {
            existingDocsMap[d.document_type] = d;
        });
    }

    const hasAllThree = DOC_CONFIG.every(
        (cfg) => files[cfg.type] || existingDocsMap[cfg.type]
    );

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Navigation & Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-200 pb-5">
                <div>
                    <Link
                        to="/farmer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 uppercase tracking-widest transition-colors mb-2"
                    >
                        <ArrowLeft size={14} /> Back to Dashboard
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-black text-stone-900 uppercase tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-green-700" size={32} />
                        Account Document Verification
                    </h1>
                    <p className="text-xs text-stone-500 mt-1">
                        Sariaya Municipal Agriculture Office (MAO) Standing Credentials
                    </p>
                </div>
            </div>

            {/* Status Banner (GCash-style KYC tier notification) */}
            {status === 'VERIFIED' && (
                <div className="bg-green-50 border-2 border-green-600 p-5 flex items-start gap-4">
                    <CheckCircle2 className="text-green-700 mt-0.5 flex-shrink-0" size={24} />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-green-800">
                                Fully Verified Account
                            </span>
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-green-200 text-green-900">
                                Active
                            </span>
                        </div>
                        <p className="text-xs text-green-700">
                            Your standing credentials have been verified by the Municipal Agriculture Office. You are authorized to create and submit livestock transport permits. Your verified licenses are automatically attached to all future applications.
                        </p>
                    </div>
                </div>
            )}

            {status === 'PENDING_REVIEW' && (
                <div className="bg-amber-50 border-2 border-amber-500 p-5 flex items-start gap-4">
                    <Clock className="text-amber-600 mt-0.5 flex-shrink-0" size={24} />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-amber-800">
                                Documents Under Review
                            </span>
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-200 text-amber-900">
                                Pending Approval
                            </span>
                        </div>
                        <p className="text-xs text-amber-700">
                            Your submitted documents have been received and are currently being reviewed by MAO staff. You will receive an SMS notification once approved. Permit requests will unlock automatically.
                        </p>
                    </div>
                </div>
            )}

            {status === 'REJECTED' && (
                <div className="bg-red-50 border-2 border-red-500 p-5 flex items-start gap-4">
                    <AlertCircle className="text-red-600 mt-0.5 flex-shrink-0" size={24} />
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-widest text-red-800">
                                Verification Needs Attention
                            </span>
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-red-200 text-red-900">
                                Action Required
                            </span>
                        </div>
                        <p className="text-xs text-red-700 font-medium">
                            Remarks from MAO: <span className="font-bold">{remarks || "Some documents were unclear or invalid."}</span>
                        </p>
                        <p className="text-xs text-red-600">
                            Please re-upload a clear copy of the requested document below and submit again.
                        </p>
                    </div>
                </div>
            )}

            {status === 'UNVERIFIED' && (
                <div className="bg-stone-100 border-2 border-stone-400 p-5 flex items-start gap-4">
                    <AlertTriangle className="text-stone-700 mt-0.5 flex-shrink-0" size={24} />
                    <div className="space-y-1">
                        <span className="text-xs font-black uppercase tracking-widest text-stone-800">
                            Verification Required to Apply for Permits
                        </span>
                        <p className="text-xs text-stone-600">
                            Municipal regulations require farmers to submit three standing regulatory credentials: Handler's License, Transport License, and Trader's Pass. Once verified, you won't need to re-upload these for individual permit requests.
                        </p>
                    </div>
                </div>
            )}

            {/* Document Upload Cards */}
            <div className="space-y-4">
                {DOC_CONFIG.map((cfg, index) => {
                    const existing = existingDocsMap[cfg.type];
                    const currentFile = files[cfg.type];
                    const preview = previews[cfg.type];
                    const expiry = expirations[cfg.type] || '';

                    const isUploaded = !!currentFile || !!existing;

                    return (
                        <div
                            key={cfg.type}
                            className="bg-white border border-stone-200 p-5 space-y-4 transition-all hover:border-stone-300"
                        >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                                            Document {index + 1} of 3
                                        </span>
                                        {existing?.is_verified ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-green-100 text-green-800">
                                                <CheckCircle2 size={10} /> Verified
                                            </span>
                                        ) : isUploaded ? (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-800">
                                                <Clock size={10} /> On File
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-stone-100 text-stone-600">
                                                Missing
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-stone-900 uppercase tracking-tight mt-0.5">
                                        {cfg.title}
                                    </h3>
                                    <p className="text-xs text-stone-500 font-medium">
                                        {cfg.subtitle}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-stone-600">{cfg.description}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                                {/* File Upload Input */}
                                <div>
                                    <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider mb-1.5">
                                        Document Photo or PDF
                                    </label>
                                    <label
                                        className={`flex flex-col items-center justify-center p-4 border-2 border-dashed cursor-pointer transition-all ${
                                            isUploaded
                                                ? 'border-green-600 bg-green-50/30 hover:bg-green-50/60'
                                                : 'border-stone-300 hover:border-stone-400 bg-stone-50'
                                        }`}
                                    >
                                        <UploadCloud
                                            size={24}
                                            className={isUploaded ? 'text-green-700' : 'text-stone-400'}
                                        />
                                        <span className="text-xs font-bold text-stone-800 mt-2">
                                            {currentFile ? currentFile.name : existing ? 'Replace current document' : 'Select photo or PDF'}
                                        </span>
                                        <span className="text-[10px] text-stone-400 mt-0.5">
                                            JPG, PNG, PDF up to 10MB
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,application/pdf"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(cfg.type, e.target.files?.[0])}
                                        />
                                    </label>

                                    {/* Existing File Link or Image Preview */}
                                    {preview ? (
                                        <div className="mt-2">
                                            <p className="text-[9px] font-black text-stone-400 uppercase tracking-wider mb-1">New Upload Preview:</p>
                                            <button
                                                type="button"
                                                onClick={() => setViewerDoc({ url: preview, title: cfg.title, subtitle: 'New Upload Pending Submission' })}
                                                className="group relative block cursor-zoom-in"
                                            >
                                                <img src={preview} alt="Preview" className="h-24 w-auto object-contain border border-stone-200 group-hover:opacity-90" />
                                                <span className="absolute bottom-1 right-1 bg-stone-900/80 text-white text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest">
                                                    Click to Zoom
                                                </span>
                                            </button>
                                        </div>
                                    ) : existing?.file ? (
                                        <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                                            <FileCheck size={14} className="text-green-700" />
                                            <button
                                                type="button"
                                                onClick={() => setViewerDoc({ 
                                                    url: existing.file, 
                                                    title: `${cfg.title} - On File`, 
                                                    subtitle: existing.license_number ? `Reg/License: ${existing.license_number}` : undefined 
                                                })}
                                                className="font-medium text-green-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                            >
                                                Preview Document in App
                                            </button>
                                        </div>
                                    ) : null}
                                </div>


                                {/* License Number & Expiration Date Input */}
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider">
                                                License / Pass / Reg Number
                                            </label>
                                            {existing?.ocr_status === 'PROCESSED' && existing?.license_number && (
                                                <span className="text-[9px] font-black uppercase text-green-700 bg-green-50 px-1.5 py-0.5 border border-green-200">
                                                    OCR Extracted
                                                </span>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={licenseNumbers[cfg.type] || ''}
                                            onChange={(e) => handleLicenseNoChange(cfg.type, e.target.value)}
                                            placeholder="e.g. 2025-DARFO-IV-A-... or TrPASS-..."
                                            className="w-full bg-white border border-stone-300 text-stone-800 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-stone-800 font-mono"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-[10px] font-black text-stone-500 uppercase tracking-wider">
                                                Expiration Date
                                            </label>
                                            {existing?.ocr_status === 'PROCESSED' && existing?.expiration_date && (
                                                <span className="text-[9px] font-black uppercase text-green-700 bg-green-50 px-1.5 py-0.5 border border-green-200">
                                                    OCR Extracted
                                                </span>
                                            )}
                                            {existing?.ocr_status === 'PENDING' && (
                                                <span className="text-[9px] font-bold text-amber-600 animate-pulse">
                                                    OCR reading file...
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={expiry}
                                                onChange={(e) => handleDateChange(cfg.type, e.target.value)}
                                                className="w-full bg-white border border-stone-300 text-stone-800 text-xs px-3 py-2.5 rounded-none focus:outline-none focus:border-stone-800"
                                            />
                                        </div>
                                        <p className="text-[10px] text-stone-400 mt-1">
                                            System auto-populates from document or notifies 30 days before expiration.
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-stone-200">
                <button
                    type="button"
                    onClick={() => navigate('/farmer')}
                    className="w-full sm:w-auto px-6 py-3 border border-stone-300 text-stone-700 text-xs font-black uppercase tracking-widest hover:bg-stone-50 transition-colors"
                >
                    Back to Dashboard
                </button>

                <button
                    type="button"
                    disabled={uploadMutation.isPending || Object.keys(files).length === 0}
                    onClick={() => uploadMutation.mutate()}
                    className={`w-full sm:w-auto px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all ${
                        uploadMutation.isPending || Object.keys(files).length === 0
                            ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            : 'bg-green-700 hover:bg-green-600 text-white shadow-md shadow-green-700/20'
                    }`}
                >
                    {uploadMutation.isPending
                        ? 'Uploading & Submitting...'
                        : status === 'VERIFIED'
                        ? 'Update Documents'
                        : 'Submit Documents for Verification'}
                </button>
            </div>

            {/* In-App Document Preview Modal */}
            <FileViewerModal
                isOpen={!!viewerDoc}
                onClose={() => setViewerDoc(null)}
                fileUrl={viewerDoc?.url}
                title={viewerDoc?.title}
                subtitle={viewerDoc?.subtitle}
            />
        </div>
    );
};

export default DocumentVerificationPage;

