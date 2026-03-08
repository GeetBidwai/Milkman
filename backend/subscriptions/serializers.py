from datetime import date

from rest_framework import serializers

from subscriptions.models import Subscription, SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = (
            "id",
            "product",
            "product_name",
            "name",
            "frequency",
            "price",
            "discount_percent",
            "is_active",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        product = attrs.get("product", getattr(instance, "product", None))
        if product and (not product.is_active or not product.category.is_active):
            raise serializers.ValidationError(
                "You can create plans only for active products in active categories."
            )

        discount_percent = attrs.get(
            "discount_percent", getattr(instance, "discount_percent", 0)
        )
        if discount_percent < 0 or discount_percent > 100:
            raise serializers.ValidationError(
                {"discount_percent": "Discount percent must be between 0 and 100."}
            )
        return attrs


class SubscriptionSerializer(serializers.ModelSerializer):
    user = serializers.IntegerField(source="customer_id", read_only=True)
    customer_username = serializers.CharField(source="customer.username", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    plan_frequency = serializers.CharField(source="plan.frequency", read_only=True)
    plan_price = serializers.DecimalField(
        source="plan.price", max_digits=10, decimal_places=2, read_only=True
    )
    plan_discount_percent = serializers.IntegerField(
        source="plan.discount_percent", read_only=True
    )
    frequency = serializers.ChoiceField(
        source="delivery_frequency",
        choices=Subscription.DeliveryFrequency.choices,
        required=False,
    )
    is_active = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = (
            "id",
            "user",
            "customer",
            "customer_username",
            "product",
            "product_name",
            "plan",
            "plan_name",
            "plan_frequency",
            "plan_price",
            "plan_discount_percent",
            "quantity",
            "delivery_frequency",
            "frequency",
            "start_date",
            "end_date",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "customer", "created_at", "updated_at")
        extra_kwargs = {
            "product": {"required": False},
            "plan": {"required": False},
            "quantity": {"required": False},
            "delivery_frequency": {"required": False},
            "start_date": {"required": False},
        }

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        start_date = attrs.get("start_date", getattr(instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(instance, "end_date", None))
        product = attrs.get("product", getattr(instance, "product", None))
        plan = attrs.get("plan", getattr(instance, "plan", None))

        if start_date and not instance and start_date < date.today():
            raise serializers.ValidationError(
                "Start date cannot be in the past for a new subscription."
            )

        if not instance and not start_date:
            attrs["start_date"] = date.today()
            start_date = attrs["start_date"]

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError("End date cannot be before start date.")

        if plan and not plan.is_active:
            raise serializers.ValidationError("You can subscribe only to active plans.")

        if plan:
            product = plan.product
            attrs["product"] = product
            attrs["delivery_frequency"] = plan.frequency
        elif not product:
            raise serializers.ValidationError("Select a product or subscription plan.")

        if product and (not product.is_active or not product.category.is_active):
            raise serializers.ValidationError(
                "You can subscribe only to active products in active categories."
            )
        return attrs

    def get_is_active(self, obj):
        return obj.status == Subscription.Status.ACTIVE
