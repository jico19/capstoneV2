
import os
import django
import sys
import random
from django.utils import timezone

# Setup django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.permits.models import PermitApplication, OPVValidation
from apps.permits.services import create_reject_opv_validation
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

User = get_user_model()

def reproduce():
    # 1. Create a user
    random_id = random.randint(1000, 9999)
    user, _ = User.objects.get_or_create(
        username=f'test_opv_{random_id}', 
        defaults={'role': 'Opv', 'phone_no': f'0917{random_id}00'}
    )
    
    # 2. Create an application
    farmer, _ = User.objects.get_or_create(
        username=f'test_farmer_{random_id}', 
        defaults={'role': 'Farmer', 'phone_no': f'0918{random_id}00'}
    )
    app = PermitApplication.objects.create(
        farmer=farmer,
        destination='Manila',
        transport_date=timezone.now().date(),
        status=PermitApplication.Status.FORWARDED_TO_OPV
    )
    
    print(f"Created application LP string: {app.application_id}, DB ID: {app.id}")
    
    # 3. Try to reject
    try:
        create_reject_opv_validation(app.id, {'remarks': 'Rejected first time'}, user)
        print("First rejection successful")
    except ValidationError as e:
        print(f"First rejection failed: {e}")
        return

    # 4. Try to reject AGAIN
    try:
        print("Attempting second rejection...")
        create_reject_opv_validation(app.id, {'remarks': 'Rejected second time'}, user)
        print("Second rejection successful")
    except ValidationError as e:
        print(f"Second rejection failed: {e}")

if __name__ == "__main__":
    reproduce()
