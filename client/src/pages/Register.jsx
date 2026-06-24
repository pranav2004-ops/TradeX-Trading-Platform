import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { registerUser } from "../api/auth";
import { hasAuthToken } from "../utils/auth";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (hasAuthToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setError("");
    setSuccess("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await registerUser(formData);

      if (result.success) {
        setSuccess("Account created successfully! Redirecting to login…");
        setFormData({ name: "", email: "", password: "" });
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      } else {
        setError(result.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("fetch") || err.message.includes("NetworkError") || err.message.includes("load failed"))) {
        setError("Unable to connect to the server. Please try again.");
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background glow */}
      <div className="absolute h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

      {/* Register card */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2">
          <span className="text-2xl font-bold tracking-wide text-white">
            TradeX
          </span>
          <span className="h-2 w-2 rounded-full bg-blue-500" />
        </div>

        <h1 className="text-3xl font-bold text-white">Create Account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign up to start paper trading on TradeX.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Full Name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
          />

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
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
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 whitespace-pre-line"
            >
              {error}
            </div>
          ) : null}

          {/* Success message */}
          {success ? (
            <div
              role="status"
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
            >
              {success}
            </div>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-500 hover:text-blue-400"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
