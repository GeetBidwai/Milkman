import { clearTokens } from "../api";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const MENU_ITEMS = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Products", to: "/admin/products" },
  { label: "Plans", to: "/admin/plans" },
  { label: "Orders", to: "/admin/orders" },
  { label: "Customers", to: "/admin/customers" },
  { label: "Subscriptions", to: "/admin/subscriptions" },
  { label: "Upload CSV", to: "/admin/upload-csv" },
];

export default function AdminLayout({ logout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      clearTokens();
    }
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white px-6 py-8 shadow-sm">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Admin</p>
            <h1 className="text-2xl font-bold text-slate-900">Milkman</h1>
          </div>
          <nav className="flex-1 space-y-2">
            {MENU_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-brand-700 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Logout
          </button>
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
