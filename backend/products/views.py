import csv
from decimal import Decimal, InvalidOperation
from io import TextIOWrapper

from django.conf import settings
from django.db import IntegrityError
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


class ProductCSVUploadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    @staticmethod
    def parse_bool(raw_value):
        return str(raw_value).strip().lower() in {"1", "true", "yes", "y"}

    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"detail": "CSV file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_count = 0
        reader = csv.DictReader(TextIOWrapper(uploaded_file.file, encoding="utf-8-sig"))

        for row in reader:
            category_name = (row.get("category") or "").strip()
            product_name = (row.get("name") or "").strip()
            if not category_name or not product_name:
                continue

            category = Category.objects.filter(name=category_name).first()
            if not category:
                continue

            try:
                price = Decimal(str(row.get("price") or "").strip())
                stock_quantity = int(str(row.get("stock_quantity") or "0").strip())
                if stock_quantity < 0:
                    continue
            except (InvalidOperation, TypeError, ValueError):
                continue

            image_name = (row.get("image") or "").strip()
            image_path = settings.MEDIA_ROOT / "products" / image_name if image_name else None
            image_value = f"products/{image_name}" if image_path and image_path.exists() else None

            try:
                Product.objects.create(
                    category=category,
                    name=product_name,
                    description=(row.get("description") or "").strip(),
                    price=price,
                    stock_quantity=stock_quantity,
                    image=image_value,
                    is_active=self.parse_bool(row.get("is_active", True)),
                )
            except IntegrityError:
                continue

            created_count += 1

        return Response(
            {
                "message": "Products uploaded successfully",
                "created_count": created_count,
            },
            status=status.HTTP_201_CREATED,
        )


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
