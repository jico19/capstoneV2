import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/** Native dialog supplies focus trapping, Escape and focus restoration. */
const SignatoryModal = ({ title, busy, onClose, children }) => {
    const dialogRef = useRef(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog.showModal();
        return () => dialog.close();
    }, []);

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            aria-busy={busy}
            onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
            onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
            className="fixed inset-0 m-auto w-11/12 max-w-lg max-h-[90dvh] overflow-y-auto rounded-xl p-0 border border-stone-200 bg-white text-stone-800 shadow-sm backdrop:bg-stone-900/40"
        >
            <div>
                <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-stone-200">
                    <h3 id={titleId} className="text-base font-bold">{title}</h3>
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-50">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </dialog>
    );
};

export default SignatoryModal;
