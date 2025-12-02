from django.db import models
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Client(models.Model):
    """Model representing a client who requests tasks"""
    CLIENT_TYPE_CHOICES = [
        ('New', 'New'),
        ('Existing', 'Existing'),
    ]
    
    id = models.CharField(max_length=50, primary_key=True, default=generate_uuid)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=CLIENT_TYPE_CHOICES)
    number = models.CharField(max_length=50, unique=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'clients'
        managed = True
        ordering = ['name']
    
    def __str__(self):
        return self.name
