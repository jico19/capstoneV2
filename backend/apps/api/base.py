from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated


class BaseModelViewSet(viewsets.ModelViewSet):
    """
    Project-wide base ViewSet.
    
    Provides:
    - `permission_classes = [IsAuthenticated]` as the default (override per-ViewSet as needed)
    
    All project ViewSets should inherit from this instead of viewsets.ModelViewSet directly.
    """
    permission_classes = [IsAuthenticated]
