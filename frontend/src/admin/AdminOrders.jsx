import { useEffect, useMemo, useState } from "react";

import { getStoredOrders, subscribeToStoredOrders } from "../orders";

export default function AdminOrders() {
  const [orders, setOrders] = useState(() => getStoredOrders());

  useEffect(() => {
    return subscribeToStoredOrders(setOrders);
  }, []);

  const enrichedOrders = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        productNames: order.items.map((item) => item.product.name).join(", "),
      })),
    [orders]
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h2 className="text-3xl font-bold text-slate-900">Orders</h2>
      </div>
      {enrichedOrders.length === 0 ? (
        <p className="text-sm text-slate-600">No orders have been placed yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.3em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrichedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{order.id}</td>
                  <td className="px-4 py-3 text-slate-700">{order.customer.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{order.productNames}</td>
                  <td className="px-4 py-3 text-slate-700">
                    Rs {Number(order.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {order.customer.payment_summary || order.customer.payment_method?.toUpperCase() || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(order.placed_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
