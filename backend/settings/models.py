from django.db import models


class Setting(models.Model):
    """Model representing system settings"""
    id = models.AutoField(primary_key=True)
    key_name = models.CharField(max_length=100, unique=True)
    value = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'settings'
        managed = True
    
    def __str__(self):
        return self.key_name


class UnifiedSettings(models.Model):
    """Singleton model for unified settings"""
    id = models.IntegerField(primary_key=True, default=1)
    whatsapp_numbers = models.JSONField(default=list)
    notifications_enabled = models.BooleanField(default=False)
    notification_templates = models.JSONField(default=dict, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'unified_settings'
        managed = True
    
    def __str__(self):
        return f"UnifiedSettings (ID: {self.id})"
    
    def save(self, *args, **kwargs):
        """Override save to ensure singleton pattern"""
        self.id = 1
        super().save(*args, **kwargs)
