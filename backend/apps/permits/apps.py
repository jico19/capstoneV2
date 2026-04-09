from django.apps import AppConfig


class PermitsConfig(AppConfig):
    name = 'apps.permits'


    def ready(self):
        import apps.permits.signals