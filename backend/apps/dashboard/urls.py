from django.urls import path
from . import views


urlpatterns = [
    path('agri-metrics/', views.AgriDashboardView.as_view())
]
