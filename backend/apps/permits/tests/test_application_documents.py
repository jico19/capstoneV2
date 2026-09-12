import io
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image

from apps.api.models import FarmerDocument
from apps.maps.models import Barangay
from apps.permits.models import PermitApplication, TransportOrigin, SubmittedDocument, PermitApplicationDocument
from apps.permits.services.permit import create_permit

User = get_user_model()

COMMON_TYPES = ['traders_pass', 'handlers_license', 'transport_carrier_reg']


def make_image(name):
    buffer = io.BytesIO()
    Image.new('RGBA', size=(100, 100), color=(155, 0, 0)).save(buffer, 'png')
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type='image/png')


@pytest.fixture
def farmer_user(db):
    return User.objects.create_user(
        username='doc-farmer',
        password='password',
        role='Farmer',
        phone_no='09111111111',
        verification_status='VERIFIED',
    )


@pytest.fixture
def barangay(db):
    return Barangay.objects.create(name='Doc Barangay')


@pytest.mark.django_db
class TestPermitApplicationDocument:
    def _app_with_origin(self, farmer_user, barangay):
        application = PermitApplication.objects.create(
            farmer=farmer_user,
            status=PermitApplication.Status.DRAFT,
            destination='Lucena',
            transport_date=timezone.now().date(),
            purpose='Slaughter',
        )
        origin = TransportOrigin.objects.create(
            application=application,
            barangay=barangay,
            source_farmer_name='Mang Kanor',
            source_phone_no='09222222222',
            fattener=10,
        )
        return application, origin

    def _submission_files(self):
        return {
            'origin_0_cis': make_image('cis.png'),
            'origin_0_endorsement_cert': make_image('endorsement.png'),
            'traders_pass': make_image('traders_pass.png'),
            'handlers_license': make_image('handlers_license.png'),
            'transport_carrier_reg': make_image('transport_carrier_reg.png'),
        }

    def test_common_docs_dual_written_to_application(self, farmer_user, barangay):
        application, _ = self._app_with_origin(farmer_user, barangay)

        create_permit(self._submission_files(), application, farmer_user)

        app_docs = {
            doc.document_type: doc
            for doc in application.application_documents.all()
        }
        assert set(app_docs) == set(COMMON_TYPES)
        for doc in app_docs.values():
            assert doc.application_id == application.id
            assert doc.file

    def test_app_docs_survive_origins0_delete(self, farmer_user, barangay):
        application, origin = self._app_with_origin(farmer_user, barangay)
        create_permit(self._submission_files(), application, farmer_user)

        origin.delete()

        remaining = {
            doc.document_type
            for doc in application.application_documents.all()
        }
        assert remaining == set(COMMON_TYPES)

    def test_verified_farmer_docs_auto_attach_to_application(self, farmer_user, barangay):
        application, origin = self._app_with_origin(farmer_user, barangay)
        for doc_type in COMMON_TYPES:
            FarmerDocument.objects.create(
                user=farmer_user,
                document_type=doc_type,
                file=make_image(f'{doc_type}.png'),
                is_verified=True,
            )

        files = {
            'origin_0_cis': make_image('cis.png'),
            'origin_0_endorsement_cert': make_image('endorsement.png'),
        }
        create_permit(files, application, farmer_user)

        app_docs = {
            doc.document_type: doc
            for doc in application.application_documents.all()
        }
        assert set(app_docs) == set(COMMON_TYPES)
        assert SubmittedDocument.objects.filter(origin=origin).count() == 5

    def test_resubmit_overwrites_application_doc(self, farmer_user, barangay):
        application, origin = self._app_with_origin(farmer_user, barangay)
        create_permit(self._submission_files(), application, farmer_user)

        original = PermitApplicationDocument.objects.get(
            application=application, document_type='traders_pass'
        )

        origin.documents.all().delete()

        files = self._submission_files()
        files['traders_pass'] = make_image('traders_pass_v2.png')
        create_permit(files, application, farmer_user)

        app_docs = {
            doc.document_type: doc
            for doc in application.application_documents.all()
        }
        assert set(app_docs) == set(COMMON_TYPES)
        assert PermitApplicationDocument.objects.filter(
            application=application, document_type='traders_pass'
        ).count() == 1
        updated = PermitApplicationDocument.objects.get(
            application=application, document_type='traders_pass'
        )
        assert str(original.file) != str(updated.file)