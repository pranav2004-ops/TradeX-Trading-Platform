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
  const [selectedTab, setSelectedTab] = useState("REGULAR"); // REGULAR, STOPLOSS, GTT
  const [selectedOrderType, setSelectedOrderType] = useState("MARKET"); // MARKET, LIMIT, SL, SL-M, GTT
  const [quantity, setQuantity] = useState(() =>
    initialQuantity ? String(initialQuantity) : ""
  );
  const [limitPrice, setLimitPrice] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");

  const action = type === "SELL" ? "SELL" : "BUY";
  const isSell = action === "SELL";

  const marketPrice = useMemo(() => {
    const rawPrice = quote?.["05. price"];
    return rawPrice ? Number(rawPrice) : 0;
  }, [quote]);

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    if (loading) return;
    setSelectedTab(tab);
    if (tab === "REGULAR") {
      setSelectedOrderType("MARKET");
      setLimitPrice("");
      setTriggerPrice("");
    } else if (tab === "STOPLOSS") {
      setSelectedOrderType("SL");
      setLimitPrice(marketPrice ? String(marketPrice) : "");
      setTriggerPrice(marketPrice ? String(Math.round(marketPrice * 0.98 * 100) / 100) : ""); // default 2% below
    } else if (tab === "GTT") {
      setSelectedOrderType("GTT");
      setLimitPrice(marketPrice ? String(marketPrice) : "");
      // Default trigger: 5% below for BUY, 5% above for SELL
      const defaultTrigger = isSell
        ? Math.round(marketPrice * 1.05 * 100) / 100
        : Math.round(marketPrice * 0.95 * 100) / 100;
      setTriggerPrice(marketPrice ? String(defaultTrigger) : "");
    }
  };

  const numericQuantity = Number(quantity);
  const numericLimitPrice = Number(limitPrice);
  const numericTriggerPrice = Number(triggerPrice);

  // Compute estimate / reserved cash
  const effectivePrice = useMemo(() => {
    if (selectedOrderType === "MARKET") return marketPrice;
    if (selectedOrderType === "LIMIT" || selectedOrderType === "SL") return numericLimitPrice;
    if (selectedOrderType === "SL-M") return numericTriggerPrice;
    if (selectedOrderType === "GTT") return numericLimitPrice || marketPrice;
    return marketPrice;
  }, [selectedOrderType, marketPrice, numericLimitPrice, numericTriggerPrice]);

  const total = useMemo(() => {
    const qty = Number.isFinite(numericQuantity) ? numericQuantity : 0;
    const price = Number.isFinite(effectivePrice) ? effectivePrice : 0;
    return qty * price;
  }, [numericQuantity, effectivePrice]);

  // Validation
  const canConfirm = useMemo(() => {
    if (loading || !(numericQuantity > 0)) return false;

    if (selectedOrderType === "MARKET") {
      return marketPrice > 0;
    }
    if (selectedOrderType === "LIMIT") {
      return numericLimitPrice > 0;
    }
    if (selectedOrderType === "SL") {
      return numericLimitPrice > 0 && numericTriggerPrice > 0;
    }
    if (selectedOrderType === "SL-M") {
      return numericTriggerPrice > 0;
    }
    if (selectedOrderType === "GTT") {
      if (!(numericTriggerPrice > 0)) return false;
      if (limitPrice !== "" && !(numericLimitPrice > 0)) return false;
      return true;
    }
    return false;
  }, [loading, numericQuantity, selectedOrderType, marketPrice, numericLimitPrice, numericTriggerPrice, limitPrice]);

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
      limitPrice: ["LIMIT", "SL", "GTT"].includes(selectedOrderType) && limitPrice !== "" ? numericLimitPrice : undefined,
      triggerPrice: ["SL", "SL-M", "GTT"].includes(selectedOrderType) ? numericTriggerPrice : undefined,
    });
  };

  const handleClose = () => {
    if (!loading) {
      setQuantity("");
      setLimitPrice("");
      setTriggerPrice("");
      setSelectedTab("REGULAR");
      setSelectedOrderType("MARKET");
      onClose();
    }
  };

  return (
    <>
      {/* Title Header */}
      <div className="flex items-start justify-between px-5 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a93a3]">
            {isSell ? "Sell Order" : "Buy Order"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">
            {stock.symbol}
          </h2>
          <p className="mt-0.5 text-xs text-[#8a93a3]">{stock.name}</p>
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

      {/* Tabs */}
      <div className="flex border-b border-[#1e2530] px-5 mt-3">
        {["REGULAR", "STOPLOSS", "GTT"].map((tab) => (
          <button
            key={tab}
            type="button"
            disabled={loading}
            onClick={() => handleTabChange(tab)}
            className={`pb-2.5 pt-1.5 text-[11px] font-semibold uppercase tracking-wider transition border-b-2 mr-6 ${
              selectedTab === tab
                ? "border-[#2f6fed] text-[#2f6fed]"
                : "border-transparent text-[#8a93a3] hover:text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4">
        {/* Sub-order type toggles */}
        {selectedTab === "REGULAR" && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold text-[#8a93a3] uppercase tracking-wider">
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
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${
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
        )}

        {selectedTab === "STOPLOSS" && (
          <div className="mb-4">
            <p className="mb-1.5 text-xs font-semibold text-[#8a93a3] uppercase tracking-wider">
              Stop Loss Type
            </p>
            <div className="flex gap-2">
              {["SL", "SL-M"].map((ot) => (
                <button
                  key={ot}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setSelectedOrderType(ot);
                    if (ot === "SL-M") {
                      setLimitPrice("");
                    } else if (!limitPrice && marketPrice) {
                      setLimitPrice(String(marketPrice));
                    }
                  }}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition ${
                    selectedOrderType === ot
                      ? "border-[#2f6fed] bg-[#2f6fed]/10 text-[#2f6fed]"
                      : "border-[#1e2530] bg-[#0d1117] text-[#8a93a3] hover:border-[#2f6fed]/40 hover:text-[#f5f7fa]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {ot === "SL" ? "SL (Limit)" : "SL-M (Market)"}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedTab === "GTT" && (
          <div className="mb-4 p-2.5 rounded-lg border border-[#2f6fed]/20 bg-[#2f6fed]/5 text-[11px] text-[#8a93a3]">
            <span className="font-semibold text-white block mb-0.5">Good Till Triggered (GTT)</span>
            Orders stay active across days until the trigger condition is hit. **No funds are locked** until the order triggers.
          </div>
        )}

        {/* Market Price Display & Action */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3]">
              LTP (Market)
            </p>
            <p className="mt-0.5 text-base font-bold text-[#f5f7fa]">
              {marketPrice > 0 ? `₹${fmt(marketPrice)}` : "--"}
            </p>
          </div>

          <div className="rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8a93a3]">
              Transaction
            </p>
            <p
              className={`mt-0.5 text-base font-bold ${
                isSell ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {action}
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-3">
          {/* Quantity */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#8a93a3] uppercase tracking-wider">
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
              className="h-10 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 text-xs text-[#f5f7fa] outline-none transition placeholder:text-[#525866] focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20 disabled:cursor-not-allowed disabled:opacity-60"
              required
            />
          </label>

          {/* Trigger Price input (SL, SL-M, GTT) */}
          {["SL", "SL-M", "GTT"].includes(selectedOrderType) && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#8a93a3] uppercase tracking-wider">
                Trigger Price (₹)
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                placeholder="Enter trigger threshold"
                disabled={loading}
                className="h-10 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 text-xs text-[#f5f7fa] outline-none transition placeholder:text-[#525866] focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20 disabled:cursor-not-allowed disabled:opacity-60"
                required
              />
              <p className="text-[10px] text-[#8a93a3]">
                {selectedOrderType === "GTT"
                  ? isSell
                    ? "Triggers when market price rises to or above trigger price."
                    : "Triggers when market price falls to or below trigger price."
                  : isSell
                  ? "Triggers when market price falls to or below trigger price."
                  : "Triggers when market price rises to or above trigger price."}
              </p>
            </label>
          )}

          {/* Limit Price Input (LIMIT, SL, GTT optional) */}
          {["LIMIT", "SL", "GTT"].includes(selectedOrderType) && (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#8a93a3] uppercase tracking-wider">
                Limit Price (₹) {selectedOrderType === "GTT" && "(Optional)"}
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder={selectedOrderType === "GTT" ? "Market if empty" : "Enter execution price"}
                disabled={loading}
                className="h-10 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 text-xs text-[#f5f7fa] outline-none transition placeholder:text-[#525866] focus:border-[#2f6fed]/50 focus:ring-1 focus:ring-[#2f6fed]/20 disabled:cursor-not-allowed disabled:opacity-60"
                required={selectedOrderType !== "GTT"}
              />
              <p className="text-[10px] text-[#8a93a3]">
                {selectedOrderType === "GTT"
                  ? "If specified, places a Limit order upon trigger. Otherwise, executes at market."
                  : isSell
                  ? "Executes when market price is at or above this limit."
                  : "Executes when market price is at or below this limit."}
              </p>
            </label>
          )}
        </div>

        {/* Summary cost */}
        <div className="mt-4 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8a93a3]">
              {selectedOrderType === "GTT"
                ? "Trigger Value (Est.)"
                : ["LIMIT", "SL", "SL-M"].includes(selectedOrderType) && !isSell
                ? "Margin (Cash Reserved)"
                : "Estimated Value"}
            </span>
            <span className="font-bold text-[#f5f7fa]">
              ₹{fmt(total)}
            </span>
          </div>
        </div>

        {/* Error box */}
        {error ? (
          <p className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        ) : null}

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="h-11 rounded-lg border border-[#1e2530] bg-[#0d1117] text-xs font-semibold text-[#f5f7fa] transition hover:bg-[#1e2530] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!canConfirm}
            className={`h-11 rounded-lg text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 ${
              isSell
                ? "bg-[#dc2626] hover:bg-[#b91c1c]"
                : "bg-[#16a34a] hover:bg-[#15803d]"
            }`}
          >
            {loading
              ? "Processing..."
              : selectedOrderType === "GTT"
              ? `Place GTT ${action}`
              : selectedOrderType === "SL" || selectedOrderType === "SL-M"
              ? `Place Stoploss ${action}`
              : selectedOrderType === "LIMIT"
              ? `Place Limit ${action}`
              : `Confirm ${action}`}
          </button>
        </div>
      </form>
    </>
  );
}
