import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Card, { CardHeader, CardContent, CardTitle } from "../ui/card";
import {
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
} from "../../api/watchlistApi";
import { useNotifications } from "../../context/NotificationContext";

const getSelectedStockPayload = (stock) => {
  if (!stock) return null;

  return {
    symbol: stock["1. symbol"],
    companyName: stock["2. name"],
    exchange: stock["4. region"] || stock["8. currency"] || "Unknown",
  };
};

const WatchlistRow = ({
  symbol,
  companyName,
  exchange,
  onRemove,
  onSelect,
  onTrade,
  removing,
}) => {
  const handleAction = (event, action) => {
    event.stopPropagation();
    onTrade?.(action, { symbol, companyName, exchange });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect({ symbol, companyName, exchange })}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect({ symbol, companyName, exchange });
        }
      }}
      className="group flex w-full items-center justify-between py-2.5 border-b border-[#1e2530] last:border-0 hover:bg-[#1a2030] -mx-4 px-4 transition-colors text-left"
    >
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-[#f5f7fa] leading-tight">{symbol}</span>
        <span className="text-[11px] text-[#8a93a3] mt-0.5">{companyName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#8a93a3] transition group-hover:hidden">{exchange}</span>
        <div className="hidden items-center gap-1 group-hover:flex">
          <button
            type="button"
            onClick={(event) => handleAction(event, "BUY")}
            className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-400 transition hover:bg-emerald-500/20"
          >
            Buy
          </button>
          <button
            type="button"
            onClick={(event) => handleAction(event, "SELL")}
            className="rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20"
          >
            Sell
          </button>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(symbol);
          }}
          disabled={removing}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#8a93a3] transition hover:bg-[#2a3344] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Remove ${symbol} from watchlist`}
        >
          <Trash2 size={13} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
};

const Watchlist = ({ selectedStock, onSelectStock, onTrade }) => {
  const { addNotification } = useNotifications();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingSymbol, setRemovingSymbol] = useState("");

  const selectedStockPayload = useMemo(
    () => getSelectedStockPayload(selectedStock),
    [selectedStock]
  );

  const selectedSymbol = selectedStockPayload?.symbol;
  const selectedAlreadyExists = selectedSymbol
    ? watchlist.some((item) => item.symbol === selectedSymbol.toUpperCase())
    : false;
  const addTitle = !selectedStockPayload
    ? "Search and select a stock first"
    : selectedAlreadyExists
      ? "Selected stock is already in watchlist"
      : "Add selected stock to watchlist";

  useEffect(() => {
    const loadWatchlist = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getWatchlist();

        setWatchlist(data);
      } catch (err) {
        setError(err.message || "Failed to load watchlist.");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(loadWatchlist, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleAddSelectedStock = async () => {
    if (!selectedStockPayload) {
      setActionError("Search and select a stock first.");
      return;
    }

    if (selectedAlreadyExists) {
      setActionError(`${selectedStockPayload.symbol} is already in watchlist.`);
      return;
    }

    if (adding) return;

    try {
      setAdding(true);
      setActionError("");

      const item = await addToWatchlist(selectedStockPayload);

      setWatchlist((current) => [item, ...current]);
      addNotification({
        type: "success",
        title: "Added to Watchlist",
        message: `${selectedStockPayload.symbol} has been added to your watchlist.`,
      });
    } catch (err) {
      setActionError(err.message || "Failed to add stock to watchlist.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStock = async (symbol) => {
    try {
      setRemovingSymbol(symbol);
      setActionError("");

      await removeFromWatchlist(symbol);

      setWatchlist((current) => current.filter((item) => item.symbol !== symbol));
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

  const handleSelectStock = (stock) => {
    onSelectStock?.({
      "1. symbol": stock.symbol,
      "2. name": stock.companyName,
      "4. region": stock.exchange,
    });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Watchlist</CardTitle>
        <button
          type="button"
          onClick={handleAddSelectedStock}
          disabled={adding}
          className="w-6 h-6 rounded-md bg-[#1e2530] hover:bg-[#2a3344] flex items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Add selected stock to watchlist"
          title={addTitle}
        >
          <Plus size={13} className="text-[#8a93a3]" />
        </button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0 px-4">
        {error ? (
          <div className="py-8 text-sm text-red-400">{error}</div>
        ) : loading ? (
          <div className="py-8 text-sm text-[#8a93a3]">Loading watchlist...</div>
        ) : watchlist.length === 0 ? (
          <div className="py-8 text-sm text-[#8a93a3]">
            Search and select a stock, then press + to add it.
          </div>
        ) : (
          watchlist.map((stock) => (
            <WatchlistRow
              key={stock.symbol}
              {...stock}
              onRemove={handleRemoveStock}
              onSelect={handleSelectStock}
              onTrade={onTrade}
              removing={removingSymbol === stock.symbol}
            />
          ))
        )}
        {actionError ? (
          <div className="py-3 text-xs text-red-400">{actionError}</div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default Watchlist;
