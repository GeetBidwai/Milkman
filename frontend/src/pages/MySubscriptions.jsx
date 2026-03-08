import { useEffect, useState } from "react";
import { deleteSubscription, getSubscriptions } from "../api";

export default function MySubscriptions() {
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
      setSubscriptions(await getSubscriptions({ ordering: "-created_at", limit: 100 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(subscriptionId) {
    try {
      setActionLoadingId(subscriptionId);
      setError("");
      setMessage("");
      await deleteSubscription(subscriptionId);
      setMessage("Subscription canceled successfully.");
      await loadSubscriptions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Customer
        </p>
        <h2 className="text-3xl font-bold text-slate-900">My Subscriptions</h2>
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Loading subscriptions...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">You do not have any subscriptions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.3em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Frequency</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {subscription.product_name}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {subscription.plan_name || "Standard"}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">
                    {(subscription.plan_frequency || subscription.frequency).replaceAll("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{subscription.start_date}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                      {subscription.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={
                        actionLoadingId === subscription.id || subscription.status === "canceled"
                      }
                      onClick={() => handleCancel(subscription.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoadingId === subscription.id ? "Cancelling..." : "Cancel Subscription"}
                    </button>
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
