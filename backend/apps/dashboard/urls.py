from django.urls import path
from . import views


urlpatterns = [
    path('agri-metrics/', views.AgriDashboardView.as_view()),
    path('farmer-metrics/', views.FarmerDashboardView.as_view()),
    path('opv-metrics/', views.OPVDashboardView.as_view()),
    path('inspector-metrics/', views.InspectorDashboardView.as_view()),
]
