from datetime import date, timedelta

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import Category, Product
from subscriptions.models import Subscription, SubscriptionPlan

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
        self.daily_plan = SubscriptionPlan.objects.create(
            product=self.product,
            name="Daily Plan",
            frequency=SubscriptionPlan.Frequency.DAILY,
            price="60.00",
            discount_percent=8,
        )

    def test_customer_can_create_subscription(self):
        self.client.force_authenticate(user=self.customer_1)
        payload = {
            "plan": self.daily_plan.id,
            "start_date": str(date.today()),
        }

        response = self.client.post("/api/subscriptions", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Subscription.objects.count(), 1)
        subscription = Subscription.objects.first()
        self.assertEqual(subscription.customer_id, self.customer_1.id)
        self.assertEqual(subscription.plan_id, self.daily_plan.id)
        self.assertEqual(subscription.product_id, self.product.id)

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

    def test_customer_can_cancel_subscription_with_delete(self):
        subscription = Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today(),
            status=Subscription.Status.ACTIVE,
        )

        self.client.force_authenticate(user=self.customer_1)
        response = self.client.delete(f"/api/subscriptions/{subscription.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        subscription.refresh_from_db()
        self.assertEqual(subscription.status, Subscription.Status.CANCELED)
        self.assertEqual(subscription.end_date, date.today())

    def test_admin_can_view_admin_subscriptions_endpoint(self):
        Subscription.objects.create(
            customer=self.customer_1,
            product=self.product,
            quantity=1,
            start_date=date.today(),
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/admin/subscriptions")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_customer_cannot_access_admin_subscriptions_endpoint(self):
        self.client.force_authenticate(user=self.customer_1)
        response = self.client.get("/api/admin/subscriptions")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_can_create_monthly_subscription(self):
        monthly_plan = SubscriptionPlan.objects.create(
            product=self.product,
            name="Monthly Plan",
            frequency=SubscriptionPlan.Frequency.MONTHLY,
            price="1500.00",
            discount_percent=15,
        )
        self.client.force_authenticate(user=self.customer_1)
        payload = {
            "plan": monthly_plan.id,
            "start_date": str(date.today()),
        }

        response = self.client.post("/api/subscriptions", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["delivery_frequency"], Subscription.DeliveryFrequency.MONTHLY)

    def test_customer_can_create_direct_product_subscription(self):
        self.client.force_authenticate(user=self.customer_1)
        payload = {
            "product": self.product.id,
            "frequency": Subscription.DeliveryFrequency.DAILY,
        }

        response = self.client.post("/api/subscriptions", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["product"], self.product.id)
        self.assertEqual(response.data["frequency"], Subscription.DeliveryFrequency.DAILY)

    def test_public_can_view_active_plans(self):
        response = self.client.get("/api/plans")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Daily Plan")

    def test_admin_can_create_plan(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "product": self.product.id,
            "name": "Weekly Saver",
            "frequency": SubscriptionPlan.Frequency.WEEKLY,
            "price": "400.00",
            "discount_percent": 10,
            "is_active": True,
        }

        response = self.client.post("/api/admin/plans", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SubscriptionPlan.objects.count(), 2)

    def test_admin_can_update_plan(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            f"/api/admin/plans/{self.daily_plan.id}",
            {"price": "55.00", "discount_percent": 12},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.daily_plan.refresh_from_db()
        self.assertEqual(str(self.daily_plan.price), "55.00")
        self.assertEqual(self.daily_plan.discount_percent, 12)

    def test_admin_can_deactivate_plan(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f"/api/admin/plans/{self.daily_plan.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.daily_plan.refresh_from_db()
        self.assertFalse(self.daily_plan.is_active)

    def test_customer_cannot_access_admin_plans(self):
        self.client.force_authenticate(user=self.customer_1)
        response = self.client.get("/api/admin/plans")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
