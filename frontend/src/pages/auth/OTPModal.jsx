import { useState, useRef, useEffect } from "react";
import { X, Smartphone, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * OTP Verification Modal Component
 * Provides a dedicated space for entering the 6-digit code.
 */
const OTPModal = ({ isOpen, onClose, phone, onVerify, onResend, isVerifying, isResending }) => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [modalError, setModalError] = useState(null);
    const inputRefs = useRef([]);

    // Reset OTP and errors when modal opens
    useEffect(() => {
        if (isOpen) {
            setOtp(['', '', '', '', '', '']);
            setModalError(null);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [isOpen]);

    const handleChange = (element, index) => {
        if (isNaN(element.value)) return false;
        if (modalError) setModalError(null);

        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);

        // Move to next input if value is entered
        if (element.value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        // Move to previous input on backspace if current is empty
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        const data = e.clipboardData.getData("text").slice(0, 6);
        if (!/^\d+$/.test(data)) return;

        const newOtp = data.split('');
        const filledOtp = [...newOtp, ...Array(6 - newOtp.length).fill('')].slice(0, 6);
        setOtp(filledOtp);
        inputRefs.current[Math.min(data.length, 5)].focus();
    };

    const handleSubmit = async () => {
        const fullOtp = otp.join('');
        if (fullOtp.length === 6) {
            try {
                await onVerify(fullOtp);
            } catch (err) {
                setModalError("Invalid code. Please try again.");
            }
        } else {
            toast.error("Please enter the full 6-digit code");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm border border-stone-200 shadow-2xl relative animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-stone-400 hover:text-stone-900 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8 space-y-8 text-center">
                    <div className="flex justify-center">
                        <div className="bg-green-50 p-4 border border-green-100">
                            <Smartphone className="text-green-600" size={32} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">Verify Your Phone</h3>
                        <p className="text-sm font-medium text-stone-500">
                            We sent a 6-digit code to <br />
                            <span className="font-mono font-black text-stone-800">{phone}</span>
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* 6-Digit Input Grid */}
                        <div className="flex justify-between gap-2" onPaste={handlePaste}>
                            {otp.map((data, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength="1"
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    value={data}
                                    onChange={(e) => handleChange(e.target, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className={`w-10 h-14 sm:w-12 sm:h-16 text-2xl font-black text-center border-2 bg-stone-50 focus:bg-white focus:border-green-600 outline-none transition-all ${modalError ? 'border-red-600 bg-red-50 text-red-900' : 'border-stone-100'}`}
                                />
                            ))}
                        </div>
                        {modalError && (
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{modalError}</p>
                        )}
                    </div>

                    <div className="space-y-4 pt-4">
                        <button
                            onClick={handleSubmit}
                            disabled={isVerifying || otp.join('').length < 6}
                            className="w-full py-4 bg-green-700 hover:bg-green-800 text-white font-black uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isVerifying ? (
                                <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    <span>Verifying...</span>
                                </>
                            ) : "Verify Account"}
                        </button>

                        <div className="flex flex-col gap-2">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Didn't get the code?</p>
                            <button
                                onClick={onResend}
                                disabled={isResending}
                                className="text-stone-900 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:opacity-70 transition-opacity"
                            >
                                {isResending ? (
                                    <>
                                        <RefreshCw size={12} className="animate-spin" />
                                        <span>Sending...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={12} />
                                        <span>Resend New Code</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OTPModal;
