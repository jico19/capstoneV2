import React from 'react';
import { AlertCircle, HelpCircle, X, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';

/**
 * Reusable Confirmation Modal
 * Strictly adheres to Design.MD: Stone neutrals, flat UI, square edges, no shadows, uppercase tracking-widest labels.
 * Supports standard two-button prompts (Yes/Cancel) or three-button prompts (Yes/No/Cancel).
 * 
 * Props:
 *   isOpen (boolean) - Controls visibility
 *   onClose (function) - Called when Cancel, X, or backdrop is clicked (Cancel action)
 *   onYes (function) - Called when YES / Confirm button is clicked
 *   onNo (function) - (Optional) Called when NO / Decline button is clicked. If provided, renders 3 buttons.
 *   title (string) - Title of the modal
 *   message (string|node) - Message body explaining the decision
 *   yesText (string) - Text for the Yes button (default: "Yes")
 *   noText (string) - Text for the No button (default: "No")
 *   cancelText (string) - Text for the Cancel button (default: "Cancel")
 *   yesVariant (string) - Variant for Yes button: 'primary' | 'danger' | 'success' (default: 'primary')
 *   noVariant (string) - Variant for No button: 'outline' | 'danger' | 'warning' (default: 'danger')
 *   isSubmitting (boolean) - Global loading state
 *   submittingAction (string) - Specific action loading: 'yes' | 'no' | null
 *   type (string) - Context type for icon styling: 'warning' | 'danger' | 'info' | 'help' (default: 'help')
 */
const ConfirmationModal = ({
    isOpen,
    onClose,
    onYes,
    onNo,
    title,
    message,
    yesText = "Yes",
    noText = "No",
    cancelText = "Cancel",
    yesVariant = "primary",
    noVariant = "danger",
    isSubmitting = false,
    submittingAction = null,
    type = "help"
}) => {
    if (!isOpen) return null;

    // Get icon based on modal type
    const getIcon = () => {
        switch (type) {
            case 'danger':
                return <Trash2 size={18} className="text-red-600 shrink-0" />;
            case 'warning':
                return <AlertCircle size={18} className="text-orange-500 shrink-0" />;
            case 'success':
                return <CheckCircle2 size={18} className="text-green-600 shrink-0" />;
            case 'info':
                return <AlertCircle size={18} className="text-sky-600 shrink-0" />;
            default:
                return <HelpCircle size={18} className="text-green-700 shrink-0" />;
        }
    };

    // Get color classes for Yes/No buttons based on variant
    const getYesButtonClass = () => {
        switch (yesVariant) {
            case 'danger':
                return 'bg-red-600 hover:bg-red-700 text-white';
            case 'success':
                return 'bg-green-700 hover:bg-green-600 text-white';
            default:
                return 'bg-green-700 hover:bg-green-600 text-white'; // Primary
        }
    };

    const getNoButtonClass = () => {
        switch (noVariant) {
            case 'danger':
                return 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
            case 'warning':
                return 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100';
            case 'outline':
                return 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-100';
            default:
                return 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100';
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
            onClick={(e) => {
                // Close on clicking backdrop
                if (e.target === e.currentTarget && !isSubmitting) onClose();
            }}
        >
            <div className="bg-white w-full max-w-md border border-stone-200 shadow-2xl rounded-none overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100 bg-stone-50">
                    <div className="flex items-center gap-3">
                        {getIcon()}
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-widest leading-none">{title}</h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting} 
                        className="text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    <div className="text-sm font-medium text-stone-600 leading-relaxed uppercase tracking-wider text-xs">
                        {typeof message === 'string' ? (
                            <p>{message}</p>
                        ) : (
                            message
                        )}
                    </div>

                    {/* Actions Footer */}
                    <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-stone-100">
                        {/* Cancel Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none disabled:opacity-50"
                        >
                            {cancelText}
                        </button>

                        {/* Optional No Button (for 3-button modal) */}
                        {onNo && (
                            <button
                                type="button"
                                onClick={onNo}
                                disabled={isSubmitting}
                                className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${getNoButtonClass()}`}
                            >
                                {isSubmitting && submittingAction === 'no' ? (
                                    <>
                                        <RefreshCw size={12} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    noText
                                )}
                            </button>
                        )}

                        {/* Yes / Confirm Button */}
                        <button
                            type="button"
                            onClick={onYes}
                            disabled={isSubmitting}
                            className={`px-7 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors rounded-none flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${getYesButtonClass()}`}
                        >
                            {isSubmitting && (submittingAction === 'yes' || !submittingAction) ? (
                                <>
                                    <RefreshCw size={12} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                yesText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
