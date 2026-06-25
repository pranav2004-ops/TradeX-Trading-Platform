import { useState } from "react";
import { TrendingUp, TrendingDown, Bell, X } from "lucide-react";
import SetAlertModal from "../alerts/SetAlertModal";
import StockChart from "./StockChart";

const StockDetailPanel = ({
  stock,
  quote,
  loading,
  error,
  onTradeClick,
  onClose,
  hideWhenNull = false,
}) => {
  const [alertOpen, setAlertOpen] = useState(false);

  if (!stock) {
    if (hideWhenNull) return null;
    return (
      <div className="bg-[#11161f] border border-[#1e2530] rounded-lg p-6 flex items-center justify-center h-[400px]">
        <p className="text-[#8a93a3] text-sm">
          Search and select a stock to view details
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[#11161f] border border-[#1e2530] rounded-lg p-6 flex items-center justify-center h-[200px]">
        <p className="text-[#8a93a3] text-sm">Loading stock data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#11161f] border border-[#1e2530] rounded-lg p-6 flex items-center justify-center h-[200px] relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-[#8a93a3] transition hover:bg-[#1e2530] hover:text-white"
            aria-label="Clear selected stock"
          >
            <X size={16} />
          </button>
        )}
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  const rawPrice = quote?.["05. price"] ? Number(quote["05. price"]) : null;
  const price = rawPrice != null ? rawPrice.toFixed(2) : "--";
  const changeValue = quote?.["09. change"] || "0.00";
  const changePercent = Number(
    quote?.["10. change percent"]?.replace("%", "") || 0
  );
  const isPositive = changePercent >= 0;
  const symbol = stock["1. symbol"] || stock.symbol || "";

  return (
    <>
      <div className="bg-[#11161f] border border-[#1e2530] rounded-lg p-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-[#8a93a3] transition hover:bg-[#1e2530] hover:text-white"
            aria-label="Clear selected stock"
          >
            <X size={16} />
          </button>
        )}

        <div className="mb-6 pr-8">
          <h2 className="text-2xl font-semibold text-white">{symbol}</h2>
          <p className="text-[#8a93a3] mt-1">{stock.name || stock["2. name"]}</p>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">₹{price}</h1>
          <div
            className={`flex items-center gap-2 mt-3 ${
              isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp size={18} />
            ) : (
              <TrendingDown size={18} />
            )}
            <span>
              {isPositive ? "+" : ""}
              {changeValue} ({changePercent}%)
            </span>
          </div>
        </div>

        {/* Interactive Candlestick Chart */}
        <div className="mb-6 p-4 rounded-lg bg-[#0d1117] border border-[#1e2530]">
          <StockChart symbol={symbol} />
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onTradeClick?.("BUY")}
              className="h-11 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold transition"
            >
              Buy
            </button>
            <button
              onClick={() => onTradeClick?.("SELL")}
              className="h-11 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white font-semibold transition"
            >
              Sell
            </button>
          </div>

          <button
            onClick={() => setAlertOpen(true)}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm font-medium text-amber-400 transition hover:bg-amber-500/20"
          >
            <Bell size={14} strokeWidth={2} />
            Set Price Alert
          </button>
        </div>
      </div>

      {alertOpen && (
        <SetAlertModal
          symbol={symbol}
          currentPrice={rawPrice}
          onClose={() => setAlertOpen(false)}
          onCreated={() => setAlertOpen(false)}
        />
      )}
    </>
  );
};

export default StockDetailPanel;
