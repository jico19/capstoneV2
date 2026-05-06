from django.apps import AppConfig


class SmsConfig(AppConfig):
    name = 'apps.sms'


    def ready(self):
        import apps.sms.signals