const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const API_URL = `${API_BASE_URL}/api/auth`;

 export async function registerUser(userData) {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  console.log("REGISTER RESPONSE:", data);

  if (!response.ok) {
    if (data && Array.isArray(data.errors)) {
      throw new Error(data.errors.join("\n"));
    }
    throw new Error(data.message || "Registration failed");
  }

  return data;
}

export async function loginUser(userData) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}
