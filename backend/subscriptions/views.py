from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.models import Subscription
from subscriptions.permissions import IsPlatformAdmin
from subscriptions.serializers import SubscriptionSerializer


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


class SubscriptionListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if IsPlatformAdmin().has_permission(request, self):
            queryset = Subscription.objects.select_related("customer", "product").all()
        else:
            queryset = Subscription.objects.select_related("customer", "product").filter(
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
            subscription = Subscription.objects.select_related("customer", "product").get(
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
