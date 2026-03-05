from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Category, Product
from products.permissions import IsPlatformAdmin
from products.serializers import CategorySerializer, ProductSerializer


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


def apply_ordering(queryset, request, allowed_fields, default_order):
    ordering = request.query_params.get("ordering", default_order)
    if ordering not in allowed_fields:
        ordering = default_order
    return queryset.order_by(ordering)


class CategoryListCreateAPIView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsPlatformAdmin()]
        return [permissions.AllowAny()]

    def get(self, request):
        queryset = Category.objects.filter(is_active=True)
        query = request.query_params.get("q")
        if query:
            queryset = queryset.filter(Q(name__icontains=query))
        queryset = apply_ordering(
            queryset, request, {"name", "-name", "created_at", "-created_at"}, "name"
        )
        queryset = apply_pagination(queryset, request)
        serializer = CategorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CategorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProductListCreateAPIView(APIView):
    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsPlatformAdmin()]
        return [permissions.AllowAny()]

    def get(self, request):
        queryset = (
            Product.objects.select_related("category")
            .filter(is_active=True, category__is_active=True)
        )
        category_id = request.query_params.get("category")
        query = request.query_params.get("q")
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if query:
            queryset = queryset.filter(
                Q(name__icontains=query)
                | Q(description__icontains=query)
                | Q(category__name__icontains=query)
            )
        queryset = apply_ordering(
            queryset,
            request,
            {"name", "-name", "price", "-price", "created_at", "-created_at"},
            "name",
        )
        queryset = apply_pagination(queryset, request)
        serializer = ProductSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ProductSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CategoryDetailAPIView(APIView):
    def get_permissions(self):
        if self.request.method in ("PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsPlatformAdmin()]
        return [permissions.AllowAny()]

    def get_object(self, category_id):
        try:
            return Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return None

    def get(self, request, category_id):
        category = self.get_object(category_id)
        if not category:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if not category.is_active and not (
            request.user.is_authenticated
            and IsPlatformAdmin().has_permission(request, self)
        ):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, category_id):
        category = self.get_object(category_id)
        if not category:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = CategorySerializer(category, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, category_id):
        category = self.get_object(category_id)
        if not category:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        category.is_active = False
        category.save(update_fields=["is_active"])
        category.products.update(is_active=False)
        return Response({"message": "Category deactivated."}, status=status.HTTP_200_OK)


class ProductDetailAPIView(APIView):
    def get_permissions(self):
        if self.request.method in ("PATCH", "DELETE"):
            return [permissions.IsAuthenticated(), IsPlatformAdmin()]
        return [permissions.AllowAny()]

    def get_object(self, product_id):
        try:
            return Product.objects.select_related("category").get(id=product_id)
        except Product.DoesNotExist:
            return None

    def get(self, request, product_id):
        product = self.get_object(product_id)
        if not product:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        is_admin = request.user.is_authenticated and IsPlatformAdmin().has_permission(
            request, self
        )
        if (not product.is_active or not product.category.is_active) and not is_admin:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductSerializer(product, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, product_id):
        product = self.get_object(product_id)
        if not product:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProductSerializer(product, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, product_id):
        product = self.get_object(product_id)
        if not product:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        product.is_active = False
        product.save(update_fields=["is_active"])
        return Response({"message": "Product deactivated."}, status=status.HTTP_200_OK)
