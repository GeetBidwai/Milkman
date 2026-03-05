# Milkman Backend API

This backend provides the Django REST API for the Milkman platform.
It is structured in modular apps: `users`, `products`, and `subscriptions`.

## Stack

- Django
- Django REST Framework
- JWT auth (`djangorestframework-simplejwt`)
- SQLite (development)

## Quick Start

1. Activate virtual environment:
   - PowerShell: `.\venv\Scripts\Activate.ps1`
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Apply migrations:
   - `python manage.py migrate`
4. Run server:
   - `python manage.py runserver`

## Environment Variables

Use `.env.example` as a reference for runtime settings:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG` (`True`/`False`)
- `DJANGO_ALLOWED_HOSTS` (comma-separated)
- `DJANGO_CORS_ALLOWED_ORIGINS` (comma-separated)

## Important Migration Note

This project uses a custom user model (`users.User`).
If your local DB was created before the custom user model existed, recreate SQLite once:

1. Delete `db.sqlite3`
2. Run `python manage.py migrate`

## API Base

All endpoints are under `/api/`.

## Authentication

- `POST /api/register`
- `POST /api/login`
- `POST /api/token/refresh`
- `GET /api/profile` (JWT required)
- `PATCH /api/profile` (JWT required)
- `GET /api/customers` (admin only)
- `GET /api/customers?q=<text>` (admin search)
- `GET /api/customers?limit=<n>` (admin result cap)
- `GET /api/customers?ordering=<username|-username|date_joined|-date_joined>`

Use `Authorization: Bearer <access_token>` for protected endpoints.

## Products

- `GET /api/categories` (public)
- `GET /api/categories?q=<name>` (public search)
- `GET /api/categories?limit=<n>` (public result cap)
- `GET /api/categories?ordering=<name|-name|created_at|-created_at>`
- `POST /api/categories` (admin only)
- `GET /api/categories/<id>` (public for active category, admin for any)
- `PATCH /api/categories/<id>` (admin only)
- `DELETE /api/categories/<id>` (admin only, soft deactivate)
- `GET /api/products` (public)
- `GET /api/products?q=<text>&category=<id>` (public filters)
- `GET /api/products?...&limit=<n>` (public result cap)
- `GET /api/products?...&ordering=<name|-name|price|-price|created_at|-created_at>`
- `POST /api/products` (admin only)
- `GET /api/products/<id>` (public for active product, admin for any)
- `PATCH /api/products/<id>` (admin only)
- `DELETE /api/products/<id>` (admin only, soft deactivate)

`Product.image` uses `ImageField` and is served through `MEDIA_URL` in development.

## Subscriptions

- `GET /api/subscriptions` (customer: own, admin: all)
- `GET /api/subscriptions?status=<active|paused|canceled>&q=<text>` (filtered list)
- `GET /api/subscriptions?...&limit=<n>` (filtered result cap)
- `GET /api/subscriptions?...&ordering=<created_at|-created_at|start_date|-start_date|status|-status>`
- `POST /api/subscriptions` (customer only)
- `GET /api/subscriptions/<id>` (owner/admin)
- `PATCH /api/subscriptions/<id>` (owner/admin)

## Tests

Run all current app tests with:

`python manage.py test users products subscriptions`
