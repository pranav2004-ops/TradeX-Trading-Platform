import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import PortfolioSummary from "../components/dashboard/PortfolioSummary";
import Watchlist from "../components/dashboard/Watchlist";
import HoldingsTable from "../components/dashboard/HoldingsTable";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import PendingOrdersWidget from "../components/dashboard/PendingOrdersWidget";
import StockDetailPanel from "../components/dashboard/StockDetailPanel";
import OrderModal from "../components/dashboard/OrderModal";
import CapsuleHub from "../components/capsulehub";
import PortfolioPerformanceCard from "../components/analytics/PortfolioPerformanceCard";
import PnLAnalytics from "../components/analytics/PnLAnalytics";
import SectorAllocation from "../components/analytics/SectorAllocation";
import { useQuoteSubscription } from "../context/QuoteContext";
import { useNotifications } from "../context/NotificationContext";
import {
  buyStock,
  sellStock,
  placeOrder,
  getHoldings,
  getTradeHistory,
  getTradeSummary,
} from "../api/tradeApi";

const formatUpdatedAgo = (timestamp, now) => {
  if (!timestamp) return "Updating...";

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (seconds < 5) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);

  return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
};

const buildQuoteFromBatch = (quote) => ({
  "05. price": String(quote.currentPrice),
  "09. change": String(quote.change),
  "10. change percent": `${quote.changePercent}%`,
});

