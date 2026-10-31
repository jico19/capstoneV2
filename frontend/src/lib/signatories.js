/**
 * Signatory vocabulary shared by the Settings > Signatories roster.
 *
 * `position` is the roster's own field; each document is normally signed by one
 * position. A position can cover more than one document, and `OIC` covers none —
 * an Officer-in-Charge only ever signs through a historical per-application pin.
 */

export const SIGNATORY_POSITIONS = [
    { value: 'MUNICIPAL_AGRICULTURIST', label: 'Municipal Agriculturist' },
    { value: 'MUNICIPAL_VETERINARIAN', label: 'Municipal Veterinarian' },
    { value: 'OIC', label: 'Officer-in-Charge' },
];

export const SIGNATORY_DOCUMENTS = [
    { id: 'AIC', label: 'Animal Inspection Certificate', position: 'MUNICIPAL_VETERINARIAN' },
    { id: 'MAO_CERTIFICATE', label: 'MAO Health & ASF-Free Certification', position: 'MUNICIPAL_AGRICULTURIST' },
    { id: 'PERMIT', label: 'Transport Permit', position: 'MUNICIPAL_AGRICULTURIST' },
    { id: 'REPORT_VERIFIED', label: 'Reports: Certified Correct', position: 'MUNICIPAL_VETERINARIAN' },
    { id: 'REPORT_APPROVED', label: 'Reports: Approved By', position: 'MUNICIPAL_AGRICULTURIST' },
];

/** Document types whose roster default comes from this position. */
export const documentsForPosition = (position) =>
    SIGNATORY_DOCUMENTS.filter((doc) => doc.position === position);
