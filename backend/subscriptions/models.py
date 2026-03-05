from django.db import models
from django.conf import settings

from products.models import Product


class Subscription(models.Model):
    class DeliveryFrequency(models.TextChoices):
        DAILY = "daily", "Daily"
        ALTERNATE_DAYS = "alternate_days", "Alternate Days"
        WEEKLY = "weekly", "Weekly"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        CANCELED = "canceled", "Canceled"

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    quantity = models.PositiveIntegerField(default=1)
    delivery_frequency = models.CharField(
        max_length=20,
        choices=DeliveryFrequency.choices,
        default=DeliveryFrequency.DAILY,
    )
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.customer.username} - {self.product.name}"
