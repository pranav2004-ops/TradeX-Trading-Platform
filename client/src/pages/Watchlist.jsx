import { Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import OrderModal from "../components/dashboard/OrderModal";
import StockDetailPanel from "../components/dashboard/StockDetailPanel";
import { buyStock, sellStock, placeOrder } from "../api/tradeApi";
import { getWatchlist, removeFromWatchlist } from "../api/watchlistApi";
import { useQuoteSubscription } from "../context/QuoteContext";
import { useNotifications } from "../context/NotificationContext";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const buildPanelQuote = (quote) => {
  if (!quote) return null;

  return {
    "05. price": String(quote.currentPrice),
    "09. change": String(quote.change || 0),
    "10. change percent": `${quote.changePercent || 0}%`,
  };
};

const buildStockDetails = (stock) => ({
  symbol: stock.symbol,
  name: stock.companyName,
});

const WatchlistTable = ({
  stocks,
  quoteMap,
  loading,
  error,
  removingSymbol,
  onSelect,
  onTrade,
  onRemove,
  onSearchStocks,
}) => {
  if (error) {
    return (
      <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-8 text-sm text-red-400">
        {error}
      </section>
    );
  }

  if (loading) {
    return (
      <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-8 text-sm text-[#8a93a3]">
        Loading watchlist...
      </section>
    );
  }

  if (stocks.length === 0) {
    return (
      <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-10">
        <div className="flex flex-col items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#f5f7fa]">
              No stocks in your watchlist
            </h2>
            <p className="mt-1 text-sm text-[#8a93a3]">
              Search stocks from Dashboard and add them to your watchlist.
            </p>
          </div>
          <button
            type="button"
            onClick={onSearchStocks}
            className="rounded-md bg-[#2f6fed] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#4a80ff]"
          >
            Search Stocks
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[#1e2530] bg-[#11161f]">
      <div className="border-b border-[#1e2530] px-4 py-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-[#8a93a3]">
          Watchlist Table
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[#1e2530]">
              {["Symbol", "Company Name", "Current Price", "Change %", "Actions"].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const quote = quoteMap[String(stock.symbol).toUpperCase()];
              const currentPrice = Number(quote?.currentPrice);
              const changePercent = Number(quote?.changePercent);
              const hasPrice = Number.isFinite(currentPrice);
              const hasChange = Number.isFinite(changePercent);
              const isPositive = !hasChange || changePercent >= 0;

              return (
                <tr
                  key={stock.symbol}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(stock)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(stock);
                    }
                  }}
                  className="border-b border-[#1e2530] last:border-0 transition hover:bg-[#1a2030]"
                >
                  <td className="px-4 py-3 text-[13px] font-medium text-[#f5f7fa]">
                    {stock.symbol}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                    <div className="max-w-[280px] truncate">{stock.companyName}</div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                    {hasPrice ? `₹${fmt(currentPrice)}` : "--"}
                  </td>
                  <td className="px-4 py-3">
                    {hasChange ? (
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        isPositive
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {isPositive ? "+" : ""}
                        {changePercent.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#8a93a3]">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onTrade("BUY", stock);
                        }}
                        disabled={!hasPrice}
                        className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Buy
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onTrade("SELL", stock);
                        }}
                        disabled={!hasPrice}
                        className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Sell
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove(stock.symbol);
                        }}
                        disabled={removingSymbol === stock.symbol}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#8a93a3] transition hover:bg-[#2a3344] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Remove ${stock.symbol} from watchlist`}
                      >
                        <Trash2 size={14} strokeWidth={1.8} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const Watchlist = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [watchlist, setWatchlist] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [removingSymbol, setRemovingSymbol] = useState("");
  const [orderType, setOrderType] = useState(null);
  const [orderStock, setOrderStock] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");

  const symbols = useMemo(
    () => watchlist.map((stock) => stock.symbol),
    [watchlist]
  );
  const {
    quoteMap,
    loading: quotesLoading,
    error: quotesError,
  } = useQuoteSubscription("watchlist-page", symbols);

  const loadWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getWatchlist();

      setWatchlist(data);
      setSelectedStock((current) => {
        if (!current) return current;

        return data.some((stock) => stock.symbol === current.symbol) ? current : null;
      });
    } catch (err) {
      setError(err.message || "Failed to load watchlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadWatchlist, 0);

    return () => window.clearTimeout(timer);
  }, [loadWatchlist]);

  const filteredWatchlist = useMemo(() => {
    const term = query.trim().toUpperCase();

    if (!term) return watchlist;

    return watchlist.filter((stock) =>
      stock.symbol.toUpperCase().includes(term) ||
      stock.companyName.toUpperCase().includes(term)
    );
  }, [query, watchlist]);

  const selectedQuote = selectedStock
    ? quoteMap[String(selectedStock.symbol).toUpperCase()]
    : null;
  const selectedPanelStock = selectedStock
    ? buildStockDetails(selectedStock)
    : null;
  const selectedPanelQuote = buildPanelQuote(selectedQuote);
  const selectedLoading = Boolean(selectedStock) && quotesLoading && !selectedQuote;
  const pageError = error || quotesError;

  const handleSelectStock = (stock) => {
    setSelectedStock(stock);
    setActionError("");
  };

  const handleOpenOrder = (type, stock) => {
    setSelectedStock(stock);
    setOrderStock(stock);
    setOrderType(type);
    setOrderError("");
  };

  const handleCloseOrder = () => {
    if (orderLoading) return;

    setOrderType(null);
    setOrderStock(null);
    setOrderError("");
  };

  const handleRemoveStock = async (symbol) => {
    try {
      setRemovingSymbol(symbol);
      setActionError("");

      await removeFromWatchlist(symbol);

      setWatchlist((current) => current.filter((stock) => stock.symbol !== symbol));
      setSelectedStock((current) => current?.symbol === symbol ? null : current);
      addNotification({
        type: "info",
        title: "Removed from Watchlist",
        message: `${symbol} has been removed from your watchlist.`,
      });
    } catch (err) {
      setActionError(err.message || "Failed to remove stock from watchlist.");
    } finally {
      setRemovingSymbol("");
    }
  };

  const handleConfirmTrade = async ({ type, stock, quantity, price, orderType: selectedOrderType, limitPrice, triggerPrice }) => {
    try {
      setOrderLoading(true);
      setOrderError("");

      const fmtPrice = (n) => Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

        addNotification({
          type: "info",
          title: `${selectedOrderType} Order Placed`,
          message: `${selectedOrderType} ${type} for ${quantity} share${quantity !== 1 ? "s" : ""} of ${stock.symbol} is pending.`,
        });
      } else {
        if (type === "SELL") {
          await sellStock({ symbol: stock.symbol, companyName: stock.name, quantity, price });
        } else {
          await buyStock({ symbol: stock.symbol, companyName: stock.name, quantity, price });
        }

        addNotification({
          type: "success",
          title: `${type === "SELL" ? "Sell" : "Buy"} Order Executed`,
          message: `${type === "SELL" ? "Sold" : "Bought"} ${quantity} share${quantity !== 1 ? "s" : ""} of ${stock.symbol} at ₹${fmtPrice(price)}.`,
        });
      }

      setOrderType(null);
      setOrderStock(null);
    } catch (err) {
      setOrderError(err.message || "Failed to submit trade.");
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <OrderModal
        isOpen={Boolean(orderType)}
        type={orderType}
        stock={orderStock ? buildStockDetails(orderStock) : null}
        quote={buildPanelQuote(
          orderStock ? quoteMap[String(orderStock.symbol).toUpperCase()] : null
        )}
        onClose={handleCloseOrder}
        onConfirm={handleConfirmTrade}
        loading={orderLoading}
        error={orderError}
      />

      <div className="flex max-w-[1400px] flex-col gap-5">
        <header className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#2f6fed]">
            Watchlist
          </p>
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">
            Market Watch
          </h1>
          <p className="max-w-3xl text-sm text-[#8a93a3]">
            Monitor saved stocks with live prices and place orders from the same workflow.
          </p>
        </header>

        <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
          <label className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
              Search Watchlist
            </span>
            <div className="flex h-11 items-center gap-3 rounded-lg border border-[#1e2530] bg-[#0d1117] px-3">
              <Search size={16} className="text-[#8a93a3]" strokeWidth={1.8} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by symbol or company name"
                className="h-full w-full bg-transparent text-sm text-[#f5f7fa] outline-none placeholder:text-[#8a93a3]"
              />
            </div>
          </label>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_0.9fr]">
          <div className="flex flex-col gap-3">
            <WatchlistTable
              stocks={filteredWatchlist}
              quoteMap={quoteMap}
              loading={loading}
              error={pageError}
              removingSymbol={removingSymbol}
              onSelect={handleSelectStock}
              onTrade={handleOpenOrder}
              onRemove={handleRemoveStock}
              onSearchStocks={() => navigate("/dashboard")}
            />
            {actionError ? (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {actionError}
              </div>
            ) : null}
          </div>

          <StockDetailPanel
            stock={selectedPanelStock}
            quote={selectedPanelQuote}
            loading={selectedLoading}
            error={selectedStock && !selectedQuote && quotesError ? "Failed to load stock quote." : ""}
            onTradeClick={(type) => selectedStock && handleOpenOrder(type, selectedStock)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Watchlist;
