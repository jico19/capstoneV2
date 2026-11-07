import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../../../lib/api';
import { getErrorMessage } from '../../../lib/utils';

function ConfirmationDialog({ applicationId, onClose }) {
    const dialog = useRef(null);
    const [confirmed, setConfirmed] = useState(false);
    const [reference, setReference] = useState('');
    const query = useQueryClient();
    const generate = useMutation({
        mutationFn: async () => {
            const res = await api.post(`/application/${applicationId}/confirm-mao-certificate/`, {
                confirmed, reference,
            });
            return res.data;
        },
        onSuccess: (data) => {
            query.setQueryData(['application', String(applicationId)], data);
            query.invalidateQueries({ queryKey: ['application'] });
            query.invalidateQueries({ queryKey: ['agri_metrics'] });
            toast.success('MAO Certificate confirmed.');
            onClose();
        },
    });
    useEffect(() => {
        dialog.current.showModal();
    }, []);

    return (
        <dialog ref={dialog} aria-labelledby="mao-confirm-title"
            onCancel={(event) => { event.preventDefault(); if (!generate.isPending) onClose(); }}
            className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-xl border border-stone-200 bg-white p-0 text-stone-800 shadow-xl backdrop:bg-stone-900/50">
            <form onSubmit={(event) => {
                event.preventDefault();
                if (confirmed && reference.trim() && !generate.isPending) generate.mutate();
            }}>
                <h2 id="mao-confirm-title" className="border-b border-stone-200 px-6 py-4 text-base font-bold">Generate MAO Certificate</h2>
                <div className="space-y-5 p-6">
                    <label className="flex items-start gap-3 text-sm leading-relaxed">
                        <input type="checkbox" required checked={confirmed} autoFocus
                            disabled={generate.isPending} onChange={(event) => setConfirmed(event.target.checked)}
                            className="mt-1 h-4 w-4 shrink-0 accent-green-700" />
                        <span>I have reviewed the relevant official records and authorize issuance of this MAO Certificate.</span>
                    </label>
                    <div>
                        <label htmlFor="mao-reference" className="mb-2 block text-sm font-semibold">Document reference / review note</label>
                        <textarea id="mao-reference" required maxLength={1000} rows={4} value={reference}
                            disabled={generate.isPending} onChange={(event) => setReference(event.target.value)}
                            className="w-full rounded-lg border border-stone-200 p-3 text-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700" />
                        <p className="mt-1 text-right text-xs text-stone-500">{reference.length}/1,000 characters</p>
                    </div>
                    {generate.isError && <p role="alert" className="text-sm text-red-600">{getErrorMessage(generate.error, 'Could not confirm the certificate. Please try again.')}</p>}
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-stone-50/50 px-6 py-4">
                    <button type="button" disabled={generate.isPending} onClick={onClose}
                        className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={!confirmed || !reference.trim() || generate.isPending}
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50">
                        {generate.isPending ? 'Confirming…' : 'Confirm and Generate'}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

export default function MAOCertificatePanel({ application }) {
    const [isOpen, setIsOpen] = useState(false);
    const confirmed = Boolean(application.mao_confirmed_at);
    const canConfirm = ['OPV_VALIDATED', 'PAYMENT_PENDING'].includes(application.status);
    const opv = application.opv_validation;
    const hasOPVDocuments = opv?.status === 'VALIDATED' && opv.veterinary_health_certificate && opv.transportation_pass;
    if (!canConfirm && !confirmed) return null;

    return (
        <section aria-labelledby="mao-certificate-heading" className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 id="mao-certificate-heading" className="text-lg font-bold text-stone-900">MAO Certificate</h2>
            {confirmed ? (
                <>
                    <dl className="space-y-3 text-sm">
                        <div><dt className="text-stone-500">Confirmed by</dt><dd className="font-semibold">{application.mao_confirmed_by?.name}</dd></div>
                        <div><dt className="text-stone-500">Confirmation date</dt><dd>{new Date(application.mao_confirmed_at).toLocaleString()}</dd></div>
                        <div><dt className="text-stone-500">Document reference / review note</dt><dd className="whitespace-pre-wrap break-words">{application.mao_confirmation_reference}</dd></div>
                    </dl>
                    {!application.mao_certificate_pdf && <p role="status" className="text-sm text-stone-600">Generating certificate…</p>}
                    {application.mao_certificate_pdf && <p className="text-sm text-stone-600">The certificate is available in the documents above.</p>}
                </>
            ) : (
                <>
                    <p className="text-sm text-stone-600">Review the relevant official records, then confirm to generate the MAO Certificate.</p>
                    {!hasOPVDocuments && <p className="text-sm text-amber-800">OPV approval and both returned documents are required.</p>}
                    <button type="button" disabled={!hasOPVDocuments} onClick={() => setIsOpen(true)}
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50">Generate MAO Certificate</button>
                </>
            )}
            {isOpen && <ConfirmationDialog applicationId={application.id} onClose={() => setIsOpen(false)} />}
        </section>
    );
}
