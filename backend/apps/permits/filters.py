from django.db.models import Q
import django_filters
from .models import PermitApplication



class PermitApplicationFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')

    class Meta:
        model = PermitApplication
        fields = ['status', 'farmer']

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(application_id__icontains=value) |
            Q(destination__icontains=value) |
            Q(farmer__first_name__icontains=value) |
            Q(farmer__last_name__icontains=value) |
            Q(farmer__username__icontains=value)
        )
