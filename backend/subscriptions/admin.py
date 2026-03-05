from django.contrib import admin

from subscriptions.models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "product",
        "quantity",
        "delivery_frequency",
        "status",
        "start_date",
    )
    list_filter = ("status", "delivery_frequency")
    search_fields = ("customer__username", "product__name")
