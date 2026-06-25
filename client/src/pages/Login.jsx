import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { loginUser } from "../api/auth";
import { hasAuthToken } from "../utils/auth";
import { useNotifications } from "../context/NotificationContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectMessage = location.state?.message ?? "";
  const { addNotification } = useNotifications();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasAuthToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await loginUser(formData);

      if (result.success) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.user));
        addNotification({
          type: "success",
          title: "Welcome back!",
          message: `Signed in as ${result.user?.name ?? result.user?.email}.`,
        });
        navigate("/dashboard", { replace: true });
      } else {
        setError(result.message || "Login failed. Please try again.");
      }
    }  catch (err) {
  const message =
    err?.response?.data?.message ||
    err?.message ||
    "Unable to connect to the server. Please try again.";

  if (
    message.toLowerCase().includes("user not found") ||
    message.toLowerCase().includes("account not found")
  ) {
    setError("Account not found. Please register first.");
  } else {
    setError(message);
  }
}
     finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background glow */}
      <div className="absolute h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

      {/* Login card */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2">
          <span className="text-2xl font-bold tracking-wide text-white">
            TradeX
          </span>
          <span className="h-2 w-2 rounded-full bg-blue-500" />
        </div>

        <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to continue your paper trading journey.
        </p>

        {/* Redirect message from a previous action (e.g. post-password-change) */}
        {redirectMessage ? (
          <div
            role="status"
            className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
          >
            {redirectMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />

          {/* Error message */}
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-blue-500 hover:text-blue-400"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
