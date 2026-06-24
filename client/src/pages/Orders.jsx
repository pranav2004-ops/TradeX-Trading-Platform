import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { cancelOrder, getTradeHistory } from "../api/tradeApi";
import { useNotifications } from "../context/NotificationContext";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusStyles = {
  EXECUTED: "bg-emerald-500/10 text-emerald-400",
  PENDING: "bg-amber-500/10 text-amber-400",
  CANCELLED: "bg-slate-500/10 text-slate-300",
  REJECTED: "bg-red-500/10 text-red-400",
};

const TABLE_HEADERS = [
  "Date",
  "Order Type",
  "Action",
  "Symbol",
  "Qty",
  "Limit Price",
  "Exec. Price",
  "Status",
  "Executed At",
  "Total",
  "",
];

const Orders = () => {
  const { addNotification } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const [confirmingId, setConfirmingId] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getTradeHistory();

      setOrders(data);
    } catch (err) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadOrders, 0);

    return () => clearTimeout(timer);
  }, [loadOrders]);

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
        message: `Limit ${order.action} for ${order.quantity} share${order.quantity !== 1 ? "s" : ""} of ${order.symbol} @ ₹${fmt(order.limitPrice)} has been cancelled.`,
      });

      await loadOrders();
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

  return (
    <DashboardLayout>
      <div className="max-w-[1400px]">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">Orders</h1>

          <p className="mt-1 text-sm text-[#8a93a3]">
            View all orders, execution status, and trade history.
          </p>
        </div>

        <div className="rounded-lg border border-[#1e2530] bg-[#11161f]">
          <div className="border-b border-[#1e2530] px-4 py-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#8a93a3]">
              Order History
            </h2>
          </div>

          {error ? (
            <div className="px-4 py-8 text-sm text-red-400">{error}</div>
          ) : loading ? (
            <div className="px-4 py-8 text-sm text-[#8a93a3]">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="px-4 py-8 text-sm text-[#8a93a3]">
              No orders yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2530]">
                    {TABLE_HEADERS.map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => {
                    const isBuy = order.action === "BUY";
                    const isPendingLimit =
                      order.status === "PENDING" && order.orderType === "LIMIT";
                    const isCancelling = cancellingId === order._id;
                    const isConfirming = confirmingId === order._id;

                    return (
                      <tr
                        key={order._id}
                        className="border-b border-[#1e2530] last:border-0 hover:bg-[#1a2030]"
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          {formatDateTime(order.createdAt)}
                        </td>

                        {/* Order Type */}
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              order.orderType === "LIMIT"
                                ? "bg-violet-500/10 text-violet-400"
                                : "bg-[#1e2530] text-[#8a93a3]"
                            }`}
                          >
                            {order.orderType || "MARKET"}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              isBuy
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {order.action}
                          </span>
                        </td>

                        {/* Symbol */}
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-medium text-[#f5f7fa]">
                            {order.symbol}
                          </p>
                          <p className="text-[11px] text-[#8a93a3]">
                            {order.companyName}
                          </p>
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          {order.quantity}
                        </td>

                        {/* Limit Price */}
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          {order.limitPrice != null
                            ? `₹${fmt(order.limitPrice)}`
                            : "--"}
                        </td>

                        {/* Executed Price */}
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          {order.executedPrice != null || order.price != null
                            ? `₹${fmt(order.executedPrice ?? order.price)}`
                            : "--"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              statusStyles[order.status || "EXECUTED"]
                            }`}
                          >
                            {order.status || "EXECUTED"}
                          </span>
                        </td>

                        {/* Executed At */}
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          {order.executedAt
                            ? formatDateTime(order.executedAt)
                            : "--"}
                        </td>

                        {/* Total Amount */}
                        <td className="px-4 py-3 text-[13px] font-medium text-[#f5f7fa]">
                          {order.totalAmount != null
                            ? `₹${fmt(order.totalAmount)}`
                            : "--"}
                        </td>

                        {/* Cancel Button */}
                        <td className="px-4 py-3">
                          {isPendingLimit && (
                            isCancelling ? (
                              <span className="text-xs text-[#8a93a3]">Cancelling...</span>
                            ) : isConfirming ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-[#8a93a3] whitespace-nowrap">Sure?</span>
                                <button
                                  type="button"
                                  onClick={() => handleCancel(order)}
                                  className="rounded-md bg-red-500/10 border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelDismiss}
                                  className="rounded-md border border-[#2a3344] px-2 py-1 text-xs font-medium text-[#8a93a3] transition hover:bg-[#1e2530]"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCancelRequest(order._id)}
                                className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                              >
                                Cancel
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Orders;
