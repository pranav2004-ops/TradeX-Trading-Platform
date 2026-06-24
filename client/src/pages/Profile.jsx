import { useCallback, useEffect, useState } from "react";
import {
  User,
  Mail,
  Calendar,
  Briefcase,
  Wallet,
  TrendingUp,
  IndianRupee,
  Shield,
  Clock,
} from "lucide-react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { getTradeSummary } from "../api/tradeApi";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const fmt = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const decodeJwt = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

const formatDate = (ts) => {
  if (!ts) return "Unknown";
  return new Date(ts * 1000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (ts) => {
  if (!ts) return "Unknown";
  return new Date(ts * 1000).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
const InfoCard = ({ icon: Icon, label, value, note, iconColor = "text-[#2f6fed]" }) => (
  <div className="flex items-start gap-3 rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 py-4">
    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#1e2530]">
      <Icon size={14} className={iconColor} strokeWidth={1.8} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-[#f5f7fa]">
        {value}
      </p>
      {note ? <p className="mt-0.5 text-xs text-[#4f5867]">{note}</p> : null}
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, iconColor = "text-[#2f6fed]" }) => (
  <div className="flex flex-col gap-2 rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 py-4">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
        {label}
      </p>
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1e2530]">
        <Icon size={12} className={iconColor} strokeWidth={1.8} />
      </div>
    </div>
    <p className="text-xl font-semibold text-[#f5f7fa]">{value}</p>
  </div>
);

/* ─────────────────────────────────────────────
   Profile page
───────────────────────────────────────────── */
const Profile = () => {
  const user = getUserFromStorage();
  const jwt = decodeJwt();
  const initials = getInitials(user?.name);

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError("");
      const data = await getTradeSummary();
      setSummary(data);
    } catch (err) {
      setSummaryError(err.message || "Failed to load portfolio summary.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadSummary, 0);
    return () => clearTimeout(t);
  }, [loadSummary]);

  const cash = Number(summary?.cash ?? 0);
  const invested = Number(summary?.investedAmount ?? 0);
  const portfolioValue = cash + invested;
  const holdingsCount = Number(summary?.holdingsCount ?? 0);
  const totalPositions = Number(summary?.totalPositions ?? 0);

  const tokenValid = jwt?.exp ? new Date(jwt.exp * 1000) > new Date() : false;

  return (
    <DashboardLayout>
      <div className="flex max-w-[900px] flex-col gap-5">
        {/* Page header */}
        <header className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#2f6fed]">
            Profile
          </p>
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">
            My Account
          </h1>
          <p className="text-sm text-[#8a93a3]">
            Account information, portfolio snapshot, and session details.
          </p>
        </header>

        {/* Avatar + identity banner */}
        <section className="flex flex-col items-center gap-4 rounded-lg border border-[#1e2530] bg-[#11161f] px-5 py-8 sm:flex-row sm:items-start">
          {/* Large avatar */}
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#2f6fed]/20 border-2 border-[#2f6fed]/40 text-2xl font-bold text-[#2f6fed]">
            {initials}
          </div>

          <div className="flex flex-col gap-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold text-[#f5f7fa]">
              {user?.name ?? "—"}
            </h2>
            <p className="text-sm text-[#8a93a3]">{user?.email ?? "—"}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                Paper Trading
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  tokenValid
                    ? "bg-[#2f6fed]/10 text-[#2f6fed]"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {tokenValid ? "Session Active" : "Session Expired"}
              </span>
            </div>
          </div>
        </section>

        {/* Account details grid */}
        <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            Account Details
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={User}
              label="Full Name"
              value={user?.name ?? "—"}
            />
            <InfoCard
              icon={Mail}
              label="Email Address"
              value={user?.email ?? "—"}
            />
            <InfoCard
              icon={Briefcase}
              label="Account Type"
              value="Paper Trading"
              note="Simulated trading with virtual capital"
              iconColor="text-emerald-400"
            />
            <InfoCard
              icon={Calendar}
              label="Member Since"
              value={formatDate(jwt?.iat)}
              note="Date your account was first created"
            />
          </div>
        </section>

        {/* Portfolio snapshot */}
        <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            Portfolio Snapshot
          </p>

          {summaryError ? (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {summaryError}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={Briefcase}
                label="Portfolio Value"
                value={
                  summaryLoading ? "—" : `₹${fmt(portfolioValue)}`
                }
              />
              <StatCard
                icon={Wallet}
                label="Available Cash"
                value={summaryLoading ? "—" : `₹${fmt(cash)}`}
                iconColor="text-emerald-400"
              />
              <StatCard
                icon={IndianRupee}
                label="Invested"
                value={summaryLoading ? "—" : `₹${fmt(invested)}`}
                iconColor="text-[#8a93a3]"
              />
              <StatCard
                icon={TrendingUp}
                label="Holdings"
                value={
                  summaryLoading
                    ? "—"
                    : `${holdingsCount} stock${holdingsCount !== 1 ? "s" : ""}`
                }
                iconColor="text-[#2f6fed]"
              />
            </div>
          )}

          {!summaryLoading && totalPositions > 0 ? (
            <p className="mt-3 text-xs text-[#4f5867]">
              {totalPositions} total trade{totalPositions !== 1 ? "s" : ""} executed since account creation.
            </p>
          ) : null}
        </section>

        {/* Session & security information */}
        <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            Session Information
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={Shield}
              label="Authentication"
              value={tokenValid ? "JWT Active" : "Session Expired"}
              note={tokenValid ? "You are currently signed in" : "Please sign in again"}
              iconColor={tokenValid ? "text-emerald-400" : "text-red-400"}
            />
            <InfoCard
              icon={Clock}
              label="Session Expires"
              value={formatDateTime(jwt?.exp)}
              note="JWT tokens automatically expire after 7 days"
            />
            <InfoCard
              icon={Calendar}
              label="Token Issued"
              value={formatDateTime(jwt?.iat)}
              note="When your current session was created"
            />
            <InfoCard
              icon={Shield}
              label="Data Source"
              value="Finnhubb"
              note="Real-time market quotes and sector data"
              iconColor="text-[#8a93a3]"
            />
          </div>
        </section>

        {/* Footer note */}
        <p className="pb-2 text-center text-xs text-[#4f5867]">
          Profile information is read-only. To change your password, visit{" "}
          <a href="/settings" className="text-[#2f6fed] hover:underline">
            Settings
          </a>
          .
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
