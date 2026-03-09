const ORDERS_STORAGE_KEY = "milkman_order_history";
const ORDERS_UPDATED_EVENT = "milkman:orders-updated";

export function getStoredOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredOrders(orders) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent(ORDERS_UPDATED_EVENT));
}

export function subscribeToStoredOrders(callback) {
  const handleStorage = () => callback(getStoredOrders());
  window.addEventListener("storage", handleStorage);
  window.addEventListener(ORDERS_UPDATED_EVENT, handleStorage);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ORDERS_UPDATED_EVENT, handleStorage);
  };
}

export { ORDERS_STORAGE_KEY };
