import { useState } from "react";
import { Bell, X } from "lucide-react";
import { useAlerts } from "../../context/AlertContext";

const fmt = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SetAlertModal = ({ symbol, currentPrice, onClose, onCreated }) => {
  const { addAlert } = useAlerts();
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState(
    currentPrice && Number(targetPrice) > currentPrice ? "above" : "above"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const price = Number(targetPrice);
    if (!targetPrice || !Number.isFinite(price) || price <= 0) {
      setError("Enter a valid target price greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      const alert = await addAlert({ symbol, targetPrice: price, condition });
      onCreated?.(alert);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create alert. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl border border-[#1e2530] bg-[#0d1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e2530] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/15">
              <Bell size={14} className="text-amber-400" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f5f7fa]">Set Price Alert</p>
              <p className="text-[11px] text-[#8a93a3]">{symbol}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#4f5867] transition hover:bg-[#1e2530] hover:text-[#f5f7fa]"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          {/* Current price reference */}
          {currentPrice != null && (
            <div className="rounded-md bg-[#11161f] border border-[#1e2530] px-3 py-2.5 flex items-center justify-between">
              <span className="text-xs text-[#8a93a3]">Current price</span>
              <span className="text-sm font-semibold text-[#f5f7fa]">
                ₹{fmt(currentPrice)}
              </span>
            </div>
          )}

          {/* Condition selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8a93a3]">Alert me when price</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "above", label: "Rises above" },
                { value: "below", label: "Drops below" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCondition(value)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                    condition === value
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      : "border-[#1e2530] bg-[#11161f] text-[#8a93a3] hover:border-[#2a3344] hover:text-[#f5f7fa]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Target price */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="target-price" className="text-xs font-medium text-[#8a93a3]">
              Target price (₹)
            </label>
            <input
              id="target-price"
              type="number"
              min="0.01"
              step="0.01"
              value={targetPrice}
              onChange={(e) => {
                setTargetPrice(e.target.value);
                setError("");
              }}
              placeholder="e.g. 1500.00"
              className="w-full rounded-md border border-[#1e2530] bg-[#11161f] px-3 py-2.5 text-sm text-[#f5f7fa] placeholder-[#4f5867] focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition"
              autoFocus
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-[#1e2530] bg-[#11161f] py-2.5 text-sm font-medium text-[#8a93a3] transition hover:text-[#f5f7fa]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !targetPrice}
              className="flex-1 rounded-md bg-amber-500 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Set Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetAlertModal;
