import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def isolate_dashboard_cache():
    """Database rollback does not clear the process cache between API tests."""
    cache.clear()
    yield
    cache.clear()
