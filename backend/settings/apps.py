from django.apps import AppConfig


class SettingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "settings"
    label = "app_settings"  # Unique label to avoid conflicts with backend.settings module
