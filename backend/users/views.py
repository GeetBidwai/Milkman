from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import Profile
from users.serializers import (
    CustomerListSerializer,
    LoginSerializer,
    ProfileSerializer,
    RegisterSerializer,
)

User = get_user_model()


def is_platform_admin(user):
    return user.role == "admin" or user.is_staff or user.is_superuser


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
    ordering = request.query_params.get("ordering", "username")
    allowed = {"username", "-username", "date_joined", "-date_joined"}
    if ordering not in allowed:
        ordering = "username"
    return queryset.order_by(ordering)


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Registration successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )

        if not user:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )


class ProfileAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_profile(self, user):
        profile, _ = Profile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self.get_profile(request.user)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        profile = self.get_profile(request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class CustomerListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_platform_admin(request.user):
            return Response(
                {"detail": "Only admins can view customers."},
                status=status.HTTP_403_FORBIDDEN,
            )

        queryset = User.objects.filter(role=User.Role.CUSTOMER).select_related("profile")
        query = request.query_params.get("q")
        if query:
            queryset = queryset.filter(
                Q(username__icontains=query)
                | Q(email__icontains=query)
                | Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(profile__city__icontains=query)
                | Q(profile__phone__icontains=query)
            )
        queryset = apply_ordering(queryset, request)
        queryset = apply_pagination(queryset, request)
        serializer = CustomerListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
