const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const BASE_URL = `${API_BASE_URL}/api/watchlist`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in again to manage your watchlist.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const parseResponse = async (response, fallbackMessage) => {
  const result = await response.json();

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error(result.message || fallbackMessage);
  }

  return result.data;
};

export const getWatchlist = async () => {
  const response = await fetch(BASE_URL, {
    headers: getAuthHeaders(),
  });

  return parseResponse(response, "Failed to load watchlist");
};

export const addToWatchlist = async (stock) => {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(stock),
  });

  return parseResponse(response, "Failed to add stock to watchlist");
};

export const removeFromWatchlist = async (symbol) => {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(symbol)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  return parseResponse(response, "Failed to remove stock from watchlist");
};
