import pytest
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta
from apps.permits.models import PermitApplication, TransportOrigin, OPVValidation
from apps.api.models import User
from apps.maps.models import Barangay

@pytest.mark.django_db
class TestOPVAnalytics:
    def test_opv_analytics_returns_correct_data(self):
        client = APIClient()
        user = User.objects.create_user(username='opv_user', role='Opv', password='password')
        client.force_authenticate(user=user)
        
        # Setup data: 1 validated application with 10 pigs from "Barangay A" to "Manila"
        farmer = User.objects.create_user(username='farmer', role='Farmer')
        b1 = Barangay.objects.create(name='Barangay A')
        app = PermitApplication.objects.create(
            farmer=farmer, 
            status=PermitApplication.Status.OPV_VALIDATED,
            destination='Manila',
            transport_date=timezone.now().date()
        )
        TransportOrigin.objects.create(application=app, barangay=b1, number_of_pigs=10)
        
        # Create validation record
        OPVValidation.objects.create(
            application=app, 
            opv_staff=user, 
            status=OPVValidation.Status.VALIDATED,
            validated_at=timezone.now()
        )

        response = client.get('/dashboard/opv-analytics/')
        assert response.status_code == 200
        data = response.data
        assert data['kpis']['total_volume'] == 10
        assert data['charts']['top_barangays'][0]['name'] == 'Barangay A'
        assert data['charts']['top_barangays'][0]['count'] == 10
        assert data['charts']['top_destinations'][0]['name'] == 'Manila'
