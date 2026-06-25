import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import OrderModal from "../components/dashboard/OrderModal";
import { buyStock, getHoldings, placeOrder, sellStock } from "../api/tradeApi";
import { useQuoteSubscription } from "../context/QuoteContext";
import { Download, FileSpreadsheet } from "lucide-react";
import { exportToCSV, exportToPDF } from "../utils/exportUtils";

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

  const handleConfirmTrade = async ({ type, stock, quantity, price, orderType: selectedOrderType, limitPrice, triggerPrice }) => {
    try {
      setOrderLoading(true);
      setOrderError("");

      if (selectedOrderType !== "MARKET") {
        await placeOrder({
          symbol: stock.symbol,
          companyName: stock.name,
          quantity,
          action: type,
          orderType: selectedOrderType,
          limitPrice,
          triggerPrice,
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

  const handleExportCSV = () => {
    const csvHeaders = ["Symbol", "Company", "Quantity", "Average Price", "Invested Amount", "Current Price", "Unrealized P&L", "P&L %"];
    const exportData = positions.map(p => {
      const hasPrice = Number.isFinite(p.currentPrice);
      const marketValue = hasPrice ? p.currentPrice * p.quantity : null;
      const pnl = hasPrice ? marketValue - p.investedAmount : null;
      const pnlPercent = hasPrice && p.investedAmount > 0 ? (pnl / p.investedAmount) * 100 : null;

      return {
        "Symbol": p.symbol,
        "Company": p.companyName,
        "Quantity": p.quantity,
        "Average Price": `INR ${p.averagePrice.toFixed(2)}`,
        "Invested Amount": `INR ${p.investedAmount.toFixed(2)}`,
        "Current Price": hasPrice ? `INR ${p.currentPrice.toFixed(2)}` : "--",
        "Unrealized P&L": hasPrice ? `${pnl >= 0 ? "+" : "-"}INR ${Math.abs(pnl).toFixed(2)}` : "--",
        "P&L %": hasPrice ? `${pnl >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%` : "--"
      };
    });
    exportToCSV(exportData, csvHeaders, "positions_statement.csv");
  };

  const handleExportPDF = () => {
    const pdfColumns = ["Symbol", "Company", "Quantity", "Average Price", "Invested Amount", "Current Price", "Unrealized P&L", "P&L %"];
    const exportRows = positions.map(p => {
      const hasPrice = Number.isFinite(p.currentPrice);
      const marketValue = hasPrice ? p.currentPrice * p.quantity : null;
      const pnl = hasPrice ? marketValue - p.investedAmount : null;
      const pnlPercent = hasPrice && p.investedAmount > 0 ? (pnl / p.investedAmount) * 100 : null;

      return {
        "Symbol": p.symbol,
        "Company": p.companyName,
        "Quantity": p.quantity,
        "Average Price": `INR ${p.averagePrice.toFixed(2)}`,
        "Invested Amount": `INR ${p.investedAmount.toFixed(2)}`,
        "Current Price": hasPrice ? `INR ${p.currentPrice.toFixed(2)}` : "--",
        "Unrealized P&L": hasPrice ? `${pnl >= 0 ? "+" : "-"}INR ${Math.abs(pnl).toFixed(2)}` : "--",
        "P&L %": hasPrice ? `${pnl >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%` : "--"
      };
    });
    exportToPDF("Positions & Holdings Statement", pdfColumns, exportRows, "positions_statement.pdf");
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#f5f7fa]">Positions</h1>
            <p className="mt-1 text-sm text-[#8a93a3]">
              Track current holdings with live quote-based unrealized P&amp;L.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={positions.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3.5 py-1.5 text-xs font-semibold text-[#8a93a3] transition hover:bg-[#1e2530] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Export Current Positions to CSV"
            >
              <FileSpreadsheet size={12} />
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={positions.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3.5 py-1.5 text-xs font-semibold text-[#8a93a3] transition hover:bg-[#1e2530] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              title="Print/Save Current Positions to PDF"
            >
              <Download size={12} />
              PDF
            </button>
          </div>
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
