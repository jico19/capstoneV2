import { documentsForPosition } from '../../lib/signatories';

const buttonClass = 'min-h-11 px-3 rounded-lg text-sm font-semibold focus-visible:outline-2 focus-visible:outline-green-700 disabled:opacity-50';

const SignatoryOfficialRow = ({ signatory, disabled, onEdit, onUse, onRetire }) => {
    const isCurrent = signatory.is_default && documentsForPosition(signatory.position).length > 0;

    return (
        <li className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 break-words">
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-stone-800">{signatory.name}</h4>
                    {!signatory.is_active ? (
                        <span className="text-xs text-stone-500">Retired</span>
                    ) : isCurrent && (
                        <span className="px-2 py-1 rounded-md bg-green-50 text-green-800 text-xs font-semibold">Current signer</span>
                    )}
                </div>
                <p className="mt-1 text-sm text-stone-600">{signatory.title}</p>
            </div>
            {signatory.is_active && (
                <div className="flex flex-wrap gap-1 shrink-0">
                    {!isCurrent && documentsForPosition(signatory.position).length > 0 && (
                        <button type="button" disabled={disabled} onClick={onUse} className={`${buttonClass} text-green-800 bg-green-50 hover:bg-green-100`}>Use signer</button>
                    )}
                    <button type="button" disabled={disabled} onClick={onEdit} aria-haspopup="dialog" className={`${buttonClass} text-stone-700 hover:bg-stone-100`}>Edit</button>
                    <button type="button" disabled={disabled} onClick={onRetire} aria-haspopup="dialog" className={`${buttonClass} text-stone-600 hover:bg-stone-100`}>Retire</button>
                </div>
            )}
        </li>
    );
};

export default SignatoryOfficialRow;