const Dashboard = () => {
  const { addNotification } = useNotifications();
  const [selectedStock, setSelectedStock] = useState(null);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [holdingsError, setHoldingsError] = useState("");
  const [transactionsError, setTransactionsError] = useState("");
  const [performanceRefreshKey, setPerformanceRefreshKey] = useState(0);
  const [orderType, setOrderType] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [now, setNow] = useState(0);
  const pendingOrderTypeRef = useRef(null);
  const skipNextQuoteFetchRef = useRef("");
  const [, setLastTrade] = useState(null);

  const holdingSymbols = useMemo(
    () => holdings.map((holding) => holding.symbol),
    [holdings]
  );
   const {
    quoteMap: holdingQuoteMap,
    loading: holdingQuotesLoading,
    error: holdingQuotesError,
    lastUpdatedAt,
    refreshQuotes,
  } = useQuoteSubscription("dashboard-holdings", holdingSymbols);

  const { liveHoldingsValue, unrealizedPnL, dayPnL, pnlAvailable } = useMemo(() => {
    let liveVal = 0;
    let pnlSum = 0;
    let dayPnLSum = 0;
    let anyPrice = false;

    for (const h of holdings) {
      const quote = holdingQuoteMap[String(h.symbol).toUpperCase()];
      const price = Number(quote?.currentPrice);
      const prevClose = Number(quote?.previousClose);

      if (Number.isFinite(price) && price > 0) {
        const currentVal = price * h.quantity;
        liveVal += currentVal;
        pnlSum += currentVal - h.investedAmount;
        anyPrice = true;

        const fallbackPrevClose = Number.isFinite(prevClose) && prevClose > 0 ? prevClose : price;
        dayPnLSum += (price - fallbackPrevClose) * h.quantity;
      } else {
        liveVal += h.investedAmount;
      }
    }

    return { liveHoldingsValue: liveVal, unrealizedPnL: pnlSum, dayPnL: dayPnLSum, pnlAvailable: anyPrice };
  }, [holdings, holdingQuoteMap]);
  
  const selectedSymbol = selectedStock?.["1. symbol"] || "";
  const selectedSymbols = useMemo(
    () => (selectedSymbol ? [selectedSymbol] : []),
    [selectedSymbol]
  );
 

  useQuoteSubscription("dashboard-selected-stock", selectedSymbols);

  const buildStockFromHolding = (holding) => ({
    "1. symbol": holding.symbol,
    "2. name": holding.companyName,
  });

  const buildStockFromWatchlist = (stock) => ({
    "1. symbol": stock.symbol,
    "2. name": stock.companyName,
    "4. region": stock.exchange,
  });

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError("");

      const data = await getTradeSummary();

      setSummary(data);
    } catch (err) {
      setSummaryError(err.message || "Failed to load portfolio summary.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadHoldings = useCallback(async () => {
    try {
      setHoldingsLoading(true);
      setHoldingsError("");

      const data = await getHoldings();

      setHoldings(data);
    } catch (err) {
      setHoldingsError(err.message || "Failed to load holdings.");
    } finally {
      setHoldingsLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      setTransactionsError("");

      const data = await getTradeHistory();

      setTransactions(data);
    } catch (err) {
      setTransactionsError(err.message || "Failed to load transactions.");
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  const loadDashboardData = useCallback(() => {
    return Promise.all([
      loadSummary(),
      loadHoldings(),
      loadTransactions(),
    ]);
  }, [loadHoldings, loadSummary, loadTransactions]);

  useEffect(() => {
    const timer = setTimeout(loadDashboardData, 0);

    return () => clearTimeout(timer);
  }, [loadDashboardData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedStock) {
      return;
    }

    const symbol = selectedStock["1. symbol"];
    const batchQuote = holdingQuoteMap[String(symbol).toUpperCase()];

    if (skipNextQuoteFetchRef.current === symbol) {
      skipNextQuoteFetchRef.current = "";
      return;
    }

    const quoteUpdateId = window.setTimeout(() => {
      if (batchQuote) {
        setQuote(buildQuoteFromBatch(batchQuote));
        setError("");

        if (pendingOrderTypeRef.current) {
          setOrderType(pendingOrderTypeRef.current);
          pendingOrderTypeRef.current = null;
        }
      } else if (holdingQuotesError) {
        setError("Failed to load stock quote.");
        pendingOrderTypeRef.current = null;
      }
    }, 0);

    return () => window.clearTimeout(quoteUpdateId);
  }, [holdingQuoteMap, holdingQuotesError, selectedStock]);

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setQuote(null);
    setError("");
    pendingOrderTypeRef.current = null;
  };

  const handleHoldingTrade = (type, holding) => {
    const stock = buildStockFromHolding(holding);
    const batchQuote = holdingQuoteMap[String(holding.symbol).toUpperCase()];

    setSelectedStock(stock);
    setQuote(batchQuote ? buildQuoteFromBatch(batchQuote) : null);
    setError("");
    setOrderError("");
    pendingOrderTypeRef.current = batchQuote ? null : type;

    if (batchQuote) {
      skipNextQuoteFetchRef.current = holding.symbol;
      setOrderType(type);
    }
  };

  const handleWatchlistTrade = (type, watchlistStock) => {
    const stock = buildStockFromWatchlist(watchlistStock);

    setSelectedStock(stock);
    setQuote(null);
    setError("");
    setOrderError("");
    pendingOrderTypeRef.current = type;
  };

  const selectedStockDetails = selectedStock
    ? {
        symbol: selectedStock["1. symbol"],
        name: selectedStock["2. name"],
      }
    : null;
  const selectedQuoteLoading = Boolean(selectedStock) && holdingQuotesLoading && !quote;
  const updatedText = formatUpdatedAgo(lastUpdatedAt, now);

  const handleTradeClick = (type) => {
    setOrderError("");
    setOrderType(type);
  };

  const handleCloseOrderModal = () => {
    if (orderLoading) return;

    setOrderType(null);
    setOrderError("");
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
        const trade = type === "SELL"
          ? await sellStock({ symbol: stock.symbol, companyName: stock.name, quantity, price })
          : await buyStock({ symbol: stock.symbol, companyName: stock.name, quantity, price });

        const executedPrice = trade?.trade?.price ?? price;
        setLastTrade(trade);
        addNotification({
          type: "success",
          title: `${type === "SELL" ? "Sell" : "Buy"} Order Executed`,
          message: `${type === "SELL" ? "Sold" : "Bought"} ${quantity} share${quantity !== 1 ? "s" : ""} of ${stock.symbol} at ₹${fmtPrice(executedPrice)}.`,
        });
      }

      await loadDashboardData();
      await refreshQuotes();
      setPerformanceRefreshKey((current) => current + 1);
      setOrderType(null);
    } catch (err) {
      setOrderError(err.message || "Failed to submit trade");
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <DashboardLayout onStockSelect={handleStockSelect}>
      <OrderModal
        isOpen={Boolean(orderType)}
        type={orderType}
        stock={selectedStockDetails}
        quote={quote}
        onClose={handleCloseOrderModal}
        onConfirm={handleConfirmTrade}
        loading={orderLoading}
        error={orderError}
      />

      <div className="flex flex-col gap-5 max-w-[1400px]">
        <div className="flex justify-end">
          <p className="text-xs text-[#8a93a3]">{updatedText}</p>
        </div>

        <StockDetailPanel
          stock={selectedStockDetails}
          quote={quote}
          loading={selectedQuoteLoading}
          error={error}
          onTradeClick={handleTradeClick}
          onClose={() => setSelectedStock(null)}
          hideWhenNull={true}
        />

        <CapsuleHub
          summary={summary}
          holdings={holdings}
          quoteMap={holdingQuoteMap}
          summaryLoading={summaryLoading}
          holdingsLoading={holdingsLoading}
          quotesLoading={holdingQuotesLoading}
          summaryError={summaryError}
          holdingsError={holdingsError}
          quotesError={holdingQuotesError}
          lastUpdatedAt={lastUpdatedAt}
        />

        <PortfolioPerformanceCard refreshKey={performanceRefreshKey} />

        <PnLAnalytics
          holdings={holdings}
          quoteMap={holdingQuoteMap}
          quotesLoading={holdingQuotesLoading}
        />

        <SectorAllocation holdings={holdings} />

        <PortfolioSummary
          summary={summary}
          loading={summaryLoading}
          error={summaryError}
          liveHoldingsValue={liveHoldingsValue}
          unrealizedPnL={unrealizedPnL}
          dayPnL={dayPnL}
          pnlAvailable={pnlAvailable}
          quotesLoading={holdingQuotesLoading}
        />

        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
          <Watchlist
            selectedStock={selectedStock}
            onSelectStock={handleStockSelect}
            onTrade={handleWatchlistTrade}
          />
          <HoldingsTable
            holdings={holdings}
            quoteMap={holdingQuoteMap}
            loading={holdingsLoading}
            error={holdingsError}
            onTrade={handleHoldingTrade}
          />
        </div>

        <PendingOrdersWidget refreshTrigger={performanceRefreshKey} />

        <RecentTransactions
          transactions={transactions}
          loading={transactionsLoading}
          error={transactionsError}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
