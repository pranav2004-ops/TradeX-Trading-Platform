const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const BASE_URL = `${API_BASE_URL}/api/trades`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in again before placing an order.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const handle401 = (status) => {
  if (status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
};

const submitTrade = async (endpoint, tradeData) => {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(tradeData),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handle401(response.status);
    throw new Error(result.message || "Failed to submit trade");
  }

  return result.data;
};

const fetchTradeData = async (endpoint) => {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handle401(response.status);
    throw new Error(result.message || "Failed to load trade data");
  }

  return result.data;
};

export const buyStock = (tradeData) => submitTrade("buy", tradeData);

export const sellStock = (tradeData) => submitTrade("sell", tradeData);

export const placeLimitOrder = (tradeData) => submitTrade("limit", tradeData);

export const cancelOrder = async (orderId) => {
  const response = await fetch(`${BASE_URL}/${orderId}/cancel`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handle401(response.status);
    throw new Error(result.message || "Failed to cancel order");
  }

  return result.data;
};

export const getPendingOrders = () => fetchTradeData("pending");

export const getTradeSummary = () => fetchTradeData("summary");

export const getHoldings = () => fetchTradeData("holdings");

export const getTradeHistory = () => fetchTradeData("history");
