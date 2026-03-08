import { useEffect, useState } from "react";
import {
  createPlan,
  deactivatePlan,
  getAdminPlans,
  getProducts,
  updatePlan,
} from "../api";

const INITIAL_PLAN_FORM = {
  product: "",
  name: "",
  frequency: "daily",
  price: "",
  discount_percent: 0,
  is_active: true,
};

export default function AdminPlans() {
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState(INITIAL_PLAN_FORM);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [productsData, plansData] = await Promise.all([
        getProducts(),
        getAdminPlans({ ordering: "product__name", limit: 200 }),
      ]);
      setProducts(productsData);
      setPlans(plansData);
      if (!planForm.product && productsData.length) {
        setPlanForm((prev) => ({ ...prev, product: String(productsData[0].id) }));
      }
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditingPlanId(null);
    setPlanForm({
      ...INITIAL_PLAN_FORM,
      product: products[0] ? String(products[0].id) : "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage("");
      setError("");
      const payload = {
        ...planForm,
        product: Number(planForm.product),
        discount_percent: Number(planForm.discount_percent),
      };
      if (editingPlanId) {
        await updatePlan(editingPlanId, payload);
        setMessage("Plan updated.");
      } else {
        await createPlan(payload);
        setMessage("Plan created.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(plan) {
    setEditingPlanId(plan.id);
    setPlanForm({
      product: String(plan.product),
      name: plan.name,
      frequency: plan.frequency,
      price: plan.price,
      discount_percent: plan.discount_percent,
      is_active: plan.is_active,
    });
    setMessage("");
    setError("");
  }

  async function handleDeactivate(planId) {
    try {
      setSaving(true);
      setMessage("");
      setError("");
      await deactivatePlan(planId);
      setMessage("Plan deactivated.");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h2 className="text-3xl font-bold text-slate-900">Plans</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-900">
            {editingPlanId ? "Edit Plan" : "Create Plan"}
          </h3>
          <select
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            value={planForm.product}
            onChange={(event) =>
              setPlanForm((prev) => ({ ...prev, product: event.target.value }))
            }
            required
          >
            <option value="">Select product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Plan name"
            value={planForm.name}
            onChange={(event) =>
              setPlanForm((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
          <select
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            value={planForm.frequency}
            onChange={(event) =>
              setPlanForm((prev) => ({ ...prev, frequency: event.target.value }))
            }
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Price"
              type="number"
              min="0"
              step="0.01"
              value={planForm.price}
              onChange={(event) =>
                setPlanForm((prev) => ({ ...prev, price: event.target.value }))
              }
              required
            />
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Discount %"
              type="number"
              min="0"
              max="100"
              value={planForm.discount_percent}
              onChange={(event) =>
                setPlanForm((prev) => ({
                  ...prev,
                  discount_percent: event.target.value,
                }))
              }
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={planForm.is_active}
              onChange={(event) =>
                setPlanForm((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
            Active
          </label>
          <div className="flex gap-3">
            <button
              disabled={saving}
              className="flex-1 rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : editingPlanId ? "Update Plan" : "Create Plan"}
            </button>
            {editingPlanId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </form>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Existing Plans</h3>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600">Loading plans...</p>
          ) : plans.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No plans created yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.3em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Frequency</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {plan.product_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{plan.name}</td>
                      <td className="px-4 py-3 text-slate-600 capitalize">{plan.frequency}</td>
                      <td className="px-4 py-3 text-slate-700">Rs {plan.price}</td>
                      <td className="px-4 py-3 text-slate-600">{plan.discount_percent}%</td>
                      <td className="px-4 py-3 text-slate-600">
                        {plan.is_active ? "Active" : "Inactive"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(plan)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={saving || !plan.is_active}
                            onClick={() => handleDeactivate(plan.id)}
                            className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
