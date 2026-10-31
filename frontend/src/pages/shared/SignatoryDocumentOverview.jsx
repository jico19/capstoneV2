import { FileText } from 'lucide-react';
import { SIGNATORY_DOCUMENTS, SIGNATORY_POSITIONS } from '../../lib/signatories';

/** Shows saved roster defaults, never unsaved form values. */
const SignatoryDocumentOverview = ({ roster }) => (
    <section aria-labelledby="document-signers-heading" className="border border-stone-200 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200">
            <h3 id="document-signers-heading" className="text-sm font-bold text-stone-800">Document signers</h3>
            <p className="mt-1 text-xs text-stone-500">For new PDFs. Saved PDFs stay the same.</p>
        </div>
        <ul className="divide-y divide-stone-200">
            {SIGNATORY_DOCUMENTS.map((document) => {
                const signer = roster.find((person) => person.is_active && person.is_default && person.position === document.position);
                const position = SIGNATORY_POSITIONS.find((item) => item.value === document.position)?.label;

                return (
                    <li key={document.id} className="p-4 sm:px-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                            <FileText size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-stone-500" />
                            <div>
                                <p className="text-sm font-semibold text-stone-800">{document.label}</p>
                                <p className="mt-1 text-xs text-stone-500">{position}</p>
                            </div>
                        </div>
                        <div className="sm:max-w-xs sm:text-right pl-7 sm:pl-0 break-words">
                            <p className={`text-sm font-semibold ${signer ? 'text-green-800' : 'text-amber-800'}`}>
                                {signer ? signer.name : 'Municipal default'}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ul>
        <p className="p-4 sm:px-5 border-t border-stone-200 bg-stone-50 text-xs leading-relaxed text-stone-600">
            Report drafts use these defaults. Older permits may keep their assigned signer.
        </p>
    </section>
);

export default SignatoryDocumentOverview;
