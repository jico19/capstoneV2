import os
import django
import sys
from datetime import timedelta
from django.utils import timezone
import uuid

# Setup Django
# Ensure we are in the backend directory or add it to path
current_dir = os.getcwd()
if os.path.basename(current_dir) != 'backend':
    backend_dir = os.path.join(current_dir, 'backend')
    if os.path.exists(backend_dir):
        sys.path.append(backend_dir)
        os.chdir(backend_dir)
    else:
        print("Error: Could not find backend directory. Please run from project root or backend dir.")
        sys.exit(1)
else:
    sys.path.append(current_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.api.models import User
from apps.maps.models import Barangay
from apps.permits.models import PermitApplication, IssuedPermit, TransportOrigin
from apps.documents.services import generate_permit_pdf

def run():
    print("Creating test data...")
    
    # Get or create farmer
    farmer, _ = User.objects.get_or_create(
        username="testfarmer",
        defaults={
            "first_name": "Juan",
            "last_name": "Dela Cruz",
            "email": "juan@example.com",
            "role": "farmer"
        }
    )
    
    # Get or create barangay
    barangay, _ = Barangay.objects.get_or_create(
        name="Sample Barangay"
    )
    
    # Create application
    application = PermitApplication.objects.create(
        farmer=farmer,
        destination="Lucena City",
        transport_date=timezone.now().date() + timedelta(days=1),
        purpose="FOR BREEDING"
    )
    
    # Add origin
    TransportOrigin.objects.create(
        application=application,
        barangay=barangay,
        number_of_pigs=10
    )
    
    # Create IssuedPermit
    permit_number = f"P-{timezone.now().year}-{uuid.uuid4().hex[:6].upper()}"
    issued_permit = IssuedPermit.objects.create(
        application=application,
        permit_number=permit_number,
        qr_token=str(uuid.uuid4()),
        issued_by=farmer # Just for testing
    )
    
    print(f"Generating PDF for application {application.id}...")
    # Call the underlying function directly
    result = generate_permit_pdf.func(application.id)
    print(result)
    
    # Refresh from DB
    application.refresh_from_db()
    if application.issued_permit.permit_pdf:
        print(f"SUCCESS: PDF saved at: {application.issued_permit.permit_pdf.path}")
    else:
        print("FAILED: PDF generation failed or file not saved.")

if __name__ == "__main__":
    run()
