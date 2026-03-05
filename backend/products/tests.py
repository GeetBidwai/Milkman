from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product

User = get_user_model()


class ProductAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin1",
            password="securepass123",
            role=User.Role.ADMIN,
        )
        self.customer_user = User.objects.create_user(
            username="customer1",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )

    def test_public_can_list_categories_and_products(self):
        category = Category.objects.create(name="Milk", description="Fresh milk")
        Product.objects.create(
            category=category,
            name="Cow Milk 1L",
            price="60.00",
            stock_quantity=20,
        )

        categories_response = self.client.get("/api/categories")
        products_response = self.client.get("/api/products")

        self.assertEqual(categories_response.status_code, status.HTTP_200_OK)
        self.assertEqual(products_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(categories_response.data), 1)
        self.assertEqual(len(products_response.data), 1)

    def test_customer_cannot_create_category_or_product(self):
        self.client.force_authenticate(user=self.customer_user)

        category_response = self.client.post(
            "/api/categories",
            {"name": "Curd"},
            format="json",
        )

        self.assertEqual(category_response.status_code, status.HTTP_403_FORBIDDEN)

        category = Category.objects.create(name="Paneer")
        product_response = self.client.post(
            "/api/products",
            {
                "category": category.id,
                "name": "Paneer 200g",
                "price": "90.00",
                "stock_quantity": 10,
            },
            format="json",
        )
        self.assertEqual(product_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_category_or_product(self):
        category_response = self.client.post(
            "/api/categories",
            {"name": "Butter"},
            format="json",
        )
        self.assertEqual(category_response.status_code, status.HTTP_401_UNAUTHORIZED)

        category = Category.objects.create(name="Cheese")
        product_response = self.client.post(
            "/api/products",
            {
                "category": category.id,
                "name": "Cheese Block 200g",
                "price": "120.00",
                "stock_quantity": 8,
            },
            format="json",
        )
        self.assertEqual(product_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_create_category_and_product(self):
        self.client.force_authenticate(user=self.admin_user)

        category_response = self.client.post(
            "/api/categories",
            {"name": "Ghee", "description": "Organic ghee"},
            format="json",
        )
        self.assertEqual(category_response.status_code, status.HTTP_201_CREATED)

        product_response = self.client.post(
            "/api/products",
            {
                "category": category_response.data["id"],
                "name": "Desi Ghee 500ml",
                "price": "450.00",
                "stock_quantity": 5,
                "description": "A2 organic ghee",
            },
            format="json",
        )
        self.assertEqual(product_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 1)

    def test_product_list_supports_query_and_category_filters(self):
        milk = Category.objects.create(name="Milk")
        ghee = Category.objects.create(name="Ghee")
        Product.objects.create(
            category=milk,
            name="Cow Milk",
            price="60.00",
            stock_quantity=10,
        )
        Product.objects.create(
            category=ghee,
            name="A2 Ghee",
            price="500.00",
            stock_quantity=5,
        )

        query_response = self.client.get("/api/products?q=ghee")
        category_response = self.client.get(f"/api/products?category={milk.id}")

        self.assertEqual(query_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(query_response.data), 1)
        self.assertEqual(query_response.data[0]["name"], "A2 Ghee")
        self.assertEqual(category_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(category_response.data), 1)
        self.assertEqual(category_response.data[0]["name"], "Cow Milk")

    def test_product_list_supports_limit(self):
        category = Category.objects.create(name="Limit Category")
        Product.objects.create(
            category=category,
            name="Item A",
            price="10.00",
            stock_quantity=1,
        )
        Product.objects.create(
            category=category,
            name="Item B",
            price="20.00",
            stock_quantity=1,
        )

        response = self.client.get("/api/products?limit=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_product_list_supports_offset(self):
        category = Category.objects.create(name="Offset Category")
        Product.objects.create(
            category=category,
            name="Alpha",
            price="10.00",
            stock_quantity=1,
        )
        Product.objects.create(
            category=category,
            name="Beta",
            price="20.00",
            stock_quantity=1,
        )

        response = self.client.get("/api/products?ordering=name&limit=1&offset=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Beta")

    def test_product_list_supports_ordering(self):
        category = Category.objects.create(name="Order Category")
        Product.objects.create(
            category=category,
            name="Low Price",
            price="10.00",
            stock_quantity=1,
        )
        Product.objects.create(
            category=category,
            name="High Price",
            price="200.00",
            stock_quantity=1,
        )

        response = self.client.get("/api/products?ordering=-price")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["name"], "High Price")

    def test_admin_can_update_and_deactivate_category(self):
        category = Category.objects.create(name="Lassi")
        self.client.force_authenticate(user=self.admin_user)

        patch_response = self.client.patch(
            f"/api/categories/{category.id}",
            {"description": "Sweet lassi"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["description"], "Sweet lassi")

        delete_response = self.client.delete(f"/api/categories/{category.id}")
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        category.refresh_from_db()
        self.assertFalse(category.is_active)

    def test_admin_can_update_and_deactivate_product(self):
        category = Category.objects.create(name="Yogurt")
        product = Product.objects.create(
            category=category,
            name="Greek Yogurt",
            price="80.00",
            stock_quantity=12,
        )
        self.client.force_authenticate(user=self.admin_user)

        patch_response = self.client.patch(
            f"/api/products/{product.id}",
            {"price": "85.00"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["price"], "85.00")

        delete_response = self.client.delete(f"/api/products/{product.id}")
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertFalse(product.is_active)

    def test_customer_cannot_update_or_deactivate_category_or_product(self):
        category = Category.objects.create(name="Butter Milk")
        product = Product.objects.create(
            category=category,
            name="Butter Milk 1L",
            price="45.00",
            stock_quantity=10,
        )
        self.client.force_authenticate(user=self.customer_user)

        category_patch = self.client.patch(
            f"/api/categories/{category.id}",
            {"description": "Updated"},
            format="json",
        )
        category_delete = self.client.delete(f"/api/categories/{category.id}")
        product_patch = self.client.patch(
            f"/api/products/{product.id}",
            {"price": "50.00"},
            format="json",
        )
        product_delete = self.client.delete(f"/api/products/{product.id}")

        self.assertEqual(category_patch.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(category_delete.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(product_patch.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(product_delete.status_code, status.HTTP_403_FORBIDDEN)
