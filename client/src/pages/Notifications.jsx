import { useState } from "react";
import {
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  Bell,
  Check,
  Trash2,
} from "lucide-react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useNotifications } from "../context/NotificationContext";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const TYPE_CONFIG = {
  success: {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  error: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  info: {
    icon: Info,
    color: "text-[#2f6fed]",
    bg: "bg-[#2f6fed]/10",
    border: "border-[#2f6fed]/20",
  },
};

const formatRelativeTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const formatFullDate = (isoString) => {
  try {
    return new Date(isoString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

/* ─────────────────────────────────────────────
   Notification row
───────────────────────────────────────────── */
const NotificationRow = ({ notification, onMarkRead }) => {
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div
      className={`flex items-start gap-4 rounded-lg border px-4 py-4 transition ${
        notification.read
          ? "border-[#1e2530] bg-[#0d1117]"
          : `${cfg.border} ${cfg.bg}`
      }`}
    >
      {/* Type icon */}
      <div className="mt-0.5 flex-shrink-0">
        <Icon size={16} className={cfg.color} strokeWidth={1.8} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-semibold ${
              notification.read ? "text-[#8a93a3]" : "text-[#f5f7fa]"
            }`}
          >
            {notification.title}
          </p>
          <span className="flex-shrink-0 text-xs text-[#4f5867]">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        {notification.message ? (
          <p className="mt-0.5 text-sm text-[#8a93a3]">{notification.message}</p>
        ) : null}
        <p className="mt-1 text-xs text-[#4f5867]">
          {formatFullDate(notification.createdAt)}
        </p>
      </div>

      {/* Mark as read button (only when unread) */}
      {!notification.read ? (
        <button
          type="button"
          title="Mark as read"
          onClick={() => onMarkRead(notification.id)}
          className="mt-0.5 flex-shrink-0 rounded-md p-1 text-[#4f5867] transition hover:bg-[#1e2530] hover:text-[#f5f7fa]"
        >
          <Check size={13} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Filter tabs
───────────────────────────────────────────── */
const TABS = ["All", "Unread", "Read"];

const FilterTab = ({ label, active, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "bg-[#2f6fed] text-white"
        : "text-[#8a93a3] hover:bg-[#1e2530] hover:text-[#f5f7fa]"
    }`}
  >
    {label}
    {count != null ? (
      <span
        className={`rounded-full px-1.5 text-[11px] font-semibold ${
          active ? "bg-white/20 text-white" : "bg-[#1e2530] text-[#8a93a3]"
        }`}
      >
        {count}
      </span>
    ) : null}
  </button>
);

/* ─────────────────────────────────────────────
   Notifications page
───────────────────────────────────────────── */
const Notifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } =
    useNotifications();

  const [activeTab, setActiveTab] = useState("All");

  const filtered = notifications.filter((n) => {
    if (activeTab === "Unread") return !n.read;
    if (activeTab === "Read") return n.read;
    return true;
  });

  const readCount = notifications.length - unreadCount;

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    if (window.confirm("Clear all notifications? This cannot be undone.")) {
      clearNotifications();
    }
  };

  return (
    <DashboardLayout>
      <div className="flex max-w-[860px] flex-col gap-5">
        {/* Page header */}
        <header className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#2f6fed]">
            Notifications
          </p>
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">
            Activity Feed
          </h1>
          <p className="text-sm text-[#8a93a3]">
            All platform events — trades, watchlist changes, security actions, and more.
          </p>
        </header>

        {/* Controls bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5">
            {TABS.map((tab) => (
              <FilterTab
                key={tab}
                label={tab}
                active={activeTab === tab}
                count={
                  tab === "All"
                    ? notifications.length
                    : tab === "Unread"
                    ? unreadCount
                    : readCount
                }
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 rounded-md border border-[#1e2530] bg-[#0d1117] px-3 py-1.5 text-sm font-medium text-[#8a93a3] transition hover:text-[#f5f7fa]"
              >
                <Check size={13} strokeWidth={2} />
                Mark all read
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-[#1e2530] bg-[#0d1117] px-3 py-1.5 text-sm font-medium text-[#8a93a3] transition hover:border-red-500/30 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={13} strokeWidth={1.8} />
              Clear all
            </button>
          </div>
        </div>

        {/* Notification list */}
        {filtered.length === 0 ? (
          <section className="flex flex-col items-center gap-3 rounded-lg border border-[#1e2530] bg-[#11161f] px-6 py-16">
            <Bell size={32} className="text-[#2a3344]" strokeWidth={1.5} />
            <p className="text-sm font-medium text-[#f5f7fa]">
              {activeTab === "Unread"
                ? "No unread notifications"
                : activeTab === "Read"
                ? "No read notifications"
                : "No notifications yet"}
            </p>
            <p className="text-xs text-[#4f5867]">
              {activeTab === "All"
                ? "Notifications appear here when you trade, update your watchlist, or take security actions."
                : "Switch to 'All' to see everything."}
            </p>
          </section>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((n) => (
              <NotificationRow key={n.id} notification={n} onMarkRead={markAsRead} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
