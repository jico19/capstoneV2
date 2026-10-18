import { X, ShieldCheck, Lock, Scale, CheckCircle2, FileText } from "lucide-react";

/**
 * Terms and Privacy Agreement Modal
 * Aligned with FarmPass Design System Version 2.1 (Design.MD)
 * Explicit disclosure under Data Privacy Act of 2012 (RA 10173)
 */
export default function TermsPrivacyModal({ isOpen, onClose, onAccept }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white border border-stone-200 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-stone-200 px-6 py-4 bg-stone-50/50 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-700/20 text-green-700 flex items-center justify-center shrink-0">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h2 className="font-archivo text-base sm:text-lg font-bold text-stone-900 leading-tight">
                                Terms of Service & Privacy Notice
                            </h2>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-green-700 mt-0.5">
                                Republic Act No. 10173 (Data Privacy Act of 2012)
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-800 p-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-stone-600 font-jakarta leading-relaxed">
                    {/* Notice Callout */}
                    <div className="bg-green-50/80 border border-green-600/30 rounded-lg p-3.5 flex items-start gap-2.5 text-stone-800">
                        <CheckCircle2 size={16} className="text-green-700 shrink-0 mt-0.5" />
                        <p className="text-xs">
                            By creating an account, you consent to submitting your personal and farm data to FarmPass <strong>solely for official municipal and provincial livestock regulation</strong>.
                        </p>
                    </div>

                    {/* Section 1 */}
                    <div className="space-y-1">
                        <h3 className="font-archivo text-sm font-bold text-stone-900 flex items-center gap-1.5">
                            <Scale size={14} className="text-green-700" />
                            1. Legal Basis & Data Privacy Act Compliance
                        </h3>
                        <p>
                            The Municipal Agriculture Office (MAO) of Sariaya, Quezon processes your personal information in strict adherence to the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>. We implement physical, technical, and administrative safeguards to protect your records from unauthorized access, alteration, or disclosure.
                        </p>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-1">
                        <h3 className="font-archivo text-sm font-bold text-stone-900 flex items-center gap-1.5">
                            <FileText size={14} className="text-green-700" />
                            2. Sole Operational Purpose of Collected Data
                        </h3>
                        <p>
                            Any information you submit—including your legal name, mobile phone number, farm address, livestock herd numbers, and scanned government credentials—is collected and used <strong>solely and exclusively for municipal operations</strong>:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-stone-700">
                            <li>Evaluating and issuing official Livestock Transport Permits and Animal Inspection Certificates (AIC).</li>
                            <li>Disease biosecurity surveillance and African Swine Fever (ASF) movement control.</li>
                            <li>Enabling veterinary inspection verification at authorized municipality checkpoints.</li>
                            <li>Sending essential SMS verification codes (OTP) and permit status alerts.</li>
                        </ul>
                        <p className="font-semibold text-stone-800">
                            Your information will never be sold, leased, or shared with commercial entities or unauthorized third parties.
                        </p>
                    </div>

                    {/* Section 3 */}
                    <div className="space-y-1">
                        <h3 className="font-archivo text-sm font-bold text-stone-900 flex items-center gap-1.5">
                            <Lock size={14} className="text-green-700" />
                            3. Data Security & Storage
                        </h3>
                        <p>
                            Sensitive citizen fields (such as contact numbers, farm identities, and license credentials) are encrypted at rest using strong AES cryptography. Access is strictly restricted to designated MAO and Provincial Veterinary Office (OPV) personnel through role-based access control.
                        </p>
                    </div>

                    {/* Section 4 */}
                    <div className="space-y-1">
                        <h3 className="font-archivo text-sm font-bold text-stone-900 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-green-700" />
                            4. Citizen Data Rights & Portability
                        </h3>
                        <p>
                            Under RA 10173, you retain the right to access your stored data, rectify inaccurate records, and request an official machine-readable export of your personal information dossier directly through your account settings.
                        </p>
                    </div>

                    {/* Section 5 */}
                    <div className="space-y-1">
                        <h3 className="font-archivo text-sm font-bold text-stone-900 flex items-center gap-1.5">
                            <CheckCircle2 size={14} className="text-green-700" />
                            5. User Responsibility
                        </h3>
                        <p>
                            You certify that all credentials, documentation, and shipment figures submitted are true and correct. Submission of fraudulent documents or unauthorized livestock movements is subject to administrative permit revocation and sanctions under municipal livestock ordinances.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-stone-200 px-6 py-4 flex items-center justify-end gap-2.5 bg-stone-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="border border-stone-200 bg-white text-stone-700 font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (onAccept) onAccept();
                            onClose();
                        }}
                        className="bg-green-700 text-white font-black uppercase tracking-widest text-xs px-5 py-2 rounded-lg hover:bg-green-600 shadow-xs active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <CheckCircle2 size={14} />
                        <span>I Understand & Accept</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
