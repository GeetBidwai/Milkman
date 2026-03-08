from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import HealthCheckAPIView
from products.views import CategoryDetailAPIView, CategoryListCreateAPIView
from subscriptions.views import SubscriptionDetailAPIView, SubscriptionListCreateAPIView
from users.views import CustomerListAPIView, LoginAPIView, ProfileAPIView, RegisterAPIView

urlpatterns = [
    path("health/", HealthCheckAPIView.as_view(), name="health-check"),
    path("token/refresh", TokenRefreshView.as_view(), name="token-refresh"),
    path("register", RegisterAPIView.as_view(), name="register"),
    path("login", LoginAPIView.as_view(), name="login"),
    path("profile", ProfileAPIView.as_view(), name="profile"),
    path("customers", CustomerListAPIView.as_view(), name="customers"),
    path("categories", CategoryListCreateAPIView.as_view(), name="categories"),
    path("categories/<int:category_id>", CategoryDetailAPIView.as_view(), name="category-detail"),
    path("", include("products.urls")),
    path("subscriptions", SubscriptionListCreateAPIView.as_view(), name="subscriptions"),
    path(
        "subscriptions/<int:subscription_id>",
        SubscriptionDetailAPIView.as_view(),
        name="subscription-detail",
    ),
]
