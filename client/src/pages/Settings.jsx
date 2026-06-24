import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  Palette,
  TrendingUp,
  Info,
  LogOut,
  Lock,
  CheckCircle,
  
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import useSettings from "../hooks/useSettings";
import { changePassword } from "../api/accountApi";
import { useNotifications } from "../context/NotificationContext";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getMemberSince = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "Unknown";
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.iat) return "Unknown";
    return new Date(payload.iat * 1000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Unknown";
  }
};

const getTokenExpiry = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return null;
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
};

const formatExpiry = (date) => {
  if (!date) return "Unknown";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isTokenValid = (date) => date && date > new Date();

/* ─────────────────────────────────────────────
   Reusable layout primitives
───────────────────────────────────────────── */
const SectionCard = ({ icon: Icon, title, children }) => (
  <section className="rounded-lg border border-[#1e2530] bg-[#11161f]">
    <div className="flex items-center gap-3 border-b border-[#1e2530] px-5 py-4">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#1e2530]">
        <Icon size={15} className="text-[#2f6fed]" strokeWidth={1.8} />
      </div>
      <h2 className="text-sm font-semibold text-[#f5f7fa]">{title}</h2>
    </div>
    <div className="px-5 py-4">{children}</div>
  </section>
);

const FieldRow = ({ label, value, note }) => (
  <div className="flex flex-col gap-0.5 border-b border-[#1e2530] py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-medium text-[#f5f7fa]">{label}</p>
      {note ? <p className="text-xs text-[#8a93a3]">{note}</p> : null}
    </div>
    <p className="text-sm text-[#8a93a3] sm:text-right">{value}</p>
  </div>
);

const ToggleRow = ({ label, note, checked, onChange }) => (
  <div className="flex items-center justify-between border-b border-[#1e2530] py-3 last:border-0">
    <div>
      <p className="text-sm font-medium text-[#f5f7fa]">{label}</p>
      {note ? <p className="mt-0.5 text-xs text-[#8a93a3]">{note}</p> : null}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#2f6fed]/40 ${
        checked ? "bg-[#2f6fed]" : "bg-[#2a3344]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

const NumberInputRow = ({ label, note, value, onChange, min = 1, max = 10000 }) => (
  <div className="flex flex-col gap-2 border-b border-[#1e2530] py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-medium text-[#f5f7fa]">{label}</p>
      {note ? <p className="mt-0.5 text-xs text-[#8a93a3]">{note}</p> : null}
    </div>
    <input
      type="number"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(e) => {
        const v = Math.max(min, Math.min(max, Number(e.target.value)));
        if (Number.isFinite(v)) onChange(v);
      }}
      className="h-8 w-24 rounded-md border border-[#1e2530] bg-[#0d1117] px-3 text-sm text-[#f5f7fa] outline-none transition focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20 sm:text-right"
    />
  </div>
);

const SelectRow = ({ label, note, value, options, onChange }) => (
  <div className="flex flex-col gap-2 border-b border-[#1e2530] py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-medium text-[#f5f7fa]">{label}</p>
      {note ? <p className="mt-0.5 text-xs text-[#8a93a3]">{note}</p> : null}
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-[#1e2530] bg-[#0d1117] px-3 text-sm text-[#f5f7fa] outline-none transition focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

 

const ThemeOption = ({ label, isActive, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-1 flex-col items-center gap-2 rounded-lg border px-3 py-3 transition ${
      isActive
        ? "border-[#2f6fed] bg-[#2f6fed]/10"
        : "border-[#1e2530] bg-[#0d1117] hover:border-[#2a3344]"
    } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
  >
    <div
      className={`h-8 w-full rounded-md ${
        label === "Dark" ? "bg-[#0a0e14]" : "bg-slate-100"
      }`}
    />
    <span className="text-xs font-medium text-[#f5f7fa]">{label}</span>
    {isActive ? (
      <CheckCircle size={12} className="text-[#2f6fed]" strokeWidth={2} />
    ) : disabled ? (
      <span className="text-[10px] text-[#4f5867]">Soon</span>
    ) : null}
  </button>
);

/* ─────────────────────────────────────────────
   Password input with show/hide toggle
───────────────────────────────────────────── */
const PasswordInput = ({ id, label, value, onChange, placeholder, disabled }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-[#8a93a3] uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="h-10 w-full rounded-md border border-[#1e2530] bg-[#0d1117] px-3 pr-10 text-sm text-[#f5f7fa] outline-none transition placeholder:text-[#4f5867] focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4f5867] hover:text-[#8a93a3] disabled:pointer-events-none"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={14} strokeWidth={1.8} /> : <Eye size={14} strokeWidth={1.8} />}
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Change Password form (inline in Security card)
───────────────────────────────────────────── */
const ChangePasswordForm = ({ onSuccess }) => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Client-side validation (mirrors server rules)
  const validate = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return "All three fields are required.";
    }
    if (form.newPassword.length < 8) {
      return "New password must be at least 8 characters.";
    }
    if (form.newPassword !== form.confirmPassword) {
      return "New password and confirm password do not match.";
    }
    if (form.currentPassword === form.newPassword) {
      return "New password must be different from your current password.";
    }
    return null;
  };

  const handleChange = (field) => (e) => {
    setError("");
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await changePassword(form);
      // Clear the form before triggering logout so no secrets stay in state
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-[#1e2530] py-4 last:border-0">
      <p className="mb-3 text-sm font-medium text-[#f5f7fa]">Change Password</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PasswordInput
            id="current-password"
            label="Current Password"
            value={form.currentPassword}
            onChange={handleChange("currentPassword")}
            placeholder="Your current password"
            disabled={loading}
          />
          <PasswordInput
            id="new-password"
            label="New Password"
            value={form.newPassword}
            onChange={handleChange("newPassword")}
            placeholder="At least 8 characters"
            disabled={loading}
          />
          <PasswordInput
            id="confirm-password"
            label="Confirm New Password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            placeholder="Repeat new password"
            disabled={loading}
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <p className="text-xs text-[#4f5867]">
            You will be signed out after a successful change.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="flex h-9 items-center gap-2 rounded-md bg-[#2f6fed] px-4 text-sm font-semibold text-white transition hover:bg-[#2563d4] disabled:cursor-not-allowed disabled:bg-[#1e2530] disabled:text-[#4f5867]"
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
const Settings = () => {
  const navigate = useNavigate();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { addNotification } = useNotifications();
  const user = getUserFromStorage();
  const tokenExpiry = getTokenExpiry();
  const tokenValid = isTokenValid(tokenExpiry);

  const handleLogout = () => {
    addNotification({
      type: "info",
      title: "Signed Out",
      message: "You have been logged out of TradeX.",
    });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handlePasswordChanged = () => {
    addNotification({
      type: "success",
      title: "Password Changed",
      message: "Your password was successfully updated.",
    });
    // Clear session and redirect — old JWT is still technically valid
    // (stateless), so we must force the user to re-authenticate.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", {
      replace: true,
      state: { message: "Password updated successfully. Please log in again." },
    });
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Reset all settings to their defaults? This cannot be undone."
      )
    ) {
      resetSettings();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex max-w-[900px] flex-col gap-5">
        {/* Page header */}
        <header className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#2f6fed]">
            Settings
          </p>
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">
            Account &amp; Preferences
          </h1>
          <p className="text-sm text-[#8a93a3]">
            Manage your profile, trading preferences, appearance, and security.
          </p>
        </header>

        {/* ── Profile ─────────────────────────────── */}
        <SectionCard icon={User} title="Profile">
          <FieldRow label="Full Name" value={user?.name ?? "—"} />
          <FieldRow label="Email Address" value={user?.email ?? "—"} />
          <FieldRow
            label="Account Type"
            value="Paper Trading"
            note="Simulated trading with virtual capital"
          />
          <FieldRow
            label="Member Since"
            value={getMemberSince()}
            note="Derived from your first JWT"
          />
        </SectionCard>

        {/* ── Trading preferences ──────────────────── */}
        <SectionCard icon={TrendingUp} title="Trading Preferences">
          <NumberInputRow
            label="Default Order Quantity"
            note="Pre-fills the quantity field when placing an order"
            value={settings.defaultQuantity}
            onChange={(v) => updateSetting("defaultQuantity", v)}
            min={1}
            max={100000}
          />
          <SelectRow
            label="Default Watchlist View"
            note="How your watchlist is displayed on the Dashboard"
            value={settings.defaultWatchlistView}
            options={[
              { value: "list", label: "Standard List" },
              { value: "compact", label: "Compact List" },
            ]}
            onChange={(v) => updateSetting("defaultWatchlistView", v)}
          />
          <ToggleRow
            label="Confirm Before Sell"
            note="Show an extra confirmation step before executing a SELL order"
            checked={settings.confirmBeforeSell}
            onChange={(v) => updateSetting("confirmBeforeSell", v)}
          />
          <ToggleRow
            label="Auto Refresh Quotes"
            note="Automatically poll live prices every 20 seconds"
            checked={settings.autoRefreshEnabled}
            onChange={(v) => updateSetting("autoRefreshEnabled", v)}
          />
        </SectionCard>

        {/* ── Appearance ──────────────────────────── */}
        <SectionCard icon={Palette} title="Appearance">
          <div className="border-b border-[#1e2530] pb-3">
            <p className="mb-3 text-sm font-medium text-[#f5f7fa]">Theme</p>
            <div className="flex gap-3">
              <ThemeOption
                label="Dark"
                isActive={settings.theme === "dark"}
                onClick={() => updateSetting("theme", "dark")}
              />
            </div>
          </div>
          <ToggleRow
            label="Compact Layout"
            note="Reduce vertical spacing throughout the interface"
            checked={settings.compactLayout}
            onChange={(v) => updateSetting("compactLayout", v)}
          />
        </SectionCard>

        {/* ── Security ────────────────────────────── */}
        <SectionCard icon={Shield} title="Security">
          {/* Auth status */}
          <div className="flex items-center justify-between border-b border-[#1e2530] py-3">
            <div>
              <p className="text-sm font-medium text-[#f5f7fa]">
                Authentication Status
              </p>
              <p className="mt-0.5 text-xs text-[#8a93a3]">
                Session expires {formatExpiry(tokenExpiry)}
              </p>
            </div>
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                tokenValid
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tokenValid ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
              />
              {tokenValid ? "JWT Active" : "Expired"}
            </span>
          </div>

          {/* Change Password — live form */}
          <ChangePasswordForm onSuccess={handlePasswordChanged} />

          {/* Logout */}
          <div className="pt-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/20"
            >
              <LogOut size={14} strokeWidth={1.8} />
              Sign Out
            </button>
          </div>
        </SectionCard>

        {/* ── System Information ───────────────────── */}
        <SectionCard icon={Info} title="System Information">
          <FieldRow label="TradeX Version" value="1.0.0" />
          <FieldRow
            label="Environment"
            value={import.meta.env.MODE ?? "development"}
          />
          <FieldRow
            label="API Base URL"
            value={
              import.meta.env.VITE_API_BASE_URL || "(relative)"
            }
          />
          <FieldRow
            label="Quote Refresh Interval"
            value="20 seconds"
            note="Controlled by QuoteContext"
          />
          <FieldRow
            label="Data Source"
            value="finnhub.io"
            note="Real-time stock quotes and sector data"
          />
        </SectionCard>

        {/* ── Danger zone ─────────────────────────── */}
        <section className="rounded-lg border border-[#2a1a1a] bg-[#11161f] px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#f5f7fa]">
                Reset Settings
              </p>
              <p className="mt-0.5 text-xs text-[#8a93a3]">
                Restore all preferences to their default values. Your account
                data is not affected.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="flex flex-shrink-0 items-center gap-2 rounded-md border border-[#2a3344] bg-[#0d1117] px-4 py-2 text-sm font-medium text-[#8a93a3] transition hover:border-red-500/30 hover:text-red-400"
            >
              <RotateCcw size={13} strokeWidth={1.8} />
              Reset to Defaults
            </button>
          </div>
        </section>

        {/* persistence note */}
        <p className="pb-2 text-center text-xs text-[#4f5867]">
          <Lock size={10} className="mr-1 inline" strokeWidth={1.8} />
          Preferences are saved locally to this browser only.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
