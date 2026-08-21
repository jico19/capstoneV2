import pytest
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta
from apps.permits.models import PermitApplication, TransportOrigin, OPVValidation
from apps.api.models import User
from apps.maps.models import Barangay, HogSurvey
from apps.dashboard.models import CachedInsight
from apps.dashboard.insights_engine import (
    RoleMetricExtractor,
    FallbackInsightsBuilder,
    get_or_generate_insight,
)

@pytest.mark.django_db
class TestOPVIntelligence:
    def test_opv_dashboard_returns_unified_data(self):
        client = APIClient()
        user = User.objects.create_user(username='opv_user', role='Opv', password='password', phone_no='09999999999')
        client.force_authenticate(user=user)
        
        # Setup data: 1 validated application with 10 pigs from 'Barangay A' to 'Manila'
        farmer = User.objects.create_user(username='farmer', role='Farmer', phone_no='09888888888')
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

        response = client.get('/dashboard/opv-metrics/')
        assert response.status_code == 200
        data = response.data
        
        # Check Workload KPIs
        assert 'waiting_for_opv' in data['kpis']
        
        # Check Tactical KPIs
        assert data['kpis']['total_volume'] == 10
        assert data['kpis']['pass_rate'] == 100.0
        
        # Check Tactical Charts
        assert data['charts']['top_barangays'][0]['name'] == 'Barangay A'
        assert data['charts']['top_barangays'][0]['count'] == 10
        assert data['charts']['top_destinations'][0]['name'] == 'Manila'


@pytest.mark.django_db
class TestDashboardSmartInsights:
    def test_fallback_insights_builder_structure(self):
        # Test all 5 roles generate complete structured cards
        for role in ['Agri', 'Farmer', 'Barangay', 'OPV', 'Inspector']:
            metrics = {
                'current_metrics': {'submissions': 10, 'revenue_php': 5000, 'total_registered_pigs': 250, 'my_total_scans': 15, 'validations_processed': 20, 'pass_rate_pct': 90},
                'prior_metrics': {'submissions': 8, 'revenue_php': 4000, 'total_registered_pigs': 240, 'my_total_scans': 10, 'validations_processed': 18, 'pass_rate_pct': 85},
                'status_summary': {'active_ready_to_use_permits': 2},
                'backlog_and_queue': {'pending_agri_review': 3},
                'pending_validation_queue': 4,
            }
            res = FallbackInsightsBuilder.build(role, metrics)
            assert 'summary' in res
            assert len(res['summary']) > 0
            assert 'trends' in res
            assert isinstance(res['trends'], list)
            assert len(res['trends']) > 0
            assert 'severity' in res['trends'][0]
            assert 'actions' in res
            assert isinstance(res['actions'], list)
            assert len(res['actions']) > 0

    def test_insights_api_and_caching(self):
        client = APIClient()
        b = Barangay.objects.create(name='Sampaloc 2')
        agri_user = User.objects.create_user(username='agri_admin', role='Agri', password='password', phone_no='09111111111', barangay=b)
        client.force_authenticate(user=agri_user)

        # 1. GET insights (initial creation)
        res1 = client.get('/dashboard/insights/')
        assert res1.status_code == 200
        data1 = res1.data
        assert data1['role'] == 'Agri'
        assert 'summary' in data1
        assert 'trends' in data1
        assert 'actions' in data1
        assert CachedInsight.objects.count() == 1

        # 2. GET insights again (should return cached)
        res2 = client.get('/dashboard/insights/')
        assert res2.status_code == 200
        assert res2.data['id'] == data1['id']
        assert CachedInsight.objects.count() == 1

        # 3. POST refresh (bypasses cache)
        res3 = client.post('/dashboard/insights/refresh/')
        assert res3.status_code == 200
        assert CachedInsight.objects.count() == 1  # updated existing record
