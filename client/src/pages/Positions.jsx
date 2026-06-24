import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import OrderModal from "../components/dashboard/OrderModal";
import { buyStock, getHoldings, placeLimitOrder, sellStock } from "../api/tradeApi";
import { useQuoteSubscription } from "../context/QuoteContext";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const Positions = () => {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const symbols = useMemo(
    () => holdings.map((holding) => holding.symbol),
    [holdings]
  );
  const {
    quoteMap,
    loading: quotesLoading,
    error: quotesError,
    refreshQuotes,
  } = useQuoteSubscription("positions", symbols);

  const loadPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getHoldings();

      setHoldings(data);
    } catch (err) {
      setError(err.message || "Failed to load positions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadPositions, 0);

    return () => clearTimeout(timer);
  }, [loadPositions]);

  const positions = useMemo(() => {
    return holdings.map((holding) => {
      const quote = quoteMap[String(holding.symbol).toUpperCase()];

      return {
        ...holding,
        currentPrice: quote?.currentPrice ?? null,
        quoteError: quote ? "" : "Quote unavailable",
      };
    });
  }, [holdings, quoteMap]);

  const orderStock = useMemo(() => {
    if (!order?.position) return null;

    return {
      symbol: order.position.symbol,
      name: order.position.companyName,
    };
  }, [order]);

  const orderQuote = useMemo(() => {
    if (!Number.isFinite(order?.position?.currentPrice)) return null;

    return {
      "05. price": String(order.position.currentPrice),
    };
  }, [order]);

  const handleOpenOrder = (type, position, initialQuantity = "") => {
    if (!Number.isFinite(position.currentPrice)) return;

    setOrder({ type, position, initialQuantity });
    setOrderError("");
  };

  const handleCloseOrder = () => {
    if (orderLoading) return;

    setOrder(null);
    setOrderError("");
  };

  const handleConfirmTrade = async ({ type, stock, quantity, price, orderType: selectedOrderType, limitPrice }) => {
    try {
      setOrderLoading(true);
      setOrderError("");

      if (selectedOrderType === "LIMIT") {
        await placeLimitOrder({
          symbol: stock.symbol,
          companyName: stock.name,
          quantity,
          action: type,
          limitPrice,
        });
      } else {
        if (type === "SELL") {
          await sellStock({ symbol: stock.symbol, companyName: stock.name, quantity, price });
        } else {
          await buyStock({ symbol: stock.symbol, companyName: stock.name, quantity, price });
        }
      }

      setOrder(null);
      await loadPositions();
      await refreshQuotes();
    } catch (err) {
      setOrderError(err.message || "Failed to submit trade.");
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <OrderModal
        isOpen={Boolean(order)}
        type={order?.type}
        stock={orderStock}
        quote={orderQuote}
        initialQuantity={order?.initialQuantity}
        onClose={handleCloseOrder}
        onConfirm={handleConfirmTrade}
        loading={orderLoading}
        error={orderError}
      />

      <div className="max-w-[1300px]">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">Positions</h1>
          <p className="mt-1 text-sm text-[#8a93a3]">
            Track current holdings with live quote-based unrealized P&amp;L.
          </p>
        </div>

        <div className="rounded-lg border border-[#1e2530] bg-[#11161f]">
          <div className="border-b border-[#1e2530] px-4 py-3">
            <h2 className="text-sm font-medium uppercase tracking-wider text-[#8a93a3]">
              Open Positions
            </h2>
          </div>

          {error || quotesError ? (
            <div className="px-4 py-8 text-sm text-red-400">
              {error || quotesError}
            </div>
          ) : loading || (quotesLoading && positions.length === 0) ? (
            <div className="px-4 py-8 text-sm text-[#8a93a3]">Loading positions...</div>
          ) : positions.length === 0 ? (
            <div className="px-4 py-8 text-sm text-[#8a93a3]">No open positions.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2530]">
                    {[
                      "Symbol",
                      "Company",
                      "Quantity",
                      "Average Price",
                      "Invested Amount",
                      "Current Price",
                      "Unrealized P&L",
                      "P&L %",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => {
                    const hasPrice = Number.isFinite(position.currentPrice);
                    const marketValue = hasPrice
                      ? position.currentPrice * position.quantity
                      : null;
                    const pnl = hasPrice ? marketValue - position.investedAmount : null;
                    const pnlPercent = hasPrice && position.investedAmount > 0
                      ? (pnl / position.investedAmount) * 100
                      : null;
                    const isProfit = pnl >= 0;

                    return (
                      <tr
                        key={position._id || position.symbol}
                        className="border-b border-[#1e2530] last:border-0 hover:bg-[#1a2030]"
                      >
                        <td className="px-4 py-3 text-[13px] font-medium text-[#f5f7fa]">
                          {position.symbol}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          {position.companyName}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          {position.quantity}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          ₹{fmt(position.averagePrice)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          ₹{fmt(position.investedAmount)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                          {hasPrice ? `₹${fmt(position.currentPrice)}` : "--"}
                        </td>
                        <td className="px-4 py-3">
                          {hasPrice ? (
                            <span className={`text-[13px] font-medium ${
                              isProfit ? "text-emerald-400" : "text-red-400"
                            }`}>
                              {isProfit ? "+" : "-"}₹{fmt(Math.abs(pnl))}
                            </span>
                          ) : (
                            <span className="text-[13px] text-[#8a93a3]">Quote unavailable</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {Number.isFinite(pnlPercent) ? (
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                              isProfit
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}>
                              {isProfit ? "+" : ""}
                              {pnlPercent.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-[13px] text-[#8a93a3]">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenOrder("BUY", position)}
                              disabled={!hasPrice}
                              className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Buy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenOrder("SELL", position)}
                              disabled={!hasPrice}
                              className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Sell
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenOrder("SELL", position, position.quantity)}
                              disabled={!hasPrice}
                              className="rounded-md bg-[#1e2530] px-2.5 py-1 text-xs font-medium text-[#f5f7fa] transition hover:bg-[#2a3344] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Exit
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Positions;
