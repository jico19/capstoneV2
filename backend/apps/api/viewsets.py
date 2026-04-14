from rest_framework import viewsets, status
from . import serializers
from . import models
from rest_framework.decorators import action    
from rest_framework.response import Response


class UserViewSets(viewsets.ModelViewSet):
    queryset = models.User.objects.all()


    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return serializers.UserListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return serializers.UserWriteSeiralizer
        else:
            return serializers.UserListSerializer
        

class NotificationViewSets(viewsets.ModelViewSet):
    serializer_class = serializers.NotificationSerializer 
    queryset = models.Notification.objects.all()
    
    def get_queryset(self):
        user = self.request.user

        if user.role == 'Farmer':
            return models.Notification.objects.filter(
                recipient=user, is_read=False
            )
        else:
            return models.Notification.objects.all()
        
    @action(detail=False, methods=['get'])
    def mark_all_read(self, request):

        data = models.Notification.objects.filter(
            recipient = request.user
        ).update(is_read=True)

        return Response('ok!!', status=status.HTTP_200_OK)