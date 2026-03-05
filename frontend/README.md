# Milkman Frontend

Frontend foundation for Milkman using React + Tailwind CSS.
Routing is implemented with `react-router-dom`.

## Run

1. Install dependencies:
   - `npm install`
2. (Optional) Configure API URL:
   - copy `.env.example` to `.env`
   - adjust `VITE_API_BASE_URL` if backend runs on a different host
3. Start dev server:
   - `npm run dev`

Default URL: `http://127.0.0.1:5173`

## Frontend Routes

- `/` overview dashboard
- `/customer` customer workflow (requires login)
- `/admin` admin workflow (requires admin role)

Protected routes wait for token-based session bootstrap before redirecting.

## Backend Connection

- Health check call uses:
  - for default config: `http://127.0.0.1:8000/api/health/`
- Auth calls are wired to:
  - `POST /api/register`
  - `POST /api/login`
  - `POST /api/token/refresh`
  - `GET /api/profile`
- Product call is wired to:
  - `GET /api/products`
- Category call is wired to:
  - `GET /api/categories`
- Subscription calls are wired to:
  - `GET /api/subscriptions`
  - `POST /api/subscriptions` (customer)
  - `PATCH /api/subscriptions/<id>`
- Admin create calls are wired to:
  - `POST /api/categories` (admin)
  - `POST /api/products` (admin, multipart for image)
- Admin manage calls are wired to:
  - `PATCH /api/categories/<id>`
  - `DELETE /api/categories/<id>`
  - `PATCH /api/products/<id>`
  - `DELETE /api/products/<id>`
- Admin customer view call is wired to:
  - `GET /api/customers` (admin)

Access and refresh tokens are stored in browser `localStorage` after login/register.
Access token refresh is automatic on authenticated API 401 responses.
Product image URLs from Django media are normalized in frontend before rendering.
UI includes loading/disabled states for auth, catalog, subscriptions, and admin actions.
Subscription form blocks past start dates before submitting to the API.
Admin and customer dashboards include search/filter controls for products, subscriptions, and customers.
Frontend list calls now pass `limit` query parameters to keep response sizes bounded.
Frontend product and subscription sections include server-driven sorting controls.
Product and customer search inputs are debounced to reduce request frequency while typing.

Make sure Django backend is running before testing frontend API calls.
