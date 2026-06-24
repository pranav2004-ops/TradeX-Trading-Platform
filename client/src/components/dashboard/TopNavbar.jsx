import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  LogOut,
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  Check,
  ExternalLink,
  Menu,
} from "lucide-react";

import StockSearchDropdown from "./StockSearchDropdown";
import { searchStocks } from "../../api/stockApi";
import { useNotifications } from "../../context/NotificationContext";
import useMarketStatus, { MARKET_STATES } from "../../hooks/useMarketStatus";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
};

const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : { name: "User", email: "" };
  } catch {
    return { name: "User", email: "" };
  }
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

/* ─────────────────────────────────────────────
   Notification helpers
───────────────────────────────────────────── */
const TYPE_ICON = {
  success: { icon: CheckCircle, color: "text-emerald-400" },
  error:   { icon: XCircle,     color: "text-red-400" },
  warning: { icon: AlertTriangle, color: "text-amber-400" },
  info:    { icon: Info,        color: "text-[#2f6fed]" },
};

const formatRelativeTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/* ─────────────────────────────────────────────
   Notifications dropdown
───────────────────────────────────────────── */
const NotificationsDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const recent = notifications.slice(0, 5);

  const handleItemClick = (id) => {
    markAsRead(id);
  };

  const handleViewAll = () => {
    onClose();
    navigate("/notifications");
  };

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 origin-top-right rounded-lg border border-[#1e2530] bg-[#11161f] shadow-2xl"
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e2530] px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#f5f7fa]">Notifications</p>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-[#2f6fed]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#2f6fed]">
              {unreadCount}
            </span>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs text-[#8a93a3] transition hover:text-[#f5f7fa]"
          >
            <Check size={11} strokeWidth={2} />
            Mark all read
          </button>
        ) : null}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Bell size={24} className="text-[#2a3344]" strokeWidth={1.5} />
            <p className="text-sm text-[#8a93a3]">No notifications yet</p>
          </div>
        ) : (
          recent.map((n) => {
            const cfg = TYPE_ICON[n.type] ?? TYPE_ICON.info;
            const Icon = cfg.icon;

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleItemClick(n.id)}
                className={`flex w-full items-start gap-3 border-b border-[#1e2530] px-4 py-3 text-left last:border-0 transition hover:bg-[#1e2530] ${
                  !n.read ? "bg-[#2f6fed]/5" : ""
                }`}
              >
                {/* Unread dot */}
                <span
                  className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                    n.read ? "bg-transparent" : "bg-[#2f6fed]"
                  }`}
                />
                <Icon
                  size={13}
                  className={`mt-0.5 flex-shrink-0 ${cfg.color}`}
                  strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-semibold ${n.read ? "text-[#8a93a3]" : "text-[#f5f7fa]"}`}>
                    {n.title}
                  </p>
                  {n.message ? (
                    <p className="mt-0.5 truncate text-xs text-[#4f5867]">
                      {n.message}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[10px] text-[#4f5867]">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1e2530] px-4 py-2.5">
        <button
          type="button"
          onClick={handleViewAll}
          className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-[#2f6fed] transition hover:text-[#4a80ff]"
        >
          View all notifications
          <ExternalLink size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Profile dropdown menu
───────────────────────────────────────────── */
const ProfileMenu = ({ user, initials, onClose }) => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    addNotification({
      type: "info",
      title: "Signed Out",
      message: "You have been logged out of TradeX.",
    });
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-lg border border-[#1e2530] bg-[#11161f] py-1 shadow-2xl"
      role="menu"
      aria-label="User menu"
    >
      {/* User identity header */}
      <div className="flex items-center gap-3 border-b border-[#1e2530] px-4 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2f6fed]/20 border border-[#2f6fed]/30 text-[13px] font-semibold text-[#2f6fed]">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#f5f7fa]">
            {user.name}
          </p>
          <p className="truncate text-xs text-[#8a93a3]">{user.email}</p>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => go("/profile")}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#8a93a3] transition-colors hover:bg-[#1e2530] hover:text-[#f5f7fa]"
        >
          <User size={14} strokeWidth={1.8} className="flex-shrink-0" />
          Profile
        </button>

        <button
          type="button"
          role="menuitem"
          onClick={() => go("/settings")}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#8a93a3] transition-colors hover:bg-[#1e2530] hover:text-[#f5f7fa]"
        >
          <Settings size={14} strokeWidth={1.8} className="flex-shrink-0" />
          Settings
        </button>
      </div>

      {/* Divider + Logout */}
      <div className="border-t border-[#1e2530] py-1">
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-[#1e2530]"
        >
          <LogOut size={14} strokeWidth={1.8} className="flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   TopNavbar
───────────────────────────────────────────── */
const TopNavbar = ({ onStockSelect, onMenuClick }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const menuRef = useRef(null);
  const bellRef = useRef(null);
  const searchRef = useRef(null);
  const skipSearchRef = useRef(false);
  const user = getUserFromStorage();
  const initials = getInitials(user.name);
  const { unreadCount } = useNotifications();
  const { state: marketState, isOpen: isMarketOpen } = useMarketStatus();

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close search results on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close both panels on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setBellOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Stock search with debounce
  useEffect(() => {
    if (query.trim().length < 2) return;

    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await searchStocks(query);
        setResults(response?.data?.bestMatches || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleQueryChange = useCallback((e) => {
    const nextQuery = e.target.value;
    setQuery(nextQuery);
    if (nextQuery.trim().length < 2) setResults([]);
  }, []);

  const handleSelectStock = useCallback(
    (stock) => {
      skipSearchRef.current = true;
      setQuery(stock["1. symbol"]);
      setResults([]);
      if (onStockSelect) onStockSelect(stock);
    },
    [onStockSelect]
  );

  const handleBellClick = () => {
    setBellOpen((prev) => !prev);
    setMenuOpen(false); // close profile if open
  };

  const handleProfileClick = () => {
    setMenuOpen((prev) => !prev);
    setBellOpen(false); // close bell if open
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  // Badge display: cap at 99
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <header className="h-14 bg-[#0d1117] border-b border-[#1e2530] flex items-center px-4 md:px-5 gap-3 md:gap-4 sticky top-0 z-10">
      {/* Hamburger Menu Button */}
      <button
        type="button"
        onClick={onMenuClick}
        className="md:hidden p-1.5 rounded-md text-[#8a93a3] hover:bg-[#1e2530] hover:text-[#f5f7fa] transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Greeting + time */}
      <div className="flex-shrink-0">
        <p className="text-[#f5f7fa] text-sm font-medium leading-tight">
          Good {getGreeting()},{" "}
          <span className="text-[#2f6fed]">{user.name.split(" ")[0]}</span>
        </p>
        <p className="text-[#8a93a3] text-[11px] hidden sm:block">
          {dateStr} · {timeStr} IST
        </p>
      </div>

      {/* Search bar */}
      <div ref={searchRef} className="flex-1 max-w-sm mx-auto relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a93a3]"
        />
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search stocks, indices..."
          className="w-full bg-[#11161f] border border-[#1e2530] rounded-md pl-9 pr-10 py-2 text-sm text-[#f5f7fa] placeholder-[#8a93a3] focus:outline-none focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20 transition-colors"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8a93a3] bg-[#1e2530] border border-[#2a3344] rounded px-1.5 py-0.5 font-mono">
          /
        </kbd>
        <StockSearchDropdown
          results={results}
          loading={loading}
          onSelect={handleSelectStock}
        />
      </div>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-3">
        {/* Market status */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#8a93a3]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isMarketOpen
                ? "bg-emerald-400 animate-pulse"
                : marketState === MARKET_STATES.CLOSED
                ? "bg-red-400"
                : "bg-amber-400"
            }`}
          />
          <span>{marketState}</span>
        </div>

        {/* ── Bell / notifications ── */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            id="notifications-button"
            aria-haspopup="true"
            aria-expanded={bellOpen}
            onClick={handleBellClick}
            className="relative w-8 h-8 flex items-center justify-center rounded-md hover:bg-[#1e2530] transition-colors"
          >
            <Bell size={15} className="text-[#8a93a3]" strokeWidth={1.8} />

            {/* Unread badge */}
            {unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2f6fed] px-1 text-[9px] font-bold text-white leading-none">
                {badgeLabel}
              </span>
            ) : null}
          </button>

          {bellOpen ? (
            <NotificationsDropdown onClose={() => setBellOpen(false)} />
          ) : null}
        </div>

        {/* ── Profile avatar + dropdown ── */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            id="profile-menu-button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            onClick={handleProfileClick}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-[#1e2530] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[#2f6fed]/20 border border-[#2f6fed]/30 flex items-center justify-center text-[11px] font-semibold text-[#2f6fed]">
              {initials}
            </div>
            <ChevronDown
              size={12}
              className={`text-[#8a93a3] transition-transform duration-150 ${
                menuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {menuOpen ? (
            <ProfileMenu
              user={user}
              initials={initials}
              onClose={() => setMenuOpen(false)}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
