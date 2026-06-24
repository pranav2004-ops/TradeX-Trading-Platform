const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const BASE_URL = `${API_BASE_URL}/api/auth`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Session expired. Please log in again.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const changePassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const response = await fetch(`${BASE_URL}/change-password`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    if (response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    throw new Error(result.message || "Failed to change password.");
  }

  return result;
};
