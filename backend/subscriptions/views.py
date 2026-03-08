from datetime import date

from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.models import Subscription, SubscriptionPlan
from subscriptions.permissions import IsPlatformAdmin
from subscriptions.serializers import SubscriptionPlanSerializer, SubscriptionSerializer


def apply_pagination(queryset, request):
    raw_limit = request.query_params.get("limit")
    raw_offset = request.query_params.get("offset")

    try:
        offset = int(raw_offset) if raw_offset is not None else 0
    except (TypeError, ValueError):
        offset = 0
    if offset < 0:
        offset = 0

    if not raw_limit:
        return queryset[offset:] if offset else queryset
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        return queryset[offset:] if offset else queryset
    if limit <= 0:
        return queryset[offset:] if offset else queryset
    limit = min(limit, 200)
    return queryset[offset : offset + limit]


def apply_ordering(queryset, request):
    ordering = request.query_params.get("ordering", "-created_at")
    allowed = {
        "created_at",
        "-created_at",
        "start_date",
        "-start_date",
        "status",
        "-status",
    }
    if ordering not in allowed:
        ordering = "-created_at"
    return queryset.order_by(ordering)


def apply_plan_ordering(queryset, request):
    ordering = request.query_params.get("ordering", "product__name")
    allowed = {
        "created_at",
        "-created_at",
        "name",
        "-name",
        "price",
        "-price",
        "frequency",
        "-frequency",
        "product__name",
        "-product__name",
    }
    if ordering not in allowed:
        ordering = "product__name"
    return queryset.order_by(ordering)


class SubscriptionPlanListAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        queryset = SubscriptionPlan.objects.select_related("product").filter(
            is_active=True,
            product__is_active=True,
            product__category__is_active=True,
        )

        product_id = request.query_params.get("product")
        query = request.query_params.get("q")

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query)
                | Q(product__name__icontains=query)
                | Q(frequency__icontains=query)
            )

        queryset = apply_plan_ordering(queryset, request)
        queryset = apply_pagination(queryset, request)
        serializer = SubscriptionPlanSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminSubscriptionPlanListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = SubscriptionPlan.objects.select_related("product").all()
        product_id = request.query_params.get("product")
        query = request.query_params.get("q")

        if product_id:
            queryset = queryset.filter(product_id=product_id)
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query) | Q(product__name__icontains=query)
            )

        queryset = apply_plan_ordering(queryset, request)
        queryset = apply_pagination(queryset, request)
        serializer = SubscriptionPlanSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = SubscriptionPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminSubscriptionPlanDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get_object(self, plan_id):
        try:
            return SubscriptionPlan.objects.select_related("product").get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return None

    def patch(self, request, plan_id):
        plan = self.get_object(plan_id)
        if not plan:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SubscriptionPlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, plan_id):
        plan = self.get_object(plan_id)
        if not plan:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        plan.is_active = False
        plan.save(update_fields=["is_active"])
        return Response({"message": "Plan deactivated."}, status=status.HTTP_200_OK)


class SubscriptionListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if IsPlatformAdmin().has_permission(request, self):
            queryset = Subscription.objects.select_related("customer", "product", "plan").all()
        else:
            queryset = Subscription.objects.select_related("customer", "product", "plan").filter(
                customer=request.user
            )

        status_filter = request.query_params.get("status")
        query = request.query_params.get("q")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if query:
            queryset = queryset.filter(
                Q(product__name__icontains=query) | Q(customer__username__icontains=query)
            )
        queryset = apply_ordering(queryset, request)
        queryset = apply_pagination(queryset, request)

        serializer = SubscriptionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if IsPlatformAdmin().has_permission(request, self):
            return Response(
                {"detail": "Admins cannot create subscriptions as customers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(customer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SubscriptionDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, request, subscription_id):
        try:
            subscription = Subscription.objects.select_related("customer", "product", "plan").get(
                id=subscription_id
            )
        except Subscription.DoesNotExist:
            return None

        if IsPlatformAdmin().has_permission(request, self):
            return subscription
        if subscription.customer_id == request.user.id:
            return subscription
        return None

    def get(self, request, subscription_id):
        subscription = self.get_object(request, subscription_id)
        if not subscription:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, subscription_id):
        subscription = self.get_object(request, subscription_id)
        if not subscription:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if IsPlatformAdmin().has_permission(request, self):
            serializer = SubscriptionSerializer(subscription, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        allowed_fields = {"quantity", "delivery_frequency", "end_date", "status"}
        invalid_fields = set(request.data.keys()) - allowed_fields
        if invalid_fields:
            return Response(
                {"detail": "Customers can update only quantity, delivery_frequency, end_date, and status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SubscriptionSerializer(subscription, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, subscription_id):
        subscription = self.get_object(request, subscription_id)
        if not subscription:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        updates = {"status": Subscription.Status.CANCELED}
        if not subscription.end_date:
            updates["end_date"] = date.today()

        for field, value in updates.items():
            setattr(subscription, field, value)
        subscription.save(update_fields=list(updates.keys()) + ["updated_at"])

        return Response(
            {"message": "Subscription canceled successfully."},
            status=status.HTTP_200_OK,
        )


class AdminSubscriptionListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get(self, request):
        queryset = Subscription.objects.select_related("customer", "product", "plan").all()

        status_filter = request.query_params.get("status")
        query = request.query_params.get("q")

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if query:
            queryset = queryset.filter(
                Q(product__name__icontains=query) | Q(customer__username__icontains=query)
            )
        queryset = apply_ordering(queryset, request)
        queryset = apply_pagination(queryset, request)

        serializer = SubscriptionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
