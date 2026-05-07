import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from datetime import timedelta
from apps.api.models import User
from apps.maps.models import Barangay
from apps.permits import models

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user_{n}')
    password = factory.PostGenerationMethodCall('set_password', 'password123')
    role = 'Farmer' # Default role

    @factory.post_generation
    def set_roles(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            self.role = extracted
            self.save()

class FarmerFactory(UserFactory):
    role = 'Farmer'

class AgriFactory(UserFactory):
    role = 'Agri'

class OpvFactory(UserFactory):
    role = 'Opv'

class InspectorFactory(UserFactory):
    role = 'Inspector'

class BarangayFactory(DjangoModelFactory):
    class Meta:
        model = Barangay
    
    name = factory.Sequence(lambda n: f'Barangay {n}')

class PermitApplicationFactory(DjangoModelFactory):
    class Meta:
        model = models.PermitApplication

    farmer = factory.SubFactory(FarmerFactory)
    status = models.PermitApplication.Status.DRAFT
    destination = factory.Faker('city')
    transport_date = factory.LazyFunction(lambda: timezone.now().date() + timedelta(days=7))
    purpose = factory.Faker('sentence')

    @factory.post_generation
    def add_origins(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            for origin_data in extracted:
                TransportOriginFactory(application=self, **origin_data)
        else:
            # Create a default origin if none specified
            TransportOriginFactory(application=self)


class TransportOriginFactory(DjangoModelFactory):
    class Meta:
        model = models.TransportOrigin
    
    application = factory.SubFactory(PermitApplicationFactory)
    barangay = factory.SubFactory(BarangayFactory)
    number_of_pigs = factory.Faker('random_int', min=1, max=100)

class SubmittedDocumentFactory(DjangoModelFactory):
    class Meta:
        model = models.SubmittedDocument

    origin = factory.SubFactory(TransportOriginFactory)
    document_type = factory.Iterator([choice[0] for choice in models.SubmittedDocument.DocumentType.choices])
    # Placeholder for file field. In actual tests, you'd use SimpleUploadedFile.
    file = factory.django.FileField(filename='test.pdf', content_type='application/pdf')

class OPVValidationFactory(DjangoModelFactory):
    class Meta:
        model = models.OPVValidation
    
    application = factory.SubFactory(PermitApplicationFactory)
    opv_staff = factory.SubFactory(OpvFactory)
    status = models.OPVValidation.Status.PENDING
    remarks = factory.Faker('sentence')
    veterinary_health_certificate = factory.django.FileField(filename='vhc.pdf', content_type='application/pdf')
    transportation_pass = factory.django.FileField(filename='pass.pdf', content_type='application/pdf')

class IssuedPermitFactory(DjangoModelFactory):
    class Meta:
        model = models.IssuedPermit
    
    application = factory.SubFactory(PermitApplicationFactory)
    issued_by = factory.SubFactory(AgriFactory)
    permit_number = factory.Sequence(lambda n: f'PERMIT-{n}')
    qr_token = factory.Sequence(lambda n: f'QR-{n}')
    is_paid = False
    payment_method = models.IssuedPermit.PaymentMethodChoices.ONLINE
    valid_until = factory.LazyFunction(lambda: timezone.now().date() + timedelta(days=30))

class OCRValidationResultFactory(DjangoModelFactory):
    class Meta:
        model = models.OCRValidationResult

    document = factory.SubFactory(SubmittedDocumentFactory)
    status = models.OCRValidationResult.ValidationStatus.PASSED
    extracted_field = factory.Dict({'name': 'John Doe'})
    remarks = factory.Dict({'field_1': 'OK'})