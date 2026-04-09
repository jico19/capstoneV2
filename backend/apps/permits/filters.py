import django_filters
from .models import PermitApplication



class PermitApplicationFilter(django_filters.FilterSet):
    class Meta:
        model = PermitApplication
        fields = ['status', 'farmer']
