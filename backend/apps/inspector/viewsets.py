from rest_framework import viewsets, status
from . import serializers
from . import models
from rest_framework.response import Response



class InspectorLogViewSets(viewsets.ModelViewSet):
    queryset = models.InspectorLogs.objects.all()
    serializer_class = serializers.InspectorLogsSerializer


    def create(self, request, *args, **kwargs):
        # print(request.data)
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(inspector=request.user)

            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(str(e))
            return Response("error", status=status.HTTP_400_BAD_REQUEST)