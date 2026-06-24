import { useCallback, useEffect, useState } from "react";
import { Clock } from "lucide-react";
import Card, { CardHeader, CardTitle } from "../ui/card";
import Badge from "../ui/badge";
import { cancelOrder, getPendingOrders } from "../../api/tradeApi";
import { useNotifications } from "../../context/NotificationContext";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PendingOrderRow = ({ order, onCancel, onCancelRequest, onCancelDismiss, cancelling, confirming }) => {
  const isBuy = order.action === "BUY";

  return (
    <div className="flex flex-col gap-2 border-b border-[#1e2530] py-3 last:border-0 sm:flex-row sm:items-center sm:gap-3">
      {/* Icon + symbol */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center ${
            isBuy
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          <Clock size={14} strokeWidth={2} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[13px] font-medium text-[#f5f7fa]">
              {order.symbol}
            </p>
            <Badge variant={isBuy ? "buy" : "sell"}>{order.action}</Badge>
            <Badge variant="neutral">LIMIT</Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-[#8a93a3]">
            {order.quantity} share{order.quantity !== 1 ? "s" : ""}
            {" · "}trigger {"\u20b9"}{fmt(order.limitPrice)}
            {" · "}
            {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Cancel / confirm controls */}
      <div className="self-end sm:self-auto flex-shrink-0">
        {cancelling ? (
          <span className="text-xs text-[#8a93a3]">Cancelling...</span>
        ) : confirming ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#8a93a3]">Sure?</span>
            <button
              type="button"
              onClick={() => onCancel(order)}
              className="rounded-md bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={onCancelDismiss}
              className="rounded-md border border-[#2a3344] px-2.5 py-1 text-xs font-medium text-[#8a93a3] transition hover:bg-[#1e2530]"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onCancelRequest(order._id)}
            className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

const PendingOrdersWidget = ({ refreshTrigger = 0 }) => {
  const { addNotification } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [confirmingId, setConfirmingId] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getPendingOrders();
      setOrders(data);
    } catch (err) {
      setError(err.message || "Failed to load pending orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load, refreshTrigger]);

  const handleCancelRequest = (orderId) => {
    setConfirmingId(orderId);
  };

  const handleCancelDismiss = () => {
    setConfirmingId("");
  };

  const handleCancel = async (order) => {
    setConfirmingId("");
    try {
      setCancellingId(order._id);
      await cancelOrder(order._id);
      addNotification({
        type: "info",
        title: "Order Cancelled",
        message: `Limit ${order.action} for ${order.quantity} share${order.quantity !== 1 ? "s" : ""} of ${order.symbol} @ \u20b9${fmt(order.limitPrice)} cancelled.`,
      });
      await load();
    } catch (err) {
      addNotification({
        type: "error",
        title: "Cancel Failed",
        message: err.message || "Failed to cancel order.",
      });
    } finally {
      setCancellingId("");
    }
  };

  if (!loading && !error && orders.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Pending Orders</CardTitle>
          {orders.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/10 px-1.5 text-[10px] font-semibold text-amber-400">
              {orders.length}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#8a93a3]">Awaiting trigger price</p>
      </CardHeader>

      <div className="px-4">
        {error ? (
          <p className="py-8 text-sm text-red-400">{error}</p>
        ) : loading ? (
          <p className="py-8 text-sm text-[#8a93a3]">
            Loading pending orders...
          </p>
        ) : (
          orders.map((order) => (
            <PendingOrderRow
              key={order._id}
              order={order}
              onCancel={handleCancel}
              onCancelRequest={handleCancelRequest}
              onCancelDismiss={handleCancelDismiss}
              cancelling={cancellingId === order._id}
              confirming={confirmingId === order._id}
            />
          ))
        )}
      </div>
    </Card>
  );
};

export default PendingOrdersWidget;
