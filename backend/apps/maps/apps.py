from django.apps import AppConfig


class MapsConfig(AppConfig):
    name = 'apps.maps'

    def ready(self):
        from . import signals  # noqa: F401
