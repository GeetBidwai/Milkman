from django.urls import path

from products.views import (
    ProductCSVUploadAPIView,
    ProductDetailAPIView,
    ProductListCreateAPIView,
)

urlpatterns = [
    path("products", ProductListCreateAPIView.as_view(), name="products"),
    path("products/upload-csv/", ProductCSVUploadAPIView.as_view(), name="products-upload-csv"),
    path("products/<int:product_id>", ProductDetailAPIView.as_view(), name="product-detail"),
]
