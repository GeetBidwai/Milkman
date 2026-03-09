import { useEffect, useState } from "react";
import { getCustomers, getProducts } from "../api";
import { getStoredOrders, subscribeToStoredOrders } from "../orders";

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState(() => getStoredOrders());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;
    async function loadStats() {
      setLoading(true);
      try {
        const [productsData, customersData] = await Promise.all([
          getProducts(),
          getCustomers({ limit: 100 }),
        ]);
        if (!isActive) {
          return;
        }
        setProducts(productsData);
        setCustomers(customersData);
        setError("");
      } catch (err) {
        if (!isActive) {
          return;
        }
        setError(err.message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => subscribeToStoredOrders(setOrders), []);

  const totalRevenue = orders.reduce((sum, order) => {
    return sum + (Number(order.total) || 0);
  }, 0);

  const stats = [
    { label: "Total Products", value: products.length },
    { label: "Total Orders", value: orders.length },
    { label: "Total Customers", value: customers.length },
    { label: "Total Revenue", value: `Rs ${totalRevenue.toFixed(2)}` },
  ];

  if (loading) {
    return <p className="text-sm text-slate-600">Loading admin dashboard...</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{stat.label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
