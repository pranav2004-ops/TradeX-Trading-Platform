const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const BASE_URL = `${API_BASE_URL}/api/analytics`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in again.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const getPortfolioPerformance = async () => {
  const response = await fetch(`${BASE_URL}/performance`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error(result.message || "Failed to load portfolio performance");
  }

  return result.data;
};

export const getAdvancedAnalytics = async () => {
  const response = await fetch(`${BASE_URL}/advanced`, {
    headers: getAuthHeaders(),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error(result.message || "Failed to load advanced portfolio analytics");
  }

  return result.data;
};
