import pytest
from django.core.cache import cache
from apps.api.models import User
from apps.dashboard.services import (
    get_agri_dashboard_data,
    get_opv_dashboard_data,
    get_farmer_dashboard_data,
    get_inspector_dashboard_data,
)
from apps.maps.services import HogSurveyService
from apps.api.cache_utils import invalidate_cache_keys


@pytest.mark.django_db
class TestQueryHeavyCaching:
    def setup_method(self):
        cache.clear()

    def teardown_method(self):
        cache.clear()

    def test_agri_dashboard_data_caches_response(self):
        key = "dashboard:agri_metrics"
        assert cache.get(key) is None

        data_first = get_agri_dashboard_data()
        assert cache.get(key) is not None
        assert cache.get(key) == data_first

        # Verify second call returns identical cached dictionary
        data_second = get_agri_dashboard_data()
        assert data_second == data_first

        # Invalidate
        invalidate_cache_keys(key)
        assert cache.get(key) is None

    def test_opv_dashboard_data_caches_response(self):
        key = "dashboard:opv_metrics"
        assert cache.get(key) is None

        data_first = get_opv_dashboard_data()
        assert cache.get(key) is not None
        assert cache.get(key) == data_first

    def test_farmer_dashboard_data_caches_per_user(self):
        farmer = User.objects.create_user(
            username="cache_farmer",
            role="Farmer",
            password="password",
            phone_no="09111111111"
        )
        key = f"dashboard:farmer_metrics:{farmer.id}"
        assert cache.get(key) is None

        data_first = get_farmer_dashboard_data(farmer)
        assert cache.get(key) is not None
        assert cache.get(key) == data_first

    def test_inspector_dashboard_data_caches_per_user(self):
        inspector = User.objects.create_user(
            username="cache_inspector",
            role="Inspector",
            password="password",
            phone_no="09222222222"
        )
        key = f"dashboard:inspector_metrics:{inspector.id}"
        assert cache.get(key) is None

        data_first = get_inspector_dashboard_data(inspector)
        assert cache.get(key) is not None
        assert cache.get(key) == data_first

    def test_maps_transport_volume_caches_response(self):
        key = "maps:transport_volume"
        assert cache.get(key) is None

        data_first = HogSurveyService.calculate_transport_volume()
        assert cache.get(key) is not None
        assert cache.get(key) == data_first

    def test_maps_survey_data_reads_fresh_census(self):
        from apps.maps.models import Barangay, HogSurvey
        barangay = Barangay.objects.create(name="Fresh census")
        first = HogSurveyService.get_aggregated_survey_data()
        assert first[0]["total_pigs"] is None
        HogSurvey.objects.create(barangay=barangay, farmer_name="Raiser", survey_date="2026-06-30",
                                 fattener=12, total_pigs=12)
        second = HogSurveyService.get_aggregated_survey_data()
        assert second[0]["total_pigs"] == 12
