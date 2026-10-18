"""
Signatory resolution for MAO-issued documents.

A single application produces three signed documents (AIC, MAO Certificate,
Transport Permit). Each is normally signed by a different position, so the
signatory is resolved per document type.

The roster under Settings > Signatories is the source of truth: the officer
marked as default for a position signs every future document for that
position's document type. Changing the default there changes every PDF
generated after the change.

Resolution precedence when rendering a document:

1. the signatory pinned on this application (historical documents issued
   before signatories became settings-only — kept so re-rendered documents
   stay consistent with what was actually issued)
2. the roster default for the position that normally signs that document
3. the global ``MunicipalConfig`` value (historical / pre-roster records)
4. a hardcoded literal (only reachable if no configuration exists at all)
"""

from .. import models

DocumentType = models.ApplicationSignatory.DocumentType
Position = models.Signatory.Position

# Which roster position normally signs each document.
DOCUMENT_DEFAULT_POSITION = {
    DocumentType.AIC: Position.MUNICIPAL_VETERINARIAN,
    DocumentType.MAO_CERTIFICATE: Position.MUNICIPAL_AGRICULTURIST,
    DocumentType.PERMIT: Position.MUNICIPAL_AGRICULTURIST,
}

FALLBACK_NAME = "AMALITA C. AMORES"
FALLBACK_TITLE = "OIC - Municipal Agriculturist"


def _global_fallback():
    config = models.MunicipalConfig.objects.first()
    name = (config.oic_name if config else "") or FALLBACK_NAME
    title = (config.oic_title if config else "") or FALLBACK_TITLE
    return name, title


def default_signatory(document_type):
    """The roster default for the position that normally signs this document."""
    position = DOCUMENT_DEFAULT_POSITION.get(document_type)
    if not position:
        return None
    return models.Signatory.objects.filter(
        position=position, is_default=True, is_active=True
    ).first()


def resolve_signatory(application, document_type):
    """Return the ``(name, title)`` pair to stamp on a generated document."""
    assignment = (
        models.ApplicationSignatory.objects
        .filter(application=application, document_type=document_type)
        .select_related("signatory")
        .first()
    )
    if assignment and assignment.signatory:
        return assignment.signatory.name, assignment.signatory.title

    signatory = default_signatory(document_type)
    if signatory:
        return signatory.name, signatory.title

    return _global_fallback()
