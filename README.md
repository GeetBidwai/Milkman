# Milkman

Milkman is a full-stack dairy delivery application built with Django REST Framework and React. It supports customer signup/login, product browsing, cart and billing flow, recurring subscriptions, and an admin workspace for managing catalog data, plans, customers, and subscriptions.

## Features

- JWT-based authentication with separate customer and admin experiences
- Product catalog with categories, search, sorting, and image upload support
- Subscription plans for daily, weekly, and monthly delivery
- Customer subscription management with pause, activate, and cancel actions
- Admin dashboard for products, plans, customers, subscriptions, and CSV imports
- Postman collection for local API testing

## Tech Stack

- Backend: Django, Django REST Framework, Simple JWT, Pillow, SQLite
- Frontend: React, Vite, React Router, Tailwind CSS
- Tooling: Postman

## Project Structure

```text
milkman/
|- backend/        Django API, models, media, and app modules
|- frontend/       React + Vite client application
|- postman/        Postman collection and local environment
|- README.md
```

## Main Modules

### Backend

- `users`: custom user model, registration, login, profile, customer listing
- `products`: categories, products, product image handling, CSV product import
- `subscriptions`: plans, recurring subscriptions, admin subscription views
- `core`: API routing, settings, health check

### Frontend

- Customer flow: login/register, product browsing, cart, checkout, subscription modal, subscription history
- Admin flow: dashboard, products, plans, customers, orders view, subscriptions, CSV upload

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd milkman
```

### 2. Run the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend default URL: `http://127.0.0.1:8000`

### 3. Run the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: `http://127.0.0.1:5173`

## Environment Variables

### Backend

These settings are optional for local development and already have defaults in `backend/core/settings.py`.

```env
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
DJANGO_CORS_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

### Frontend

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## API Overview

Base path: `/api/`

### Auth and profile

- `POST /register`
- `POST /login`
- `POST /token/refresh`
- `GET /profile`
- `PATCH /profile`

### Products and categories

- `GET /categories`
- `POST /categories` admin only
- `PATCH /categories/:id` admin only
- `DELETE /categories/:id` admin only
- `GET /products`
- `POST /products` admin only
- `POST /products/upload-csv/` admin only
- `PATCH /products/:id` admin only
- `DELETE /products/:id` admin only

### Plans and subscriptions

- `GET /plans`
- `GET /subscriptions`
- `POST /subscriptions` customer only
- `PATCH /subscriptions/:id`
- `DELETE /subscriptions/:id`
- `GET /admin/plans` admin only
- `POST /admin/plans` admin only
- `GET /admin/subscriptions` admin only

### Utility

- `GET /health/`

## Important Notes

- The backend uses a custom user model: `users.User`.
- Product images are stored under `backend/media/products/`.
- Checkout and order history are currently handled in the frontend with `localStorage`; they are not persisted through the backend API yet.
- Subscription creation supports either a direct product subscription or a predefined subscription plan.

## Postman

Import the files inside [`postman/`](./postman) to test the API locally:

- `Milkman.postman_collection.json`
- `Milkman.local.postman_environment.json`

## Development Commands

### Backend tests

```bash
cd backend
python manage.py test users products subscriptions
```

### Frontend production build

```bash
cd frontend
npm run build
```

## GitHub Description

Milkman is a full-stack dairy delivery platform with JWT auth, subscription management, product catalog administration, and a React frontend backed by Django REST APIs.
