/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuotes } from "./QuoteContext";
import { useNotifications } from "./NotificationContext";
import {
  getAlerts,
  createAlert,
  markAlertTriggered,
  deleteAlert,
} from "../api/alertsApi";
import AlertToastContainer from "../components/alerts/AlertToast";

const AlertContext = createContext(null);

const fmt = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const { quoteMap, registerSymbols } = useQuotes();
  const { addNotification } = useNotifications();

  // Tracks IDs already triggered this browser session to prevent double-fire
  const firedRef = useRef(new Set());

  // ─── Fetch alerts from backend ──────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      setLoading(true);
      const data = await getAlerts();
      setAlerts(data);
      // Seed fired set so already-triggered alerts are never re-fired
      data.filter((a) => a.triggered).forEach((a) => firedRef.current.add(a._id));
    } catch {
      // User may not be authenticated yet — silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

 useEffect(() => {
  let mounted = true;

  const loadAlerts = async () => {
    if (!localStorage.getItem("token")) return;

    try {
      setLoading(true);

      const data = await getAlerts();

      if (!mounted) return;

      setAlerts(data);

      data
        .filter((a) => a.triggered)
        .forEach((a) => firedRef.current.add(a._id));
    } catch {
      // ignore
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  loadAlerts();

  return () => {
    mounted = false;
  };
}, []);

  // ─── Keep active alert symbols subscribed in QuoteContext ─────────────────
  useEffect(() => {
    const activeSymbols = alerts
      .filter((a) => !a.triggered)
      .map((a) => a.symbol);
    return registerSymbols("price-alerts", activeSymbols);
  }, [alerts, registerSymbols]);

  // ─── Check price thresholds every time quoteMap updates ───────────────────
  useEffect(() => {
    if (!Object.keys(quoteMap).length) return;

    const pending = alerts.filter(
      (a) => !a.triggered && !firedRef.current.has(a._id)
    );
    if (!pending.length) return;

    pending.forEach((alert) => {
      const quote = quoteMap[alert.symbol];
      if (!quote?.currentPrice) return;

      const price = quote.currentPrice;
      const crossed =
        (alert.condition === "above" && price >= alert.targetPrice) ||
        (alert.condition === "below" && price <= alert.targetPrice);

      if (!crossed) return;

      // Guard immediately — prevents double-fire if effect runs twice
      firedRef.current.add(alert._id);

      const dir = alert.condition === "above" ? "rose above" : "dropped below";

      // Persistent bell notification
      addNotification({
        type: "warning",
        title: `Price Alert: ${alert.symbol}`,
        message: `${alert.symbol} ${dir} ₹${fmt(alert.targetPrice)} — current: ₹${fmt(price)}`,
      });

      // Floating toast (auto-dismissed after 6s)
      const toastId = `${alert._id}-${Date.now()}`;
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          symbol: alert.symbol,
          condition: alert.condition,
          targetPrice: alert.targetPrice,
          currentPrice: price,
        },
      ]);

      // Mark triggered on the backend
      markAlertTriggered(alert._id)
        .then(() => {
          setAlerts((prev) =>
            prev.map((a) =>
              a._id === alert._id
                ? { ...a, triggered: true, triggeredAt: new Date().toISOString() }
                : a
            )
          );
        })
        .catch(() => {
          // Keep the local triggered state even if the PATCH fails
        });
    });
  }, [quoteMap, alerts, addNotification]);

  // ─── Public API ───────────────────────────────────────────────────────────
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addAlert = useCallback(async (payload) => {
    const alert = await createAlert(payload);
    setAlerts((prev) => [alert, ...prev]);
    return alert;
  }, []);

  const removeAlert = useCallback(async (id) => {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a._id !== id));
    firedRef.current.delete(id);
  }, []);

  return (
    <AlertContext.Provider
      value={{ alerts, loading, fetchAlerts, addAlert, removeAlert }}
    >
      {children}
      <AlertToastContainer toasts={toasts} onDismiss={dismissToast} />
    </AlertContext.Provider>
  );
};

export const useAlerts = () => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertProvider");
  return ctx;
};
