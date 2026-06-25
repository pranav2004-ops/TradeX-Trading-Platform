import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { showPushNotification, requestNotificationPermission } from "../utils/notificationUtils";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const STORAGE_KEY = "tradex_notifications";
const MAX_STORED = 100; // cap unbounded growth

/* ─────────────────────────────────────────────
   Storage helpers
───────────────────────────────────────────── */
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage quota exceeded — silently ignore
  }
};

/* ─────────────────────────────────────────────
   Context
───────────────────────────────────────────── */
const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(loadFromStorage);

  // Request browser permission on startup
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Persist every state change to localStorage
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  /**
   * Add a new notification.
   * @param {{ type?: 'success'|'info'|'warning'|'error', title: string, message: string }} payload
   */
  const addNotification = useCallback(({ type = "info", title, message }) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      title,
      message: message ?? "",
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications((prev) => [entry, ...prev].slice(0, MAX_STORED));
    
    // Also trigger native desktop push alert
    showPushNotification(title, message ?? "");
  }, []);

  /** Mark a single notification as read by id */
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  /** Mark every notification as read */
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  /** Remove all notifications from store and localStorage */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to access the notification system.
 * Must be used inside <NotificationProvider>.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
};
