import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardTitle } from "../ui/card";
import Sparkline from "../ui/Sparkline";
import { getSparkline } from "../../api/stockApi";

const fmt = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HoldingsTable = ({ holdings = [], quoteMap = {}, loading, error, onTrade }) => {
  const navigate = useNavigate();
  const [sparklineMap, setSparklineMap] = useState({});

  useEffect(() => {
    if (holdings.length === 0) return;

    const symbols = holdings.map((h) => String(h.symbol).toUpperCase());

    const fetchAll = async () => {
      const results = await Promise.allSettled(
        symbols.map((sym) => getSparkline(sym))
      );

      setSparklineMap((prev) => {
        const next = { ...prev };
        results.forEach((result, i) => {
          if (result.status === "fulfilled" && result.value.prices?.length > 0) {
            next[symbols[i]] = result.value.prices;
          }
        });
        return next;
      });
    };

    fetchAll();
  }, [holdings]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Holdings</CardTitle>
          <span className="text-xs bg-[#1e2530] text-[#8a93a3] px-2 py-0.5 rounded-full">
            {holdings.length} stocks
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/portfolio")}
          className="text-xs text-[#2f6fed] hover:text-[#4a80ff] transition-colors font-medium"
        >
          View all
        </button>
      </CardHeader>
      {error ? (
        <div className="px-4 py-8 text-sm text-red-400">{error}</div>
      ) : loading ? (
        <div className="px-4 py-8 text-sm text-[#8a93a3]">Loading holdings...</div>
      ) : holdings.length === 0 ? (
        <div className="px-4 py-8 text-sm text-[#8a93a3]">No holdings yet.</div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2530]">
              {["Symbol", "Qty", "Avg Price", "Invested", "Current Price", "P&L", "7D Trend", "Actions"].map((h) => (
                <th key={h} className="text-left text-[11px] font-medium text-[#8a93a3] uppercase tracking-wider px-4 py-2.5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const sym = String(h.symbol).toUpperCase();
              const currentPrice = Number(quoteMap[sym]?.currentPrice);
              const hasPrice = Number.isFinite(currentPrice);
              const currentValue = hasPrice ? currentPrice * h.quantity : null;
              const pnl = hasPrice ? currentValue - h.investedAmount : null;
              const isProfit = pnl >= 0;
              const sparkPrices = sparklineMap[sym] || [];

              return (
                <tr key={h._id || h.symbol} className="border-b border-[#1e2530] last:border-0 hover:bg-[#1a2030] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium text-[#f5f7fa]">{h.symbol}</p>
                    <p className="text-[11px] text-[#8a93a3]">{h.companyName}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">{h.quantity}</td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">\u20b9{fmt(h.averagePrice)}</td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">\u20b9{fmt(h.investedAmount)}</td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                    {hasPrice ? `\u20b9${fmt(currentPrice)}` : "--"}
                  </td>
                  <td className="px-4 py-3">
                    {hasPrice ? (
                      <span className={`text-[13px] font-medium ${
                        isProfit ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {isProfit ? "+" : "-"}\u20b9{fmt(Math.abs(pnl))}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#8a93a3]">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Sparkline prices={sparkPrices} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onTrade?.("BUY", h)}
                        className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20"
                      >
                        Buy
                      </button>
                      <button
                        type="button"
                        onClick={() => onTrade?.("SELL", h)}
                        className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
                      >
                        Sell
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </Card>
  );
};

export default HoldingsTable;
