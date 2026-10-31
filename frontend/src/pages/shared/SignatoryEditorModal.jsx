import { useId, useState } from 'react';
import { SIGNATORY_POSITIONS, documentsForPosition } from '../../lib/signatories';
import SignatoryModal from './SignatoryModal';

const inputClass = 'mt-1 w-full h-11 px-3 bg-white border border-stone-200 text-sm text-stone-900 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/20 rounded-lg disabled:bg-stone-50';

const SignatoryEditorModal = ({ official, busy, disabled, onClose, onSave }) => {
    const [draft, setDraft] = useState(official);
    const prefix = useId();
    const documents = documentsForPosition(draft.position);
    const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

    const handleSubmit = (event) => {
        event.preventDefault();
        onSave({
            name: draft.name.trim(),
            title: draft.title.trim(),
            position: draft.position,
            is_default: documents.length > 0 && draft.is_default,
        });
    };

    return (
        <SignatoryModal title={official.id ? 'Edit official' : 'Add official'} busy={busy} onClose={onClose}>
            <form onSubmit={handleSubmit}>
                <fieldset disabled={busy || disabled} className="p-5 space-y-4">
                    <div>
                        <label htmlFor={`${prefix}-name`} className="text-sm font-medium text-stone-700">Full name</label>
                        <input id={`${prefix}-name`} autoFocus required maxLength={100} value={draft.name} onChange={(event) => update('name', event.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor={`${prefix}-title`} className="text-sm font-medium text-stone-700">Title printed on documents</label>
                        <input id={`${prefix}-title`} required maxLength={100} placeholder="e.g. OIC, Municipal Agriculturist" value={draft.title} onChange={(event) => update('title', event.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor={`${prefix}-position`} className="text-sm font-medium text-stone-700">Document role</label>
                        <select id={`${prefix}-position`} value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value, is_default: documentsForPosition(event.target.value).length > 0 && draft.is_default })} className={inputClass}>
                            {SIGNATORY_POSITIONS.map((position) => <option key={position.value} value={position.value}>{position.label}</option>)}
                        </select>
                        <p className={`mt-2 text-xs leading-relaxed ${documents.length ? 'text-stone-500' : 'text-amber-800'}`}>
                            {documents.length ? documents.map((document) => document.label).join(' · ') : 'Not assigned automatically. For acting officials, choose their document role and put OIC in the printed title.'}
                        </p>
                    </div>
                    {documents.length > 0 && (
                        <div>
                            <label className="min-h-11 flex items-center gap-3 text-sm text-stone-700 cursor-pointer">
                                <input type="checkbox" checked={draft.is_default} onChange={(event) => update('is_default', event.target.checked)} className="checkbox checkbox-sm" />
                                Use as current signer
                            </label>
                            {draft.is_default && <p className="text-xs text-stone-500">Replaces the signer for this role.</p>}
                        </div>
                    )}
                    {official.is_default && (draft.position !== official.position || !draft.is_default) && <p className="text-xs text-amber-800">The previous role will use the municipal default until you choose another signer.</p>}
                </fieldset>
                <div className="px-5 py-4 border-t border-stone-200 flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className="min-h-11 px-4 rounded-lg text-sm font-semibold text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={busy || disabled || !draft.name.trim() || !draft.title.trim()} className="min-h-11 px-4 rounded-lg bg-green-700 text-sm font-semibold text-white hover:bg-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
                </div>
            </form>
        </SignatoryModal>
    );
};

export default SignatoryEditorModal;
