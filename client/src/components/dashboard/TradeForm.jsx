import { X } from "lucide-react";
import { useMemo, useState } from "react";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function TradeForm({
  type,
  stock,
  quote,
  onClose,
  onConfirm,
  loading = false,
  error = "",
  initialQuantity = "",
}) {
  const [quantity, setQuantity] = useState(() =>
    initialQuantity ? String(initialQuantity) : ""
  );
  const [selectedOrderType, setSelectedOrderType] = useState("MARKET");
  const [limitPrice, setLimitPrice] = useState("");

  const action = type === "SELL" ? "SELL" : "BUY";
  const isSell = action === "SELL";
  const isLimit = selectedOrderType === "LIMIT";

  const marketPrice = useMemo(() => {
    const rawPrice = quote?.["05. price"];
    return rawPrice ? Number(rawPrice) : 0;
  }, [quote]);

  const numericQuantity = Number(quantity);
  const numericLimitPrice = Number(limitPrice);
  const effectivePrice = isLimit ? numericLimitPrice : marketPrice;
  const total =
    effectivePrice * (Number.isFinite(numericQuantity) ? numericQuantity : 0);

  const canConfirm =
    numericQuantity > 0 &&
    !loading &&
    (isLimit ? numericLimitPrice > 0 : marketPrice > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canConfirm || !onConfirm) return;

    onConfirm({
      type: action,
      stock,
      quantity: numericQuantity,
      price: marketPrice,
      totalAmount: total,
      orderType: selectedOrderType,
      limitPrice: isLimit ? numericLimitPrice : undefined,
    });
  };

  const handleClose = () => {
    if (!loading) {
      setQuantity("");
      setSelectedOrderType("MARKET");
      setLimitPrice("");
      onClose();
    }
  };

  return (
    <>
      <div className="flex items-start justify-between border-b border-[#1e2530] px-5 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            {isSell ? "Sell Order" : "Buy Order"}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {stock.symbol}
          </h2>
          <p className="mt-0.5 text-sm text-[#8a93a3]">{stock.name}</p>
        </div>

        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#8a93a3] transition hover:bg-[#1e2530] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close order form"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-5">
        {/* Order Type Toggle */}
        <div className="mb-5">
          <p className="mb-2 text-sm font-medium text-[#f5f7fa]">
            Order Type
          </p>
          <div className="flex gap-2">
            {["MARKET", "LIMIT"].map((ot) => (
              <button
                key={ot}
                type="button"
                disabled={loading}
                onClick={() => {
                  setSelectedOrderType(ot);
                  if (ot === "MARKET") setLimitPrice("");
                }}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                  selectedOrderType === ot
                    ? "border-[#2f6fed] bg-[#2f6fed]/10 text-[#2f6fed]"
                    : "border-[#1e2530] bg-[#0d1117] text-[#8a93a3] hover:border-[#2f6fed]/40 hover:text-[#f5f7fa]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {ot}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
              Market Price
            </p>
            <p className="mt-1 text-lg font-semibold text-[#f5f7fa]">
              {marketPrice > 0 ? `₹${fmt(marketPrice)}` : "--"}
            </p>
          </div>

          <div className="rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
              Action
            </p>
            <p
              className={`mt-1 text-lg font-semibold ${
                isSell ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {action}
            </p>
          </div>
        </div>

        {/* Limit Price Input — shown only when LIMIT is selected */}
        {isLimit && (
          <label className="mt-4 flex flex-col gap-2">
            <span className="text-sm font-medium text-[#f5f7fa]">
              Limit Price (&#8377;)
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Enter trigger price"
              disabled={loading}
              className="h-12 rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 text-sm text-[#f5f7fa] outline-none transition placeholder:text-[#8a93a3] focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-[11px] text-[#8a93a3]">
              {isSell
                ? "Executes when market price rises to or above this value."
                : "Executes when market price falls to or below this value."}
            </p>
          </label>
        )}

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm font-medium text-[#f5f7fa]">
            Quantity
          </span>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            disabled={loading}
            className="h-12 rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 text-sm text-[#f5f7fa] outline-none transition placeholder:text-[#8a93a3] focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <div className="mt-4 rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#8a93a3]">
              {isLimit ? "Reserved Amount" : "Estimated Total"}
            </span>
            <span className="font-semibold text-[#f5f7fa]">
              &#8377;{fmt(total)}
            </span>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="h-12 rounded-lg border border-[#1e2530] bg-[#0d1117] font-semibold text-[#f5f7fa] transition hover:bg-[#1e2530] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!canConfirm}
            className={`h-12 rounded-lg font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 ${
              isSell
                ? "bg-[#dc2626] hover:bg-[#b91c1c]"
                : "bg-[#16a34a] hover:bg-[#15803d]"
            }`}
          >
            {loading
              ? "Processing..."
              : isLimit
              ? `Place Limit ${action}`
              : `Confirm ${action}`}
          </button>
        </div>
      </form>
    </>
  );
}
