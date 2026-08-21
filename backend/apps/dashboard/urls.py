from django.urls import path
from . import views


urlpatterns = [
    path('agri-metrics/', views.AgriDashboardView.as_view(), name='agri-metrics'),
    path('farmer-metrics/', views.FarmerDashboardView.as_view(), name='farmer-metrics'),
    path('opv-metrics/', views.OPVDashboardView.as_view(), name='opv-metrics'),
    path('opv-analytics/', views.OPVAnalyticsView.as_view(), name='opv-analytics'),
    path('inspector-metrics/', views.InspectorDashboardView.as_view(), name='inspector-metrics'),
    path('insights/', views.DashboardInsightsView.as_view(), name='dashboard-insights'),
    path('insights/refresh/', views.DashboardInsightsRefreshView.as_view(), name='dashboard-insights-refresh'),
]
