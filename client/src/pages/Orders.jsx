import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { cancelOrder, getTradeHistory, modifyOrder } from "../api/tradeApi";
import { useNotifications } from "../context/NotificationContext";
import { Edit2, Trash2, Clock, CheckCircle, AlertTriangle, XCircle, RefreshCw, Download, FileSpreadsheet } from "lucide-react";
import { exportToCSV, exportToPDF } from "../utils/exportUtils";

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
  EXECUTED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  CANCELLED: "bg-slate-500/10 text-slate-300 border border-[#2a3344]",
  REJECTED: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const statusIcons = {
  EXECUTED: <CheckCircle size={12} className="mr-1" />,
  PENDING: <Clock size={12} className="mr-1" />,
  CANCELLED: <XCircle size={12} className="mr-1" />,
  REJECTED: <AlertTriangle size={12} className="mr-1" />,
};

// Modification modal component
const ModifyModal = ({ isOpen, order, onClose, onModifySuccess }) => {
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (order) {
      setQuantity(String(order.quantity || ""));
      setLimitPrice(order.limitPrice != null ? String(order.limitPrice) : "");
      setTriggerPrice(order.triggerPrice != null ? String(order.triggerPrice) : "");
      setError("");
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const showLimitPrice = ["LIMIT", "SL", "GTT"].includes(order.orderType);
  const showTriggerPrice = ["SL", "SL-M", "GTT"].includes(order.orderType);

  const numericQuantity = Number(quantity);
  const numericLimitPrice = Number(limitPrice);
  const numericTriggerPrice = Number(triggerPrice);

  const isFormValid =
    numericQuantity > 0 &&
    (!showLimitPrice || (order.orderType === "GTT" && limitPrice === "") || numericLimitPrice > 0) &&
    (!showTriggerPrice || numericTriggerPrice > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid || loading) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        quantity: numericQuantity,
        limitPrice: showLimitPrice && limitPrice !== "" ? numericLimitPrice : undefined,
        triggerPrice: showTriggerPrice ? numericTriggerPrice : undefined,
      };

      await modifyOrder(order._id, payload);
      onModifySuccess();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to modify order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-lg border border-[#1e2530] bg-[#11161f] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#1e2530] px-5 py-4">
          <div>
            <span className="text-[10px] font-semibold text-[#8a93a3] uppercase tracking-wider">Modify Order</span>
            <h3 className="text-lg font-bold text-white mt-0.5">{order.symbol}</h3>
            <p className="text-xs text-[#8a93a3]">{order.companyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8a93a3] hover:text-white transition"
          >
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="flex flex-col gap-4">
            {/* Quantity */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[#8a93a3] uppercase tracking-wider">Quantity</span>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-10 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 text-xs text-[#f5f7fa] outline-none transition focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20"
                required
              />
            </label>

            {/* Trigger Price */}
            {showTriggerPrice && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#8a93a3] uppercase tracking-wider">Trigger Price (₹)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(e.target.value)}
                  className="h-10 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 text-xs text-[#f5f7fa] outline-none transition focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20"
                  required
                />
              </label>
            )}

            {/* Limit Price */}
            {showLimitPrice && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#8a93a3] uppercase tracking-wider">
                  Limit Price (₹) {order.orderType === "GTT" && "(Optional)"}
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={order.orderType === "GTT" ? "Market order on trigger" : ""}
                  className="h-10 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 text-xs text-[#f5f7fa] outline-none transition focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20"
                  required={order.orderType !== "GTT"}
                />
              </label>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-10 rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 text-xs font-semibold text-[#f5f7fa] hover:bg-[#1e2530] transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="h-10 rounded-lg bg-[#2f6fed] hover:bg-[#1a56db] px-5 text-xs font-semibold text-white transition disabled:bg-slate-800 disabled:text-slate-500"
            >
              {loading ? "Modifying..." : "Modify Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Orders = () => {
  const { addNotification } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("OPEN"); // OPEN, EXECUTED, GTT
  const [cancellingId, setCancellingId] = useState("");
  const [confirmingId, setConfirmingId] = useState("");
  
  // Modifying states
  const [modifyingOrder, setModifyingOrder] = useState(null);

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
        message: `${order.orderType} ${order.action} for ${order.quantity} shares of ${order.symbol} has been cancelled.`,
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

  // Filter orders by tab
  const filteredOrders = orders.filter((order) => {
    const isPending = order.status === "PENDING";
    const isGtt = order.orderType === "GTT";

    if (activeTab === "OPEN") {
      return isPending && !isGtt;
    } else if (activeTab === "EXECUTED") {
      return !isPending && !isGtt;
    } else if (activeTab === "GTT") {
      return isGtt;
    }
    return false;
  });

  const handleExportCSV = () => {
    const csvHeaders = ["Date", "Order Type", "Action", "Symbol", "Qty", "Trigger Price", "Limit Price", "Exec Price", "Status", "Total Amount"];
    const exportData = filteredOrders.map(order => ({
      "Date": formatDateTime(order.createdAt),
      "Order Type": order.orderType || "MARKET",
      "Action": order.action,
      "Symbol": order.symbol,
      "Qty": order.quantity,
      "Trigger Price": order.triggerPrice != null ? `INR ${order.triggerPrice.toFixed(2)}` : "--",
      "Limit Price": order.limitPrice != null ? `INR ${order.limitPrice.toFixed(2)}` : "--",
      "Exec Price": (order.executedPrice ?? order.price) != null ? `INR ${(order.executedPrice ?? order.price).toFixed(2)}` : "--",
      "Status": order.status || "EXECUTED",
      "Total Amount": order.totalAmount != null ? `INR ${order.totalAmount.toFixed(2)}` : order.reservedAmount > 0 ? `INR ${order.reservedAmount.toFixed(2)}` : "--"
    }));
    exportToCSV(exportData, csvHeaders, `${activeTab.toLowerCase()}_orders_statement.csv`);
  };

  const handleExportPDF = () => {
    const pdfColumns = ["Date", "Order Type", "Action", "Symbol", "Qty", "Trigger Price", "Limit Price", "Exec Price", "Status", "Total Amount"];
    const exportRows = filteredOrders.map(order => ({
      "Date": formatDateTime(order.createdAt),
      "Order Type": order.orderType || "MARKET",
      "Action": order.action,
      "Symbol": order.symbol,
      "Qty": order.quantity,
      "Trigger Price": order.triggerPrice != null ? `INR ${order.triggerPrice.toFixed(2)}` : "--",
      "Limit Price": order.limitPrice != null ? `INR ${order.limitPrice.toFixed(2)}` : "--",
      "Exec Price": (order.executedPrice ?? order.price) != null ? `INR ${(order.executedPrice ?? order.price).toFixed(2)}` : "--",
      "Status": order.status || "EXECUTED",
      "Total Amount": order.totalAmount != null ? `INR ${order.totalAmount.toFixed(2)}` : order.reservedAmount > 0 ? `INR ${order.reservedAmount.toFixed(2)}` : "--"
    }));
    exportToPDF(`${activeTab} Orders Report`, pdfColumns, exportRows, `${activeTab.toLowerCase()}_orders_statement.pdf`);
  };

  const getTabCount = (tabName) => {
    return orders.filter((order) => {
      const isPending = order.status === "PENDING";
      const isGtt = order.orderType === "GTT";

      if (tabName === "OPEN") return isPending && !isGtt;
      if (tabName === "EXECUTED") return !isPending && !isGtt;
      if (tabName === "GTT") return isGtt;
      return false;
    }).length;
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px]">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#f5f7fa]">Orders</h1>
            <p className="mt-0.5 text-xs text-[#8a93a3]">
              Manage open orders, modify pending execution thresholds, and review trade history.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3.5 py-1.5 text-xs font-semibold text-[#8a93a3] transition hover:bg-[#1e2530] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Export Current List to CSV"
            >
              <FileSpreadsheet size={12} />
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={filteredOrders.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3.5 py-1.5 text-xs font-semibold text-[#8a93a3] transition hover:bg-[#1e2530] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Print/Save Current List to PDF"
            >
              <Download size={12} />
              PDF
            </button>
            <span className="h-4 w-px bg-[#1e2530]" />
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3.5 py-1.5 text-xs font-semibold text-[#8a93a3] transition hover:bg-[#1e2530] hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-[#1e2530] mb-5 gap-2 overflow-x-auto">
          {[
            { id: "OPEN", label: "Open Orders" },
            { id: "EXECUTED", label: "Executed Orders" },
            { id: "GTT", label: "GTT Trigger Orders" },
          ].map((tab) => {
            const count = getTabCount(tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 pt-2 text-xs font-semibold uppercase tracking-wider transition border-b-2 px-3 whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "border-[#2f6fed] text-[#2f6fed]"
                    : "border-transparent text-[#8a93a3] hover:text-white"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      activeTab === tab.id
                        ? "bg-[#2f6fed]/20 text-[#2f6fed]"
                        : "bg-[#1e2530] text-[#8a93a3]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Orders Table */}
        <div className="rounded-lg border border-[#1e2530] bg-[#11161f] overflow-hidden">
          {error ? (
            <div className="px-5 py-8 text-center text-xs text-red-400">{error}</div>
          ) : loading && filteredOrders.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#8a93a3]">
              Loading your orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-[#8a93a3]">
              No {activeTab.toLowerCase()} orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1e2530] bg-[#0d1117]">
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3]">Date</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3]">Order Type</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3]">Action</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3]">Symbol</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3] text-right">Qty</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3] text-right">Trigger Price</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3] text-right">Limit Price</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3] text-right">Exec Price</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3] text-center">Status</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3] text-right">Total</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3]"></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const isBuy = order.action === "BUY";
                    const isPending = order.status === "PENDING";
                    const isCancelling = cancellingId === order._id;
                    const isConfirming = confirmingId === order._id;

                    return (
                      <tr
                        key={order._id}
                        className="border-b border-[#1e2530] last:border-0 hover:bg-[#1a2030] transition"
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-[#f5f7fa]">
                          {formatDateTime(order.createdAt)}
                        </td>

                        {/* Order Type */}
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              order.orderType === "LIMIT"
                                ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                : order.orderType === "SL" || order.orderType === "SL-M"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : order.orderType === "GTT"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-[#1e2530] text-[#8a93a3] border border-[#2a3344]"
                            }`}
                          >
                            {order.orderType || "MARKET"}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              isBuy
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}
                          >
                            {order.action}
                          </span>
                        </td>

                        {/* Symbol */}
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#f5f7fa]">{order.symbol}</p>
                          <p className="text-[10px] text-[#8a93a3] truncate max-w-[120px]">
                            {order.companyName}
                          </p>
                        </td>

                        {/* Qty */}
                        <td className="px-4 py-3 text-right text-[#f5f7fa] font-semibold">
                          {order.quantity}
                        </td>

                        {/* Trigger Price */}
                        <td className="px-4 py-3 text-right text-[#f5f7fa]">
                          {order.triggerPrice != null
                            ? `₹${fmt(order.triggerPrice)}`
                            : "--"}
                        </td>

                        {/* Limit Price */}
                        <td className="px-4 py-3 text-right text-[#f5f7fa]">
                          {order.limitPrice != null
                            ? `₹${fmt(order.limitPrice)}`
                            : "--"}
                        </td>

                        {/* Executed Price */}
                        <td className="px-4 py-3 text-right text-[#f5f7fa]">
                          {order.executedPrice != null || order.price != null
                            ? `₹${fmt(order.executedPrice ?? order.price)}`
                            : "--"}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              statusStyles[order.status || "EXECUTED"]
                            }`}
                          >
                            {statusIcons[order.status || "EXECUTED"]}
                            {order.status || "EXECUTED"}
                          </span>
                        </td>

                        {/* Total Amount */}
                        <td className="px-4 py-3 text-right text-[#f5f7fa] font-bold">
                          {order.totalAmount != null
                            ? `₹${fmt(order.totalAmount)}`
                            : order.reservedAmount > 0
                            ? `₹${fmt(order.reservedAmount)}`
                            : "--"}
                        </td>

                        {/* Action buttons */}
                        <td className="px-4 py-3">
                          {isPending && (
                            <div className="flex items-center justify-end gap-2">
                              {isCancelling ? (
                                <span className="text-[10px] text-[#8a93a3]">Cancelling...</span>
                              ) : isConfirming ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-[#8a93a3] mr-1">Sure?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCancel(order)}
                                    className="rounded bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelDismiss}
                                    className="rounded border border-[#2a3344] bg-[#0d1117] px-1.5 py-0.5 text-[10px] font-bold text-[#8a93a3] hover:bg-[#1e2530] transition"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setModifyingOrder(order)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3344] text-[#8a93a3] hover:border-[#2f6fed] hover:text-[#2f6fed] transition"
                                    title="Modify Order Price/Qty"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCancelRequest(order._id)}
                                    className="flex h-7 w-7 items-center justify-center rounded-md border border-red-500/20 text-red-400 hover:bg-red-500/10 transition"
                                    title="Cancel Order"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
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

      {/* Modify Order Modal */}
      <ModifyModal
        isOpen={Boolean(modifyingOrder)}
        order={modifyingOrder}
        onClose={() => setModifyingOrder(null)}
        onModifySuccess={() => {
          addNotification({
            type: "success",
            title: "Order Modified",
            message: `Successfully modified pending ${modifyingOrder?.symbol} order.`,
          });
          loadOrders();
        }}
      />
    </DashboardLayout>
  );
};

export default Orders;
