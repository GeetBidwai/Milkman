import { useEffect, useState } from "react";
import { getAdminSubscriptions, updateSubscription } from "../api";

const STATUS_OPTIONS = ["active", "paused", "canceled"];

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function loadSubscriptions() {
    try {
      setLoading(true);
      setError("");
      setSubscriptions(await getAdminSubscriptions({ ordering: "-created_at", limit: 200 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(subscriptionId, statusValue) {
    try {
      setActionLoadingId(subscriptionId);
      setError("");
      setMessage("");
      await updateSubscription(subscriptionId, { status: statusValue });
      setMessage("Subscription updated.");
      await loadSubscriptions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h2 className="text-3xl font-bold text-slate-900">Subscriptions</h2>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-slate-600">Loading subscriptions...</p>
      ) : subscriptions.length === 0 ? (
        <p className="text-sm text-slate-600">No subscriptions found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.3em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {subscription.customer_username}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{subscription.product_name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {subscription.plan_name || "Standard"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">
                    {(subscription.plan_frequency || subscription.frequency).replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{subscription.start_date}</td>
                  <td className="px-4 py-3">
                    <select
                      value={subscription.status}
                      disabled={actionLoadingId === subscription.id}
                      onChange={(event) =>
                        handleStatusChange(subscription.id, event.target.value)
                      }
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                    >
                      {STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
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
