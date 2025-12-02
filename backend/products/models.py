from django.db import models
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Product(models.Model):
    """Model representing a product type for printing"""
    id = models.CharField(max_length=50, primary_key=True, default=generate_uuid)
    name = models.CharField(max_length=255)
    is_vip = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'products'
        managed = True
        ordering = ['name']
        # Unique constraint: name must be unique within each type (VIP or regular)
        constraints = [
            models.UniqueConstraint(fields=['name', 'is_vip'], name='unique_product_name_per_type')
        ]
    
    def __str__(self):
        return self.name
