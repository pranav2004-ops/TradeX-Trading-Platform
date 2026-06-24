const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const BASE = `${API_BASE_URL}/api/alerts`;

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

export const getAlerts = async () => {
  const res = await fetch(BASE, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to fetch alerts");
  if (!data.success) throw new Error(data.message || "Failed to fetch alerts");
  return data.data;
};

export const createAlert = async ({ symbol, targetPrice, condition }) => {
  const res = await fetch(BASE, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ symbol, targetPrice, condition }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create alert");
  if (!data.success) throw new Error(data.message || "Failed to create alert");
  return data.data;
};

export const markAlertTriggered = async (id) => {
  const res = await fetch(`${BASE}/${id}/trigger`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to mark alert");
  if (!data.success) throw new Error(data.message || "Failed to mark alert");
  return data.data;
};

export const deleteAlert = async (id) => {
  const res = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete alert");
  if (!data.success) throw new Error(data.message || "Failed to delete alert");
  return data.data;
};
