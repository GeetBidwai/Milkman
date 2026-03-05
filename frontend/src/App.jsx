import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";

import {
  clearTokens,
  createCategory,
  createProduct,
  createSubscription,
  deactivateCategory,
  deactivateProduct,
  getAccessToken,
  getCategories,
  getCustomers,
  getMediaUrl,
  getProducts,
  getProfile,
  getSubscriptions,
  loginUser,
  registerUser,
  setTokens,
  updateCategory,
  updateProduct,
  updateSubscription,
} from "./api";

const today = new Date().toISOString().slice(0, 10);
const CART_STORAGE_KEY = "milkman_cart_items";
const ORDERS_STORAGE_KEY = "milkman_order_history";

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function useDebouncedValue(value, delayMs = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

export default function App() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profile, setProfile] = useState(null);
  const [authBootstrapLoading, setAuthBootstrapLoading] = useState(Boolean(getAccessToken()));
  const [authLoading, setAuthLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categoriesError, setCategoriesError] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [productsError, setProductsError] = useState("");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productQuery, setProductQuery] = useState("");
  const [productOrdering, setProductOrdering] = useState("name");
  const [subscriptions, setSubscriptions] = useState([]);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [subscriptionError, setSubscriptionError] = useState("");
  const [subscriptionFormError, setSubscriptionFormError] = useState("");
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionActionLoading, setSubscriptionActionLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState("");
  const [subscriptionOrdering, setSubscriptionOrdering] = useState("-created_at");
  const [subscriptionOffset, setSubscriptionOffset] = useState(0);
  const [hasMoreSubscriptions, setHasMoreSubscriptions] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [productNotice, setProductNotice] = useState("");
  const [orderHistory, setOrderHistory] = useState([]);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const debouncedCustomerQuery = useDebouncedValue(customerQuery, 350);
  const subscriptionPageSize = 10;

  const [newSub, setNewSub] = useState({
    product: "",
    quantity: 1,
    delivery_frequency: "daily",
    start_date: today,
  });
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  const [newProduct, setNewProduct] = useState({
    category: "",
    name: "",
    description: "",
    price: "",
    stock_quantity: 1,
    is_active: true,
    image: null,
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    city: "",
  });
  const [billingForm, setBillingForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    payment_method: "cod",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [productOrdering, selectedCategory]);

  useEffect(() => {
    if (profile) {
      loadSubscriptions();
    }
  }, [subscriptionStatusFilter, subscriptionOrdering, subscriptionOffset]);

  useEffect(() => {
    if (profile?.role === "admin") {
      loadCustomers(debouncedCustomerQuery);
    }
  }, [debouncedCustomerQuery]);

  useEffect(() => {
    setSubscriptionOffset(0);
  }, [subscriptionStatusFilter, subscriptionOrdering]);

  useEffect(() => {
    if (getAccessToken()) {
      loadProfileAndSubscriptions();
    } else {
      setAuthBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    const scopedProducts =
      selectedCategory === "all"
        ? products
        : products.filter((product) => String(product.category) === selectedCategory);

    if (scopedProducts.length === 0) {
      setNewSub((prev) => (prev.product ? { ...prev, product: "" } : prev));
      return;
    }
    const hasSelected = scopedProducts.some(
      (product) => String(product.id) === String(newSub.product)
    );
    if (!hasSelected) {
      setNewSub((prev) => ({ ...prev, product: String(scopedProducts[0].id) }));
    }
  }, [products, selectedCategory, newSub.product]);

  useEffect(() => {
    if (!newProduct.category && categories.length) {
      setNewProduct((prev) => ({ ...prev, category: String(categories[0].id) }));
    }
  }, [categories, newProduct.category]);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (savedOrders) {
        setOrderHistory(JSON.parse(savedOrders));
      }
    } catch {
      setCartItems([]);
      setOrderHistory([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orderHistory));
  }, [orderHistory]);

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((product) => String(product.category) === selectedCategory);
  const searchedProducts = filteredProducts.filter((product) =>
    product.name.toLowerCase().includes(productQuery.trim().toLowerCase())
  );
  const isAuthenticated = Boolean(profile && getAccessToken());
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  async function loadCategories() {
    try {
      setCategoriesLoading(true);
      setCategoriesError("");
      setCategories(await getCategories());
    } catch (error) {
      setCategoriesError(error.message);
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function loadProducts() {
    try {
      setProductsLoading(true);
      setProductsError("");
      const data = await getProducts({
        category: selectedCategory === "all" ? undefined : selectedCategory,
        ordering: productOrdering,
      });
      setProducts(data);
      if (data.length && !newSub.product) {
        setNewSub((prev) => ({ ...prev, product: String(data[0].id) }));
      }
    } catch (error) {
      setProductsError(error.message);
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadProfileAndSubscriptions() {
    try {
      setProfileError("");
      const profileData = await getProfile();
      setProfile(profileData);
      await loadSubscriptions();
      if (profileData.role === "admin") {
        await loadCustomers(debouncedCustomerQuery);
      } else {
        setCustomers([]);
        setCustomersError("");
      }
    } catch (error) {
      setProfileError(error.message);
      setProfile(null);
      clearTokens();
    } finally {
      setAuthBootstrapLoading(false);
    }
  }

  async function loadSubscriptions() {
    try {
      setSubscriptionsLoading(true);
      const data = await getSubscriptions({
        status: subscriptionStatusFilter,
        ordering: subscriptionOrdering,
        limit: subscriptionPageSize,
        offset: subscriptionOffset,
      });
      setSubscriptions(data);
      setHasMoreSubscriptions(data.length === subscriptionPageSize);
    } catch (error) {
      setSubscriptionError(error.message);
    } finally {
      setSubscriptionsLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError("");
      const data = await loginUser(loginForm);
      setTokens(data);
      await loadProfileAndSubscriptions();
      navigate("/products");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError("");
      const data = await registerUser(registerForm);
      setTokens(data);
      await loadProfileAndSubscriptions();
      navigate("/products");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCreateSubscription(event) {
    event.preventDefault();
    if (newSub.start_date < today) {
      setSubscriptionFormError("Start date cannot be in the past.");
      return;
    }
    try {
      setSubscriptionActionLoading(true);
      setSubscriptionFormError("");
      setSubscriptionError("");
      setSubscriptionMessage("");
      await createSubscription({
        ...newSub,
        product: Number(newSub.product),
        quantity: Number(newSub.quantity),
      });
      setSubscriptionMessage("Subscription created.");
      await loadSubscriptions();
    } catch (error) {
      setSubscriptionError(error.message);
    } finally {
      setSubscriptionActionLoading(false);
    }
  }

  async function handleStatusUpdate(subscriptionId, statusValue) {
    try {
      setSubscriptionActionLoading(true);
      setSubscriptionError("");
      setSubscriptionMessage("");
      await updateSubscription(subscriptionId, { status: statusValue });
      setSubscriptionMessage("Subscription updated.");
      await loadSubscriptions();
    } catch (error) {
      setSubscriptionError(error.message);
    } finally {
      setSubscriptionActionLoading(false);
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    try {
      setAdminActionLoading(true);
      setAdminError("");
      setAdminMessage("");
      setProductNotice("");
      await createCategory(newCategory);
      setNewCategory({ name: "", description: "", is_active: true });
      await loadCategories();
      setAdminMessage("Category created.");
      setProductNotice("Category created successfully.");
      navigate("/products");
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    try {
      setAdminActionLoading(true);
      setAdminError("");
      setAdminMessage("");
      setProductNotice("");
      await createProduct({ ...newProduct, category: Number(newProduct.category) });
      setNewProduct({
        category: categories.length ? String(categories[0].id) : "",
        name: "",
        description: "",
        price: "",
        stock_quantity: 1,
        is_active: true,
        image: null,
      });
      await loadProducts();
      setAdminMessage("Product created.");
      setProductNotice("Product added successfully.");
      navigate("/products");
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleDeactivateCategory(categoryId) {
    try {
      setAdminActionLoading(true);
      setAdminError("");
      setAdminMessage("");
      await deactivateCategory(categoryId);
      await loadCategories();
      await loadProducts();
      setAdminMessage("Category deactivated.");
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleDeactivateProduct(productId) {
    try {
      setAdminActionLoading(true);
      setAdminError("");
      setAdminMessage("");
      await deactivateProduct(productId);
      await loadProducts();
      setAdminMessage("Product deactivated.");
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleRenameCategory(category) {
    const nextName = window.prompt("Enter new category name", category.name);
    if (!nextName || nextName.trim() === category.name) {
      return;
    }
    try {
      setAdminActionLoading(true);
      setAdminError("");
      setAdminMessage("");
      await updateCategory(category.id, { name: nextName.trim() });
      await loadCategories();
      setAdminMessage("Category updated.");
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleUpdateProductPrice(product) {
    const nextPrice = window.prompt("Enter new product price", product.price);
    if (!nextPrice || nextPrice.trim() === String(product.price)) {
      return;
    }
    try {
      setAdminActionLoading(true);
      setAdminError("");
      setAdminMessage("");
      await updateProduct(product.id, { price: nextPrice.trim() });
      await loadProducts();
      setAdminMessage("Product updated.");
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function handleEditProduct(product) {
    const nextName = window.prompt("Product name", product.name);
    if (!nextName || !nextName.trim()) {
      return;
    }
    const nextPrice = window.prompt("Product price", String(product.price));
    if (!nextPrice || Number(nextPrice) < 0) {
      return;
    }
    const nextStock = window.prompt("Stock quantity", String(product.stock_quantity || 0));
    if (!nextStock || Number(nextStock) < 0) {
      return;
    }
    const nextDescription = window.prompt(
      "Description",
      product.description || ""
    );

    try {
      setAdminActionLoading(true);
      setAdminError("");
      setAdminMessage("");
      await updateProduct(product.id, {
        name: nextName.trim(),
        price: String(nextPrice).trim(),
        stock_quantity: Number(nextStock),
        description: (nextDescription || "").trim(),
      });
      await loadProducts();
      setAdminMessage("Product updated.");
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setAdminActionLoading(false);
    }
  }

  async function loadCustomers(queryText = debouncedCustomerQuery) {
    try {
      setCustomersLoading(true);
      setCustomersError("");
      setCustomers(await getCustomers({ q: queryText, limit: 100 }));
    } catch (error) {
      setCustomersError(error.message);
    } finally {
      setCustomersLoading(false);
    }
  }

  function handleAddToCart(product) {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    navigate("/billing");
  }

  function handleUpdateCartQuantity(productId, quantity) {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }

  function handleRemoveFromCart(productId) {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  }

  function handlePlaceOrder(event) {
    event.preventDefault();
    if (!billingForm.full_name || !billingForm.phone || !billingForm.address) {
      setCheckoutError("Please fill full name, phone, and address.");
      setCheckoutMessage("");
      return;
    }
    if (cartItems.length === 0) {
      setCheckoutError("Your cart is empty.");
      setCheckoutMessage("");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError("");
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    const order = {
      id: `ORD-${Date.now()}`,
      placed_at: new Date().toISOString(),
      customer: { ...billingForm },
      items: cartItems,
      total: Number(totalAmount.toFixed(2)),
      status: "confirmed",
    };

    setOrderHistory((prev) => [order, ...prev].slice(0, 10));
    setCartItems([]);
    setCheckoutMessage(`Order ${order.id} placed successfully.`);
    setBillingForm((prev) => ({ ...prev, address: "" }));
    setCheckoutLoading(false);
  }

  function handleLogout() {
    clearTokens();
    setProfile(null);
    setSubscriptions([]);
    setSubscriptionMessage("");
    setSubscriptionError("");
    setSubscriptionFormError("");
    setAdminMessage("");
    setAdminError("");
    setCartItems([]);
    setAuthBootstrapLoading(false);
    navigate("/login");
  }

  function AuthPanel() {
    return (
      <Section title="Authentication">
        {profile ? (
          <div className="space-y-2 text-sm">
            <p>
              Signed in as <span className="font-semibold">{profile.username}</span> ({profile.role})
            </p>
            <p>Email: {profile.email || "N/A"}</p>
            <p>City: {profile.city || "N/A"}</p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-white"
            >
              Logout
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  authMode === "login" ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  authMode === "register"
                    ? "bg-brand-700 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Register
              </button>
            </div>
            {authMode === "login" ? (
              <form className="grid gap-3" onSubmit={handleLogin}>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Username"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  required
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="password"
                  placeholder="Password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
                <button
                  disabled={authLoading}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleRegister}>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Username"
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  required
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="email"
                  placeholder="Email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="First Name"
                  value={registerForm.first_name}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, first_name: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Last Name"
                  value={registerForm.last_name}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, last_name: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Phone"
                  value={registerForm.phone}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="City"
                  value={registerForm.city}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                  type="password"
                  placeholder="Password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
                <button
                  disabled={authLoading}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                >
                  {authLoading ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}
            {authError ? <p className="mt-3 text-sm text-red-600">{authError}</p> : null}
            {profileError ? <p className="mt-2 text-sm text-amber-700">{profileError}</p> : null}
          </div>
        )}
      </Section>
    );
  }

  function ProductPanel() {
    return (
      <Section title="Product Catalog">
        {productNotice ? <p className="mb-3 text-sm text-emerald-700">{productNotice}</p> : null}
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm text-slate-600" htmlFor="category-filter">
            <span>Category</span>
            <select
              id="category-filter"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm text-slate-600" htmlFor="product-search">
            <span>Search</span>
            <input
              id="product-search"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Search products"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
            />
          </label>

          <label className="grid gap-1 text-sm text-slate-600" htmlFor="product-ordering">
            <span>Sort</span>
            <select
              id="product-ordering"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={productOrdering}
              onChange={(event) => setProductOrdering(event.target.value)}
            >
              <option value="name">Name: A-Z</option>
              <option value="-name">Name: Z-A</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
            </select>
          </label>
        </div>
        {categoriesError ? <p className="mt-3 text-sm text-red-600">{categoriesError}</p> : null}
        {productsError ? <p className="mt-3 text-sm text-red-600">{productsError}</p> : null}
        <div className="mt-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Available Milk Products</h3>
          <p className="text-xs text-slate-500">{searchedProducts.length} items</p>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {productsLoading || categoriesLoading ? (
            <p className="text-sm text-slate-600">Loading products...</p>
          ) : searchedProducts.length === 0 ? (
            <p className="text-sm text-slate-600">No products available for this filter.</p>
          ) : (
            searchedProducts.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {product.image ? (
                  <img
                    src={getMediaUrl(product.image)}
                    alt={product.name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
                    No image
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <p className="line-clamp-1 font-semibold">{product.name}</p>
                  <p className="text-sm text-slate-600">{product.category_name}</p>
                  <p className="text-base font-semibold text-brand-700">Rs {product.price}</p>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="w-full rounded-lg bg-brand-700 px-3 py-2 text-sm text-white"
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Section>
    );
  }

  function BillingPanel() {
    const total = cartItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0
    );

    return (
      <Section title="Billing & Cart">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            {cartItems.length === 0 ? (
              <p className="text-sm text-slate-600">Your cart is empty. Add products from Products page.</p>
            ) : (
              <>
                <div className="grid gap-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.product.id}
                      className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_auto_auto]"
                    >
                      <div>
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-slate-600">Rs {item.product.price} each</p>
                        <p className="text-sm text-slate-600">
                          Line total: Rs{" "}
                          {(Number(item.product.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <input
                        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(event) =>
                          handleUpdateCartQuantity(
                            item.product.id,
                            Number(event.target.value || 1)
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="rounded-md bg-rose-100 px-3 py-1 text-xs text-rose-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">Total amount</p>
                  <p className="text-2xl font-semibold">Rs {total.toFixed(2)}</p>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold">Checkout</h3>
            <form className="mt-3 grid gap-3" onSubmit={handlePlaceOrder}>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Full name"
                value={billingForm.full_name}
                onChange={(event) =>
                  setBillingForm((prev) => ({ ...prev, full_name: event.target.value }))
                }
                required
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Phone number"
                value={billingForm.phone}
                onChange={(event) =>
                  setBillingForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                required
              />
              <textarea
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Delivery address"
                rows={3}
                value={billingForm.address}
                onChange={(event) =>
                  setBillingForm((prev) => ({ ...prev, address: event.target.value }))
                }
                required
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={billingForm.payment_method}
                onChange={(event) =>
                  setBillingForm((prev) => ({ ...prev, payment_method: event.target.value }))
                }
              >
                <option value="cod">Cash on Delivery</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
              <button
                disabled={checkoutLoading || cartItems.length === 0}
                className="rounded-lg bg-brand-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {checkoutLoading ? "Processing..." : "Checkout"}
              </button>
            </form>
            {checkoutError ? <p className="mt-2 text-sm text-red-600">{checkoutError}</p> : null}
            {checkoutMessage ? <p className="mt-2 text-sm text-emerald-700">{checkoutMessage}</p> : null}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold">Recent Orders</h3>
          {orderHistory.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No orders placed yet.</p>
          ) : (
            <div className="mt-3 grid gap-3">
              {orderHistory.map((order) => (
                <div key={order.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold">{order.id}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(order.placed_at).toLocaleString()} | {order.customer.payment_method.toUpperCase()}
                  </p>
                  <p className="text-sm text-slate-700">Total: Rs {Number(order.total).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    );
  }

  function SubscriptionPanel({ customerOnly }) {
    return (
      <Section title="Subscriptions">
        {!profile ? (
          <p className="text-sm text-slate-600">Login to manage subscriptions.</p>
        ) : (
          <>
            {profile.role !== "admin" ? (
              <form className="grid gap-3 sm:grid-cols-4" onSubmit={handleCreateSubscription}>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                  value={newSub.product}
                  onChange={(event) =>
                    setNewSub((prev) => ({ ...prev, product: event.target.value }))
                  }
                  required
                >
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="number"
                  min="1"
                  value={newSub.quantity}
                  onChange={(event) =>
                    setNewSub((prev) => ({ ...prev, quantity: event.target.value }))
                  }
                  required
                />
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={newSub.delivery_frequency}
                  onChange={(event) =>
                    setNewSub((prev) => ({ ...prev, delivery_frequency: event.target.value }))
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="alternate_days">Alternate Days</option>
                  <option value="weekly">Weekly</option>
                </select>
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
                  type="date"
                  min={today}
                  value={newSub.start_date}
                  onChange={(event) =>
                    setNewSub((prev) => ({ ...prev, start_date: event.target.value }))
                  }
                  required
                />
                <button
                  disabled={filteredProducts.length === 0 || !newSub.product || subscriptionActionLoading}
                  className="rounded-lg bg-brand-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                >
                  {subscriptionActionLoading ? "Saving..." : "Add Subscription"}
                </button>
              </form>
            ) : (
              <p className="text-sm text-slate-600">
                Admin view of all subscriptions. Creation is customer-only.
              </p>
            )}

            {subscriptionFormError ? (
              <p className="mt-3 text-sm text-red-600">{subscriptionFormError}</p>
            ) : null}
            {subscriptionMessage ? (
              <p className="mt-3 text-sm text-emerald-700">{subscriptionMessage}</p>
            ) : null}
            {subscriptionError ? <p className="mt-2 text-sm text-red-600">{subscriptionError}</p> : null}

            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-slate-600" htmlFor="subscription-status-filter">
                Status
              </label>
              <select
                id="subscription-status-filter"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={subscriptionStatusFilter}
                onChange={(event) => setSubscriptionStatusFilter(event.target.value)}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="canceled">Canceled</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={subscriptionOrdering}
                onChange={(event) => setSubscriptionOrdering(event.target.value)}
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="-start_date">Start Date: Latest</option>
                <option value="start_date">Start Date: Earliest</option>
              </select>
            </div>

            <div className="mt-4 grid gap-3">
              {subscriptionsLoading ? (
                <p className="text-sm text-slate-600">Loading subscriptions...</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-sm text-slate-600">No subscriptions yet.</p>
              ) : (
                subscriptions
                  .filter((sub) => !customerOnly || sub.customer_username === profile.username)
                  .map((subscription) => (
                    <div key={subscription.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="font-semibold">{subscription.product_name}</p>
                      {profile.role === "admin" ? (
                        <p className="text-sm text-slate-600">
                          Customer: {subscription.customer_username}
                        </p>
                      ) : null}
                      <p className="text-sm text-slate-600">
                        Qty: {subscription.quantity} | {subscription.delivery_frequency}
                      </p>
                      <p className="text-sm text-slate-600">Status: {subscription.status}</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={subscriptionActionLoading}
                          onClick={() => handleStatusUpdate(subscription.id, "paused")}
                          className="rounded-md bg-amber-100 px-3 py-1 text-xs text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Pause
                        </button>
                        <button
                          type="button"
                          disabled={subscriptionActionLoading}
                          onClick={() => handleStatusUpdate(subscription.id, "active")}
                          className="rounded-md bg-emerald-100 px-3 py-1 text-xs text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Activate
                        </button>
                        <button
                          type="button"
                          disabled={subscriptionActionLoading}
                          onClick={() => handleStatusUpdate(subscription.id, "canceled")}
                          className="rounded-md bg-rose-100 px-3 py-1 text-xs text-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSubscriptionOffset((prev) =>
                    Math.max(0, prev - subscriptionPageSize)
                  )
                }
                disabled={subscriptionsLoading || subscriptionOffset === 0}
                className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setSubscriptionOffset((prev) => prev + subscriptionPageSize)}
                disabled={subscriptionsLoading || !hasMoreSubscriptions}
                className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
              <span className="text-xs text-slate-500">
                Page {Math.floor(subscriptionOffset / subscriptionPageSize) + 1}
              </span>
            </div>
          </>
        )}
      </Section>
    );
  }

  function AdminPanel() {
    return (
      <Section title="Admin Management">
        <p className="text-sm text-slate-600">Create categories and products from the dashboard.</p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <form className="grid gap-3 rounded-xl border border-slate-200 p-4" onSubmit={handleCreateCategory}>
            <h3 className="font-semibold">New Category</h3>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Category name"
              value={newCategory.name}
              onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <textarea
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Description"
              value={newCategory.description}
              onChange={(event) =>
                setNewCategory((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newCategory.is_active}
                onChange={(event) =>
                  setNewCategory((prev) => ({ ...prev, is_active: event.target.checked }))
                }
              />
              Active
            </label>
            <button
              disabled={adminActionLoading}
              className="rounded-lg bg-brand-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adminActionLoading ? "Creating..." : "Create Category"}
            </button>
          </form>

          <form className="grid gap-3 rounded-xl border border-slate-200 p-4" onSubmit={handleCreateProduct}>
            <h3 className="font-semibold">New Product</h3>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newProduct.category}
              onChange={(event) =>
                setNewProduct((prev) => ({ ...prev, category: event.target.value }))
              }
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Product name"
              value={newProduct.name}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <textarea
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Description"
              value={newProduct.description}
              onChange={(event) =>
                setNewProduct((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={3}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Price"
                type="number"
                min="0"
                step="0.01"
                value={newProduct.price}
                onChange={(event) => setNewProduct((prev) => ({ ...prev, price: event.target.value }))}
                required
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Stock quantity"
                type="number"
                min="0"
                value={newProduct.stock_quantity}
                onChange={(event) =>
                  setNewProduct((prev) => ({ ...prev, stock_quantity: event.target.value }))
                }
                required
              />
            </div>
            <label className="text-sm text-slate-700">
              Product image
              <input
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setNewProduct((prev) => ({ ...prev, image: event.target.files?.[0] || null }))
                }
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newProduct.is_active}
                onChange={(event) =>
                  setNewProduct((prev) => ({ ...prev, is_active: event.target.checked }))
                }
              />
              Active
            </label>
            <button
              disabled={!categories.length || adminActionLoading}
              className="rounded-lg bg-brand-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adminActionLoading ? "Creating..." : "Create Product"}
            </button>
          </form>
        </div>
        {adminMessage ? <p className="mt-4 text-sm text-emerald-700">{adminMessage}</p> : null}
        {adminError ? <p className="mt-2 text-sm text-red-600">{adminError}</p> : null}

        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold">Manage Categories</h3>
          <div className="mt-3 grid gap-2">
            {categoriesLoading ? (
              <p className="text-sm text-slate-600">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-slate-600">No active categories.</p>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2"
                >
                  <p className="text-sm font-medium">{category.name}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRenameCategory(category)}
                      disabled={adminActionLoading}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-800 disabled:opacity-50"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivateCategory(category.id)}
                      disabled={adminActionLoading}
                      className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-800 disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold">Manage Products</h3>
          <div className="mt-3 grid gap-2">
            {productsLoading ? (
              <p className="text-sm text-slate-600">Loading products...</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-slate-600">No active products.</p>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm font-medium">
                    {product.name} | Rs {product.price}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditProduct(product)}
                      disabled={adminActionLoading}
                      className="rounded-md bg-indigo-100 px-2 py-1 text-xs text-indigo-800 disabled:opacity-50"
                    >
                      Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateProductPrice(product)}
                      disabled={adminActionLoading}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-800 disabled:opacity-50"
                    >
                      Update Price
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeactivateProduct(product.id)}
                      disabled={adminActionLoading}
                      className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-800 disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Customers</h3>
            <div className="flex items-center gap-2">
              <input
                className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                placeholder="Search customers"
                value={customerQuery}
                onChange={(event) => setCustomerQuery(event.target.value)}
              />
              <button
                type="button"
                onClick={() => loadCustomers(customerQuery)}
                disabled={customersLoading}
                className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {customersLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          {customersError ? <p className="text-sm text-red-600">{customersError}</p> : null}
          {customersLoading ? (
            <p className="text-sm text-slate-600">Loading customers...</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-slate-600">No customers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Username</th>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">City</th>
                    <th className="px-2 py-2">Phone</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-t border-slate-100">
                      <td className="px-2 py-2">{customer.username}</td>
                      <td className="px-2 py-2">{customer.email || "N/A"}</td>
                      <td className="px-2 py-2">{customer.city || "N/A"}</td>
                      <td className="px-2 py-2">{customer.phone || "N/A"}</td>
                      <td className="px-2 py-2">
                        {customer.is_active ? "Active" : "Inactive"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>
    );
  }

  function TopNav() {
    return (
      <nav className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">Milkman</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-md bg-slate-100 px-3 py-1 text-slate-800" to="/login">
            Login
          </Link>
          <Link className="rounded-md bg-slate-100 px-3 py-1 text-slate-800" to="/products">
            Products
          </Link>
          <Link className="rounded-md bg-slate-100 px-3 py-1 text-slate-800" to="/billing">
            Billing ({cartCount})
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white text-slate-900">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {TopNav()}

        <Routes>
          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />
          <Route
            path="/login"
            element={<div className="mx-auto max-w-2xl">{AuthPanel()}</div>}
          />
          <Route
            path="/products"
            element={
              authBootstrapLoading ? (
                <Section title="Session">
                  <p className="text-sm text-slate-600">Validating session...</p>
                </Section>
              ) : isAuthenticated ? (
                <div className="grid gap-6">
                  {ProductPanel()}
                  {profile?.role === "admin" ? AdminPanel() : null}
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/billing"
            element={
              authBootstrapLoading ? (
                <Section title="Session">
                  <p className="text-sm text-slate-600">Validating session...</p>
                </Section>
              ) : isAuthenticated ? (
                <div className="grid gap-6">{BillingPanel()}</div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </section>
    </main>
  );
}
