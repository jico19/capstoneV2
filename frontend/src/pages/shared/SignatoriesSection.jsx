import Skeleton from 'react-loading-skeleton';
import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { documentsForPosition } from '../../lib/signatories';
import SignatoryDocumentOverview from './SignatoryDocumentOverview';
import SignatoryOfficialRow from './SignatoryOfficialRow';
import SignatoryEditorModal from './SignatoryEditorModal';
import SignatoryModal from './SignatoryModal';

const NEW_OFFICIAL = { name: '', title: '', position: 'MUNICIPAL_AGRICULTURIST', is_default: false };

const SignatoriesSection = () => {
    const [roster, setRoster] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [editor, setEditor] = useState(null);
    const [retiring, setRetiring] = useState(null);
    const [showRetired, setShowRetired] = useState(false);
    const headingRef = useRef(null);

    const loadRoster = async () => {
        try {
            const response = await api.get('/signatory/?limit=100');
            setRoster(response.data?.results ?? response.data ?? []);
            setLoadError(false);
        } catch {
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadRoster(); }, []);

    const reportError = (error) => {
        const detail = error.response?.data;
        const firstError = detail && typeof detail === 'object' ? Object.values(detail)[0] : null;
        toast.error('Could not save changes.', { description: Array.isArray(firstError) ? firstError[0] : firstError });
    };

    const saveOfficial = async (values) => {
        setIsSaving(true);
        try {
            if (editor.id) {
                await api.patch(`/signatory/${editor.id}/`, values);
            } else {
                await api.post('/signatory/', { ...values, is_active: true });
            }
            setEditor(null);
            await loadRoster();
            headingRef.current?.focus();
            toast.success('Official saved.');
        } catch (error) {
            reportError(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUseSigner = async (official) => {
        setIsSaving(true);
        try {
            await api.patch(`/signatory/${official.id}/`, { is_default: true });
            await loadRoster();
            headingRef.current?.focus();
            toast.success(`${official.name} is now the signer.`);
        } catch (error) {
            reportError(error);
        } finally {
            setIsSaving(false);
        }
    };

    const retireOfficial = async () => {
        setIsSaving(true);
        try {
            await api.delete(`/signatory/${retiring.id}/`);
            setRetiring(null);
            await loadRoster();
            headingRef.current?.focus();
            toast.success('Official retired.');
        } catch (error) {
            reportError(error);
        } finally {
            setIsSaving(false);
        }
    };

    const active = roster.filter((official) => official.is_active);
    const retired = roster.filter((official) => !official.is_active);
    const disabled = isSaving || loadError;
    const renderOfficial = (official) => (
        <SignatoryOfficialRow key={official.id} signatory={official} disabled={disabled}
            onEdit={() => setEditor(official)} onUse={() => handleUseSigner(official)} onRetire={() => setRetiring(official)} />
    );

    return (
        <section className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200">
                <h2 className="text-base font-bold text-stone-800">Signatories</h2>
                <p className="mt-1 text-sm text-stone-600">Names printed on your permits, certificates, and reports.</p>
            </div>
            <div className="p-5 space-y-6">
                {loadError && <div role="alert" className="p-3 rounded-lg bg-red-50 text-sm text-red-800">Could not load signatories. <button type="button" disabled={isSaving} onClick={loadRoster} className="min-h-11 px-2 font-semibold underline focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-50">Retry</button></div>}
                {isLoading ? <div role="status" aria-label="Loading signatories"><Skeleton count={3} height={60} /></div> : !loadError && <SignatoryDocumentOverview roster={roster} />}
                <div>
                    <div className="flex items-center justify-between gap-3">
                        <h3 ref={headingRef} tabIndex={-1} className="text-sm font-bold text-stone-800 focus-visible:outline-2 focus-visible:outline-green-700">Officials</h3>
                        <button type="button" disabled={isLoading || disabled} onClick={() => setEditor(NEW_OFFICIAL)} aria-haspopup="dialog" className="min-h-11 px-3 rounded-lg bg-green-700 text-sm font-semibold text-white hover:bg-green-600 flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-50"><Plus size={16} aria-hidden="true" /> Add official</button>
                    </div>
                    <ul className="mt-2 divide-y divide-stone-200">{active.map(renderOfficial)}</ul>
                    {!isLoading && !loadError && active.length === 0 && <p className="py-4 text-sm text-stone-500">No officials yet. Add one to get started.</p>}
                    {retired.length > 0 && (
                        <div className="mt-2">
                            <button type="button" onClick={() => setShowRetired(!showRetired)} aria-expanded={showRetired} aria-controls="retired-signatories" className="min-h-11 text-sm text-stone-500 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-green-700">{showRetired ? 'Hide' : 'Show'} retired ({retired.length})</button>
                            {showRetired && <ul id="retired-signatories" className="divide-y divide-stone-200">{retired.map(renderOfficial)}</ul>}
                        </div>
                    )}
                </div>
            </div>
            {editor && <SignatoryEditorModal official={editor} busy={isSaving} disabled={loadError} onClose={() => setEditor(null)} onSave={saveOfficial} />}
            {retiring && (
                <SignatoryModal title="Retire official?" busy={isSaving} onClose={() => setRetiring(null)}>
                    <div className="p-5 space-y-3 text-sm text-stone-600">
                        <p>{retiring.name} will no longer be used on new documents.</p>
                        {retiring.is_default && documentsForPosition(retiring.position).length > 0 && <p className="text-amber-800">The municipal default will be used until you choose a replacement.</p>}
                    </div>
                    <div className="px-5 py-4 border-t border-stone-200 flex justify-end gap-2">
                        <button type="button" autoFocus disabled={isSaving} onClick={() => setRetiring(null)} className="min-h-11 px-4 rounded-lg text-sm font-semibold text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-50">Cancel</button>
                        <button type="button" disabled={disabled} onClick={retireOfficial} className="min-h-11 px-4 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-50">{isSaving ? 'Retiring…' : 'Retire'}</button>
                    </div>
                </SignatoryModal>
            )}
        </section>
    );
};

export default SignatoriesSection;
