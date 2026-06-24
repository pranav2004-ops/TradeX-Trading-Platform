import { useEffect } from "react";
import { Bell, X } from "lucide-react";

const AUTO_DISMISS_MS = 6000;

const fmt = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const AlertToast = ({ toast, onDismiss }) => {
  const { id, symbol, condition, targetPrice, currentPrice } = toast;
  const dir = condition === "above" ? "rose above" : "dropped below";

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-[#0d1117] px-4 py-3 shadow-2xl ring-1 ring-amber-500/10 w-80 pointer-events-auto">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15">
        <Bell size={13} className="text-amber-400" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#f5f7fa]">
          Price Alert: {symbol}
        </p>
        <p className="mt-0.5 text-xs text-[#8a93a3]">
          {symbol} {dir}{" "}
          <span className="font-medium text-amber-400">₹{fmt(targetPrice)}</span>
        </p>
        <p className="mt-0.5 text-xs text-[#4f5867]">
          Current price: ₹{fmt(currentPrice)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="mt-0.5 flex-shrink-0 rounded p-0.5 text-[#4f5867] transition hover:text-[#f5f7fa]"
        aria-label="Dismiss alert"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
};

const AlertToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Price alert notifications"
    >
      {toasts.map((t) => (
        <AlertToast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default AlertToastContainer;
