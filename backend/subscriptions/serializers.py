from datetime import date

from rest_framework import serializers

from subscriptions.models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source="customer.username", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id",
            "customer",
            "customer_username",
            "product",
            "product_name",
            "quantity",
            "delivery_frequency",
            "start_date",
            "end_date",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "customer", "created_at", "updated_at")

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        start_date = attrs.get("start_date", getattr(instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(instance, "end_date", None))
        product = attrs.get("product", getattr(instance, "product", None))

        if start_date and not instance and start_date < date.today():
            raise serializers.ValidationError(
                "Start date cannot be in the past for a new subscription."
            )

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError("End date cannot be before start date.")

        if product and (not product.is_active or not product.category.is_active):
            raise serializers.ValidationError(
                "You can subscribe only to active products in active categories."
            )
        return attrs
