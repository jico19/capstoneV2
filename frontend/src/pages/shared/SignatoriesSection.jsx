import Skeleton from 'react-loading-skeleton';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import {
    UserCog,
    Plus,
    Star,
    Archive,
    Save,
    Info,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { SIGNATORY_POSITIONS, documentsForPosition } from '../../lib/signatories';

const EMPTY_DRAFT = { name: '', title: '', position: 'MUNICIPAL_AGRICULTURIST', is_default: false };

const inputClass =
    'w-full h-10 px-3 bg-white border border-stone-200 text-xs font-semibold text-stone-900 focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700/20 rounded-lg';

const fieldLabel = 'text-[10px] font-black uppercase tracking-widest text-stone-500';

/**
 * Which document(s) this signatory is used for.
 *
 * Derived from the signatory's position, so it tracks the position select live
 * as it is edited. `OIC` maps to no document and says so rather than showing
 * nothing.
 */
const DocumentIndicator = ({ position }) => {
    const documents = documentsForPosition(position);

    if (documents.length === 0) {
        return (
            <span className="text-[10px] font-semibold text-stone-400 italic">
                Not auto-assigned — selected per application
            </span>
        );
    }

    return documents.map((doc) => (
        <span
            key={doc.id}
            className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-800 text-[10px] font-bold rounded"
        >
            {doc.label}
        </span>
    ));
};

const SignatoryRow = ({
    signatory,
    editedPosition,
    patch,
    isDirty,
    isSaving,
    onEdit,
    onSave,
    onMakeDefault,
    onRetire,
}) => {
    const isRetired = !signatory.is_active;

    return (
        <div
            className={`p-4 border rounded-lg ${
                isRetired ? 'border-stone-200 bg-stone-50 opacity-60' : 'border-stone-200 bg-white'
            }`}
        >
            <div className="grid gap-3 items-end grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_auto]">
                <div className="space-y-1">
                    <label className={fieldLabel}>Name</label>
                    <input
                        value={patch.name ?? signatory.name}
                        onChange={(e) => onEdit('name', e.target.value)}
                        disabled={isRetired || isSaving}
                        className={inputClass}
                    />
                </div>

                <div className="space-y-1">
                    <label className={fieldLabel}>Designation</label>
                    <input
                        value={patch.title ?? signatory.title}
                        onChange={(e) => onEdit('title', e.target.value)}
                        disabled={isRetired || isSaving}
                        className={inputClass}
                    />
                </div>

                <div className="space-y-1">
                    <label className={fieldLabel}>Position</label>
                    <select
                        value={patch.position ?? signatory.position}
                        onChange={(e) => onEdit('position', e.target.value)}
                        disabled={isRetired || isSaving}
                        className={inputClass}
                    >
                        {SIGNATORY_POSITIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:col-span-2 lg:col-span-1 lg:justify-end">
                    {signatory.is_default && !isRetired && (
                        <span className="px-2 py-1 bg-green-50 border border-green-200 text-green-800 text-[10px] font-black uppercase tracking-widest rounded">
                            Default
                        </span>
                    )}

                    {isDirty && (
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onSave}
                            className="h-10 px-3 bg-green-700 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <Save size={13} /> Save
                        </button>
                    )}

                    {!isRetired && !signatory.is_default && (
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onMakeDefault}
                            title="Pre-select this person for their position"
                            className="h-10 px-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <Star size={13} /> Default
                        </button>
                    )}

                    {!isRetired && (
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onRetire}
                            title="Retire — existing documents keep the signatory they were issued with"
                            className="h-10 px-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <Archive size={13} /> Retire
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className={fieldLabel}>Signs</span>
                <DocumentIndicator position={editedPosition} />
            </div>
        </div>
    );
};

/**
 * Signatory roster.
 *
 * Documents cannot be approved without a signatory, so this list must never be
 * empty. Entries are retired instead of deleted because issued documents
 * reference them.
 */
const SignatoriesSection = () => {
    const [roster, setRoster] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [edits, setEdits] = useState({});
    const [showRetired, setShowRetired] = useState(false);

    const loadRoster = async () => {
        try {
            const res = await api.get('/signatory/?limit=100');
            setRoster(res.data?.results ?? res.data ?? []);
        } catch {
            toast.error('Failed to load the signatory roster.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRoster();
    }, []);

    const reportError = (err, fallback) => {
        const detail = err.response?.data;
        const firstError = detail && typeof detail === 'object' ? Object.values(detail)[0] : null;
        toast.error(fallback, {
            description: Array.isArray(firstError) ? firstError[0] : firstError,
        });
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!draft.name.trim() || !draft.title.trim()) {
            toast.error('Both name and designation are required.');
            return;
        }

        setIsSaving(true);
        try {
            await api.post('/signatory/', {
                name: draft.name.trim(),
                title: draft.title.trim(),
                position: draft.position,
                is_active: true,
                is_default: draft.is_default,
            });
            setDraft(EMPTY_DRAFT);
            await loadRoster();
            toast.success('Signatory added.');
        } catch (err) {
            reportError(err, 'Failed to add signatory');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (id, field, value) => {
        setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [field]: value } }));
    };

    const clearEdit = (id) => {
        setEdits((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleSaveRow = async (signatory) => {
        const patch = edits[signatory.id];
        if (!patch) return;

        setIsSaving(true);
        try {
            await api.patch(`/signatory/${signatory.id}/`, patch);
            clearEdit(signatory.id);
            await loadRoster();
            toast.success('Signatory updated.');
        } catch (err) {
            reportError(err, 'Failed to update signatory');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMakeDefault = async (signatory) => {
        setIsSaving(true);
        try {
            await api.patch(`/signatory/${signatory.id}/`, { is_default: true });
            await loadRoster();
            toast.success(`${signatory.name} is now the default for this position.`);
        } catch (err) {
            reportError(err, 'Failed to set the default signatory');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRetire = async (signatory) => {
        setIsSaving(true);
        try {
            await api.delete(`/signatory/${signatory.id}/`);
            await loadRoster();
            toast.success('Signatory retired.', {
                description: 'Existing documents keep the name they were issued with.',
            });
        } catch (err) {
            reportError(err, 'Failed to retire signatory');
        } finally {
            setIsSaving(false);
        }
    };


    const active = roster.filter((s) => s.is_active);
    const retired = roster.filter((s) => !s.is_active);

    const renderRow = (signatory) => (
        <SignatoryRow
            key={signatory.id}
            signatory={signatory}
            editedPosition={edits[signatory.id]?.position ?? signatory.position}
            patch={edits[signatory.id] ?? {}}
            isDirty={Boolean(edits[signatory.id])}
            isSaving={isSaving}
            onEdit={(field, value) => handleEdit(signatory.id, field, value)}
            onSave={() => handleSaveRow(signatory)}
            onMakeDefault={() => handleMakeDefault(signatory)}
            onRetire={() => handleRetire(signatory)}
        />
    );

    return (
        <section className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center gap-3">
                <div className="p-1.5 bg-green-50 border border-green-200 rounded-lg">
                    <UserCog size={16} className="text-green-700" />
                </div>
                <div>
                    <h2 className="text-xs font-bold text-stone-800 uppercase tracking-wide">Signatories</h2>
                    <p className="text-xs text-stone-500 font-normal mt-0.5">
                        Officials who may sign issued documents. Each document is signed separately.
                    </p>
                </div>
            </div>

            <div className="px-6 py-5 space-y-5">
                {!isLoading && active.length === 0 ? (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
                        <Info size={15} className="text-red-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-800 font-semibold leading-relaxed">
                            No active signatories. Issued documents will fall back to the municipal default
                            signatory until at least one signatory is added for the Municipal Agriculturist
                            position.
                        </p>
                    </div>
                ) : (
                    <div className="flex items-start gap-3 bg-stone-50 border border-stone-200 px-4 py-3 rounded-lg">
                        <Info size={15} className="text-stone-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-stone-600 leading-relaxed">
                            Changes here save immediately, unlike the fee settings. The person marked as
                            default for a position signs every document generated after the change;
                            documents issued earlier keep the signatory they were issued with.
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    {isLoading ? <div role="status" aria-label="Loading signatories..." className="grid gap-3 items-end grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_auto]"><Skeleton height={40} /><Skeleton height={40} /><Skeleton height={40} /><Skeleton width={80} height={40} /></div> : active.map(renderRow)}
                </div>

                {retired.length > 0 && (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setShowRetired((value) => !value)}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-stone-500 hover:text-stone-800 cursor-pointer"
                        >
                            {showRetired ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            {showRetired ? 'Hide' : 'Show'} retired ({retired.length})
                        </button>
                        {showRetired && (
                            <div className="space-y-3">{retired.map(renderRow)}</div>
                        )}
                    </div>
                )}

                <form
                    onSubmit={handleAdd}
                    className="p-4 border border-dashed border-stone-300 rounded-lg space-y-3"
                >
                    <div className="grid gap-3 items-end grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_auto]">
                        <div className="space-y-1">
                            <label className={fieldLabel}>Name</label>
                            <input
                                value={draft.name}
                                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                placeholder="e.g. ENGR. JUAN D. DELA CRUZ"
                                className={inputClass}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className={fieldLabel}>Designation</label>
                            <input
                                value={draft.title}
                                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                placeholder="e.g. OIC - Municipal Agriculturist"
                                className={inputClass}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className={fieldLabel}>Position</label>
                            <select
                                value={draft.position}
                                onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                                className={inputClass}
                            >
                                {SIGNATORY_POSITIONS.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || isSaving}
                            className="h-10 px-4 bg-green-700 hover:bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <Plus size={13} /> Add
                        </button>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <span className={fieldLabel}>Signs</span>
                        <DocumentIndicator position={draft.position} />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-stone-600 font-medium cursor-pointer">
                        <input
                            type="checkbox"
                            checked={draft.is_default}
                            onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })}
                            className="checkbox checkbox-xs"
                        />
                        Pre-select this person for the position above when reviewing applications.
                    </label>
                </form>
            </div>
        </section>
    );
};

export default SignatoriesSection;
