import { useEffect, useState } from "react";
import { getCustomers } from "../api";

const ORDERS_STORAGE_KEY = "milkman_order_history";

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [orderCounts, setOrderCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        setCustomers(await getCustomers({ limit: 200 }));
        const counts = loadOrders().reduce((acc, order) => {
          const key = order.customer.username || order.customer.full_name;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});
        setOrderCounts(counts);
        setError("");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h2 className="text-3xl font-bold text-slate-900">Customers</h2>
      </div>
      {loading ? (
        <p className="text-sm text-slate-600">Loading customers...</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.3em] text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Customer Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Address</th>
                <th className="px-4 py-3 text-left">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 font-semibold">
                    {customer.first_name || customer.username}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{customer.email || "N/A"}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.phone || "N/A"}</td>
                  <td className="px-4 py-3 text-slate-600">{customer.city || "N/A"}</td>
                  <td className="px-4 py-3 text-slate-700">{orderCounts[customer.username] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
