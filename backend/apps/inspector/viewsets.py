from rest_framework import viewsets, status
from . import serializers
from . import models
from rest_framework.response import Response



from rest_framework.permissions import IsAuthenticated

class InspectorLogViewSets(viewsets.ModelViewSet):
    queryset = models.InspectorLogs.objects.all()
    serializer_class = serializers.InspectorLogsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['Admin', 'Agri']:
            return models.InspectorLogs.objects.all()
        # Inspectors can only see their own logs
        return models.InspectorLogs.objects.filter(inspector=user)

    def create(self, request, *args, **kwargs):
        if request.user.role != 'Inspector':
            return Response({"error": "Only inspectors can log verification activity."}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(inspector=request.user)

            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(str(e))
            return Response("error", status=status.HTTP_400_BAD_REQUEST)