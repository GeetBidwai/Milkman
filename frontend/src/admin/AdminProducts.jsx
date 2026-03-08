import { useEffect, useState } from "react";
import {
  createCategory,
  createProduct,
  deactivateCategory,
  deactivateProduct,
  getCategories,
  getProducts,
} from "../api";

const INITIAL_CATEGORY_FORM = { name: "", description: "", is_active: true };
const INITIAL_PRODUCT_FORM = {
  category: "",
  name: "",
  description: "",
  price: "",
  stock_quantity: 1,
  is_active: true,
  image: null,
};

export default function AdminProducts() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoryForm, setCategoryForm] = useState(INITIAL_CATEGORY_FORM);
  const [productForm, setProductForm] = useState(INITIAL_PRODUCT_FORM);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    if (!productForm.category && categories.length) {
      setProductForm((prev) => ({ ...prev, category: categories[0].id }));
    }
  }, [categories, productForm.category]);

  async function loadCategories() {
    try {
      setCategories(await getCategories());
    } catch (error) {
      setStatusError(error.message);
    }
  }

  async function loadProducts() {
    try {
      setProducts(await getProducts());
    } catch (error) {
      setStatusError(error.message);
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    setLoading(true);
    setStatusError("");
    setStatusMessage("");
    try {
      await createCategory(categoryForm);
      setCategoryForm(INITIAL_CATEGORY_FORM);
      await loadCategories();
      setStatusMessage("Category created.");
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    setLoading(true);
    setStatusError("");
    setStatusMessage("");
    try {
      const body = new FormData();
      body.append("category", String(productForm.category));
      body.append("name", productForm.name);
      body.append("description", productForm.description || "");
      body.append("price", String(productForm.price));
      body.append("stock_quantity", String(productForm.stock_quantity));
      body.append("is_active", String(productForm.is_active));
      if (productForm.image) {
        body.append("image", productForm.image);
      }
      await createProduct(body);
      setProductForm({ ...INITIAL_PRODUCT_FORM, category: categories[0]?.id || "" });
      await loadProducts();
      setStatusMessage("Product added.");
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivateCategory(categoryId) {
    setLoading(true);
    setStatusError("");
    try {
      await deactivateCategory(categoryId);
      await loadCategories();
      await loadProducts();
      setStatusMessage("Category toggled.");
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivateProduct(productId) {
    setLoading(true);
    setStatusError("");
    try {
      await deactivateProduct(productId);
      await loadProducts();
      setStatusMessage("Product toggled.");
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h2 className="text-3xl font-bold text-slate-900">Products</h2>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleCreateCategory}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-900">Create Category</h3>
          <input
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Name"
            value={categoryForm.name}
            onChange={(event) =>
              setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
          <textarea
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="Description"
            value={categoryForm.description}
            onChange={(event) =>
              setCategoryForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={categoryForm.is_active}
              onChange={(event) =>
                setCategoryForm((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
            Active
          </label>
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Category"}
          </button>
        </form>
        <form
          onSubmit={handleCreateProduct}
          className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-900">Create Product</h3>
          <select
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            value={productForm.category}
            onChange={(event) =>
              setProductForm((prev) => ({ ...prev, category: event.target.value }))
            }
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Name"
            value={productForm.name}
            onChange={(event) =>
              setProductForm((prev) => ({ ...prev, name: event.target.value }))
            }
            required
          />
          <textarea
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="Description"
            value={productForm.description}
            onChange={(event) =>
              setProductForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Price"
              type="number"
              min="0"
              step="0.01"
              value={productForm.price}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, price: event.target.value }))
              }
              required
            />
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Stock"
              type="number"
              min="0"
              value={productForm.stock_quantity}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, stock_quantity: event.target.value }))
              }
              required
            />
          </div>
          <label className="block rounded-2xl border border-slate-200 px-3 py-2 text-sm">
            Product image
            <input
              type="file"
              accept="image/*"
              className="mt-2 w-full"
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, image: event.target.files?.[0] || null }))
              }
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={productForm.is_active}
              onChange={(event) =>
                setProductForm((prev) => ({ ...prev, is_active: event.target.checked }))
              }
            />
            Active
          </label>
          <button
            disabled={loading}
            className="w-full rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Product"}
          </button>
        </form>
      </div>
      <div className="space-y-4">
        {statusMessage ? (
          <p className="text-sm text-emerald-700">{statusMessage}</p>
        ) : null}
        {statusError ? <p className="text-sm text-rose-600">{statusError}</p> : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Categories</h3>
          <div className="mt-3 space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-700"
              >
                <div>
                  <p className="font-semibold">{category.name}</p>
                  <p className="text-xs text-slate-500">
                    {category.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeactivateCategory(category.id)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {category.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Products</h3>
          <div className="mt-3 space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2 text-sm text-slate-700"
              >
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-slate-500">
                    Rs {product.price} • {product.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeactivateProduct(product.id)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {product.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
