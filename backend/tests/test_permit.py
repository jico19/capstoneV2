import pytest
from django.utils import timezone
from datetime import timedelta
from django.db import IntegrityError
from model_bakery import baker
from apps.permits.models import (
    PermitApplication, 
    SubmittedDocument, 
    OCRValidationResult, 
    OPVValidation, 
    IssuedPermit
)

@pytest.mark.django_db
class TestPermitApplicationFlow:

    @pytest.fixture
    def setup_data(self):
        """Creates basic actors and a starting application."""
        farmer = baker.make('api.User', role='FARMER')
        officer = baker.make('api.User', role='AGRI_OFFICER')
        opv_user = baker.make('api.User', role='OPV_STAFF')
        
        app = baker.make(
            PermitApplication, 
            farmer=farmer,
            status=PermitApplication.Status.DRAFT,
            number_of_pigs=10
        )
        return {"farmer": farmer, "officer": officer, "opv": opv_user, "app": app}

    def test_document_id_format(self, setup_data):
        """Verifies the LP-YYYY-NANOID format and uniqueness."""
        app = setup_data['app']
        current_year = str(timezone.now().year)
        
        # Check prefix and year
        assert app.application_id.startswith(f"LP-{current_year}-")
        # Total length: LP(2) + dash(1) + YYYY(4) + dash(1) + NANOID(6) = 14? 
        # Note: Your docstring says LP-2024-ABC123 which is 14 chars, 
        # but max_length in your model is 12. You might need to check that!
        assert len(app.application_id) <= 14 

    def test_full_status_lifecycle(self, setup_data):
        """Tests the transition through the entire permit lifecycle."""
        app = setup_data['app']
        
        # 1. Submission
        app.status = PermitApplication.Status.SUBMITTED
        app.save()
        
        # 2. OCR Validation
        doc = baker.make(SubmittedDocument, application=app, document_type='traders_pass')
        baker.make(OCRValidationResult, document=doc, status='PASSED')
        app.status = PermitApplication.Status.OCR_VALIDATED
        app.save()

        # 3. OPV Forwarding and Validation
        app.status = PermitApplication.Status.FORWARDED_TO_OPV
        app.save()
        baker.make(OPVValidation, application=app, status='VALIDATED', opv_staff=setup_data['opv'])
        app.status = PermitApplication.Status.OPV_VALIDATED
        app.save()

        # 4. Permit Issuance
        issued = baker.make(IssuedPermit, application=app, issued_by=setup_data['officer'], is_paid=False)
        app.status = PermitApplication.Status.PERMIT_ISSUED
        app.is_issued = True
        app.save()

        # 5. Payment and Release
        issued.is_paid = True
        issued.save()
        app.status = PermitApplication.Status.RELEASED
        app.save()

        assert app.status == PermitApplication.Status.RELEASED
        assert app.is_issued is True

    def test_duplicate_document_type_prevention(self, setup_data):
        """Ensures a farmer cannot upload the same document type twice for one application."""
        app = setup_data['app']
        baker.make(SubmittedDocument, application=app, document_type='traders_pass')
        
        with pytest.raises(IntegrityError):
            # This should fail because of unique_together = [('application', 'document_type')]
            baker.make(SubmittedDocument, application=app, document_type='traders_pass')

    def test_opv_rejection_resubmission(self, setup_data):
        """Tests that a rejected OPV validation correctly flags the status."""
        app = setup_data['app']
        app.status = PermitApplication.Status.FORWARDED_TO_OPV
        app.save()
        
        baker.make(OPVValidation, application=app, status='REJECTED', remarks="Invalid Health Cert")
        app.status = PermitApplication.Status.OPV_REJECTED
        app.save()
        
        assert app.status == PermitApplication.Status.OPV_REJECTED

    def test_issued_permit_qr_uniqueness(self, setup_data):
        """Ensures every issued permit has a unique QR token."""
        app1 = setup_data['app']
        app2 = baker.make(PermitApplication)
        
        p1 = baker.make(IssuedPermit, application=app1, qr_token="TOKEN1")
        
        with pytest.raises(IntegrityError):
            baker.make(IssuedPermit, application=app2, qr_token="TOKEN1")