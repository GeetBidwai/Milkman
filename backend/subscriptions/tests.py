from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product
from subscriptions.models import Subscription

User = get_user_model()


class SubscriptionAPITests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="admin2",
            password="securepass123",
            role=User.Role.ADMIN,
        )
        self.customer_1 = User.objects.create_user(
            username="customer2",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        self.customer_2 = User.objects.create_user(
            username="customer3",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        category = Category.objects.create(name="Milk Products")
        self.product = Product.objects.create(
            category=category,
            name="Toned Milk 1L",
            price="65.00",
            stock_quantity=30,
        )

    def test_customer_can_create_subscription(self):
        self.client.force_authenticate(user=self.customer_1)
        payload = {
            "product": self.product.id,
            "quantity": 2,
            "delivery_frequency": Subscription.DeliveryFrequency.DAILY,
            "start_date": str(date.today()),
        }

        response = self.client.post("/api/subscriptions", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Subscription.objects.count(), 1)
        subscription = Subscription.objects.first()
        self.assertEqual(subscription.customer_id, self.customer_1.id)

    def test_customer_cannot_subscribe_to_inactive_product(self):
        inactive_product = Product.objects.create(
            category=self.product.category,
            name="Inactive Milk",
            price="50.00",
            stock_quantity=5,
            is_active=False,
        )
        self.client.force_authenticate(user=self.customer_1)
        payload = {
            "product": inactive_product.id,
            "quantity": 1,
            "delivery_frequency": Subscription.DeliveryFrequency.DAILY,
            "start_date": str(date.today()),
        }

        response = self.client.post("/api/subscriptions", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_subscribe_with_past_start_date(self):
        self.client.force_authenticate(user=self.customer_1)
        payload = {
            "product": self.product.id,
            "quantity": 1,
            "delivery_frequency": Subscription.DeliveryFrequency.DAILY,
            "start_date": str(date.today() - timedelta(days=1)),
        }

        response = self.client.post("/api/subscriptions", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_subscribe_to_product_in_inactive_category(self):
        inactive_category = Category.objects.create(name="Inactive Category", is_active=False)
        product = Product.objects.create(
            category=inactive_category,
            name="Hidden Product",
            price="40.00",
            stock_quantity=5,
            is_active=True,
        )
        self.client.force_authenticate(user=self.customer_1)
        payload = {
            "product": product.id,
            "quantity": 1,
            "delivery_frequency": Subscription.DeliveryFrequency.DAILY,
            "start_date": str(date.today()),
        }

        response = self.client.post("/api/subscriptions", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_gets_all_subscriptions(self):
        Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today(),
        )
        Subscription.objects.create(
            customer=self.customer_2,
            product=self.product,
            quantity=3,
            start_date=date.today(),
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/subscriptions")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_admin_can_filter_subscriptions_by_status_and_query(self):
        Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today(),
            status=Subscription.Status.ACTIVE,
        )
        Subscription.objects.create(
            customer=self.customer_2,
            product=self.product,
            quantity=2,
            start_date=date.today(),
            status=Subscription.Status.PAUSED,
        )
        self.client.force_authenticate(user=self.admin_user)

        status_response = self.client.get(
            f"/api/subscriptions?status={Subscription.Status.PAUSED}"
        )
        query_response = self.client.get("/api/subscriptions?q=customer2")

        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(status_response.data), 1)
        self.assertEqual(status_response.data[0]["status"], Subscription.Status.PAUSED)
        self.assertEqual(query_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(query_response.data), 1)
        self.assertEqual(query_response.data[0]["customer_username"], "customer2")

    def test_admin_can_limit_subscriptions_result(self):
        Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today(),
        )
        Subscription.objects.create(
            customer=self.customer_2,
            product=self.product,
            quantity=2,
            start_date=date.today(),
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/subscriptions?limit=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_offset_subscriptions_result(self):
        Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today() - timedelta(days=2),
        )
        Subscription.objects.create(
            customer=self.customer_2,
            product=self.product,
            quantity=1,
            start_date=date.today() - timedelta(days=1),
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            "/api/subscriptions?ordering=start_date&limit=1&offset=1"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["customer_username"],
            "customer3",
        )

    def test_admin_can_order_subscriptions(self):
        Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today() - timedelta(days=1),
        )
        Subscription.objects.create(
            customer=self.customer_2,
            product=self.product,
            quantity=1,
            start_date=date.today(),
        )
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get("/api/subscriptions?ordering=-start_date")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
        self.assertEqual(str(response.data[0]["start_date"]), str(date.today()))

    def test_anonymous_cannot_access_subscriptions(self):
        response = self.client.get("/api/subscriptions")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_gets_only_own_subscriptions(self):
        Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today(),
        )
        Subscription.objects.create(
            customer=self.customer_2,
            product=self.product,
            quantity=3,
            start_date=date.today(),
        )

        self.client.force_authenticate(user=self.customer_1)
        response = self.client.get("/api/subscriptions")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["customer_username"], "customer2")

    def test_customer_cannot_view_another_customer_subscription(self):
        other_subscription = Subscription.objects.create(
            customer=self.customer_2,
            product=self.product,
            quantity=1,
            start_date=date.today(),
        )

        self.client.force_authenticate(user=self.customer_1)
        response = self.client.get(f"/api/subscriptions/{other_subscription.id}")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_patch_restricted_fields(self):
        subscription = Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today(),
        )

        self.client.force_authenticate(user=self.customer_1)
        response = self.client.patch(
            f"/api/subscriptions/{subscription.id}",
            {"start_date": str(date.today())},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_update_subscription_status(self):
        subscription = Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today(),
            status=Subscription.Status.ACTIVE,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/subscriptions/{subscription.id}",
            {"status": Subscription.Status.PAUSED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.PAUSED)
