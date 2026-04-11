from rest_framework import viewsets
from . import serializers
from . import models

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
            return models.Notification.objects.filter(recipient=user)
        else:
            return models.Notification.objects.all()