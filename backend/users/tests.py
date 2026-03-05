from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import Profile

User = get_user_model()


class AuthenticationAPITests(APITestCase):
    def test_register_creates_customer_with_profile_and_tokens(self):
        payload = {
            "username": "john",
            "email": "john@example.com",
            "password": "securepass123",
            "phone": "1234567890",
            "city": "Delhi",
        }
        response = self.client.post("/api/register", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        user = User.objects.get(username="john")
        self.assertEqual(user.role, User.Role.CUSTOMER)
        self.assertTrue(Profile.objects.filter(user=user).exists())

    def test_login_returns_jwt_pair(self):
        User.objects.create_user(username="alice", password="securepass123")
        payload = {"username": "alice", "password": "securepass123"}

        response = self.client.post("/api/login", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_token_refresh_returns_new_access_token(self):
        User.objects.create_user(username="robin", password="securepass123")
        login_response = self.client.post(
            "/api/login",
            {"username": "robin", "password": "securepass123"},
            format="json",
        )
        refresh = login_response.data["refresh"]

        refresh_response = self.client.post(
            "/api/token/refresh",
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

    def test_token_refresh_rejects_invalid_token(self):
        response = self.client.post(
            "/api/token/refresh",
            {"refresh": "invalid-token"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_requires_authentication(self):
        response = self.client.get("/api/profile")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_get_and_patch_for_authenticated_user(self):
        user = User.objects.create_user(username="mike", password="securepass123")
        profile = Profile.objects.create(user=user, city="Old City")
        self.client.force_authenticate(user=user)

        get_response = self.client.get("/api/profile")
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.data["city"], "Old City")

        patch_response = self.client.patch(
            "/api/profile",
            {"city": "New City", "phone": "9999999999"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

        profile.refresh_from_db()
        self.assertEqual(profile.city, "New City")
        self.assertEqual(profile.phone, "9999999999")

    def test_admin_can_list_customers(self):
        admin = User.objects.create_user(
            username="admin-list",
            password="securepass123",
            role=User.Role.ADMIN,
        )
        customer = User.objects.create_user(
            username="cust-list",
            password="securepass123",
            role=User.Role.CUSTOMER,
            email="cust@example.com",
        )
        Profile.objects.create(user=customer, city="Pune", phone="1112223333")
        self.client.force_authenticate(user=admin)

        response = self.client.get("/api/customers")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["username"], "cust-list")
        self.assertEqual(response.data[0]["city"], "Pune")

    def test_customer_cannot_list_customers(self):
        customer = User.objects.create_user(
            username="cust-denied",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        self.client.force_authenticate(user=customer)

        response = self.client.get("/api/customers")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_filter_customers_with_query(self):
        admin = User.objects.create_user(
            username="admin-query",
            password="securepass123",
            role=User.Role.ADMIN,
        )
        customer_1 = User.objects.create_user(
            username="ravi",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        customer_2 = User.objects.create_user(
            username="neha",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        Profile.objects.create(user=customer_1, city="Delhi")
        Profile.objects.create(user=customer_2, city="Mumbai")
        self.client.force_authenticate(user=admin)

        response = self.client.get("/api/customers?q=delhi")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["username"], "ravi")

    def test_admin_can_limit_customers_result(self):
        admin = User.objects.create_user(
            username="admin-limit",
            password="securepass123",
            role=User.Role.ADMIN,
        )
        User.objects.create_user(
            username="cust1",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        User.objects.create_user(
            username="cust2",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        self.client.force_authenticate(user=admin)

        response = self.client.get("/api/customers?limit=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_offset_customers_result(self):
        admin = User.objects.create_user(
            username="admin-offset",
            password="securepass123",
            role=User.Role.ADMIN,
        )
        User.objects.create_user(
            username="aaa",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        User.objects.create_user(
            username="bbb",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        self.client.force_authenticate(user=admin)

        response = self.client.get("/api/customers?ordering=username&limit=1&offset=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["username"], "bbb")

    def test_admin_can_order_customers(self):
        admin = User.objects.create_user(
            username="admin-order",
            password="securepass123",
            role=User.Role.ADMIN,
        )
        User.objects.create_user(
            username="aaa",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        User.objects.create_user(
            username="zzz",
            password="securepass123",
            role=User.Role.CUSTOMER,
        )
        self.client.force_authenticate(user=admin)

        response = self.client.get("/api/customers?ordering=-username")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["username"], "zzz")
