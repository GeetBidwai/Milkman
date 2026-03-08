from django.db import models
from django.conf import settings

from products.models import Product


class SubscriptionPlan(models.Model):
    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="subscription_plans",
    )
    name = models.CharField(max_length=150)
    frequency = models.CharField(
        max_length=10,
        choices=Frequency.choices,
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["product__name", "name"]

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class Subscription(models.Model):
    class DeliveryFrequency(models.TextChoices):
        DAILY = "daily", "Daily"
        ALTERNATE_DAYS = "alternate_days", "Alternate Days"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"

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
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        blank=True,
        null=True,
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
