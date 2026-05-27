from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.api.models import User, Notification

class NotificationFilterTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test_user',
            password='password123',
            role='farmer'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create unread notifications
        Notification.objects.create(
            recipient=self.user,
            type=Notification.Type.INFO,
            title='Unread 1',
            message='Unread message 1',
            is_read=False
        )
        Notification.objects.create(
            recipient=self.user,
            type=Notification.Type.INFO,
            title='Unread 2',
            message='Unread message 2',
            is_read=False
        )
        
        # Create read notifications
        Notification.objects.create(
            recipient=self.user,
            type=Notification.Type.INFO,
            title='Read 1',
            message='Read message 1',
            is_read=True
        )

    def test_filter_unread_notifications(self):
        """Test filtering unread notifications (reproduce missing server-side filter)"""
        url = reverse('notification-list')
        response = self.client.get(url, {'is_read': 'false'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # If filtering works, count should be 2. 
        # If it fails (current state), it returns all 3.
        results = response.data.get('results', [])
        # We check count instead of results length if pagination is used correctly
        # But for reproduction, we expect it to fail if it returns all 3.
        self.assertEqual(len(results), 2, "Should only return 2 unread notifications")
        for notif in results:
            self.assertFalse(notif['is_read'])

    def test_filter_read_notifications(self):
        """Test filtering read notifications"""
        url = reverse('notification-list')
        response = self.client.get(url, {'is_read': 'true'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', [])
        self.assertEqual(len(results), 1, "Should only return 1 read notification")
        for notif in results:
            self.assertTrue(notif['is_read'])
