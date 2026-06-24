import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  Layers,
  PieChart,
} from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const InsightCard = ({ icon: Icon, iconColor, label, primary, secondary, tone }) => {
  const primaryColor =
    tone === "profit"
      ? "text-emerald-400"
      : tone === "loss"
      ? "text-red-400"
      : "text-[#f5f7fa]";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 py-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#1e2530]">
          <Icon size={14} className={iconColor} strokeWidth={1.8} />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
          {label}
        </p>
      </div>
      <div>
        <p className={`text-lg font-semibold leading-tight ${primaryColor}`}>
          {primary}
        </p>
        {secondary ? (
          <p className="mt-0.5 text-xs text-[#8a93a3]">{secondary}</p>
        ) : null}
      </div>
    </div>
  );
};

const AllocationBar = ({ cashPercent, investedPercent }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between text-xs text-[#8a93a3]">
      <span>Cash</span>
      <span>Invested</span>
    </div>
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#1e2530]">
      <div
        className="h-full rounded-l-full bg-[#2f6fed] transition-all"
        style={{ width: `${cashPercent}%` }}
      />
      <div
        className="h-full rounded-r-full bg-emerald-500 transition-all"
        style={{ width: `${investedPercent}%` }}
      />
    </div>
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-[#2f6fed]">
        {cashPercent.toFixed(1)}% Cash
      </span>
      <span className="font-medium text-emerald-400">
        {investedPercent.toFixed(1)}% Invested
      </span>
    </div>
  </div>
);

const PortfolioInsights = ({
  holdings = [],
  quoteMap = {},
  summary = null,
  quotesLoading = false,
}) => {
  const insights = useMemo(() => {
    // Enrich each holding with live price data
    const enriched = holdings
      .map((holding) => {
        const quote = quoteMap[String(holding.symbol).toUpperCase()];
        const currentPrice = Number(quote?.currentPrice);
        const quantity = Number(holding.quantity);
        const averagePrice = Number(holding.averagePrice);
        const investedAmount = Number(holding.investedAmount || 0);

        if (
          !Number.isFinite(currentPrice) ||
          currentPrice <= 0 ||
          !Number.isFinite(quantity)
        ) {
          return null;
        }

        const currentValue = currentPrice * quantity;
        const pnl = currentValue - investedAmount;
        const pnlPercent =
          averagePrice > 0
            ? ((currentPrice - averagePrice) / averagePrice) * 100
            : 0;

        return {
          symbol: holding.symbol,
          companyName: holding.companyName,
          quantity,
          averagePrice,
          investedAmount,
          currentPrice,
          currentValue,
          pnl,
          pnlPercent,
        };
      })
      .filter(Boolean);

    const best = enriched.length
      ? enriched.reduce((a, b) => (a.pnlPercent > b.pnlPercent ? a : b))
      : null;

    const worst = enriched.length
      ? enriched.reduce((a, b) => (a.pnlPercent < b.pnlPercent ? a : b))
      : null;

    const largest = holdings.length
      ? [...holdings].sort(
          (a, b) => Number(b.investedAmount) - Number(a.investedAmount)
        )[0]
      : null;

    const winningCount = enriched.filter((p) => p.pnl >= 0).length;
    const losingCount = enriched.filter((p) => p.pnl < 0).length;

    const totalInvested = holdings.reduce(
      (sum, h) => sum + Number(h.investedAmount || 0),
      0
    );

    const cash = Number(summary?.cash || 0);
    const totalPortfolio = cash + totalInvested;
    const cashPercent = totalPortfolio > 0 ? (cash / totalPortfolio) * 100 : 0;
    const investedPercent =
      totalPortfolio > 0 ? (totalInvested / totalPortfolio) * 100 : 0;

    return {
      best,
      worst,
      largest,
      winningCount,
      losingCount,
      totalHoldings: holdings.length,
      totalInvested,
      cash,
      totalPortfolio,
      cashPercent,
      investedPercent,
      hasLiveData: enriched.length > 0,
    };
  }, [holdings, quoteMap, summary]);

  return (
    <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            Portfolio Insights
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#f5f7fa]">
            Position Intelligence
          </h2>
        </div>
        <PieChart size={18} className="text-[#2f6fed]" strokeWidth={1.8} />
      </div>

      {quotesLoading && !insights.hasLiveData ? (
        <div className="py-8 text-sm text-[#8a93a3]">
          Loading insights...
        </div>
      ) : holdings.length === 0 ? (
        <div className="py-8 text-sm text-[#8a93a3]">
          No holdings to analyse.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Insight cards grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InsightCard
              icon={TrendingUp}
              iconColor="text-emerald-400"
              label="Best Performer"
              primary={
                insights.best
                  ? `${insights.best.symbol} +${insights.best.pnlPercent.toFixed(2)}%`
                  : "--"
              }
              secondary={
                insights.best
                  ? `₹${fmt(insights.best.currentPrice)} current`
                  : "No live data"
              }
              tone="profit"
            />

            <InsightCard
              icon={TrendingDown}
              iconColor="text-red-400"
              label="Worst Performer"
              primary={
                insights.worst
                  ? `${insights.worst.symbol} ${insights.worst.pnlPercent.toFixed(2)}%`
                  : "--"
              }
              secondary={
                insights.worst
                  ? `₹${fmt(insights.worst.currentPrice)} current`
                  : "No live data"
              }
              tone={insights.worst && insights.worst.pnl < 0 ? "loss" : "profit"}
            />

            <InsightCard
              icon={Layers}
              iconColor="text-[#2f6fed]"
              label="Largest Holding"
              primary={insights.largest ? insights.largest.symbol : "--"}
              secondary={
                insights.largest
                  ? `₹${fmt(Number(insights.largest.investedAmount))} invested`
                  : ""
              }
            />

            <InsightCard
              icon={Award}
              iconColor="text-emerald-400"
              label="Winning Positions"
              primary={String(insights.winningCount)}
              secondary={`of ${insights.totalHoldings} holdings with live data`}
              tone={insights.winningCount > 0 ? "profit" : "neutral"}
            />

            <InsightCard
              icon={AlertCircle}
              iconColor="text-red-400"
              label="Losing Positions"
              primary={String(insights.losingCount)}
              secondary={`of ${insights.totalHoldings} holdings with live data`}
              tone={insights.losingCount > 0 ? "loss" : "neutral"}
            />

            <InsightCard
              icon={PieChart}
              iconColor="text-[#8a93a3]"
              label="Total Holdings"
              primary={String(insights.totalHoldings)}
              secondary={`₹${fmt(insights.totalInvested)} total invested`}
            />
          </div>

          {/* Allocation bar */}
          <div className="rounded-lg border border-[#1e2530] bg-[#0d1117] px-4 py-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
              Capital Allocation
            </p>
            <AllocationBar
              cashPercent={insights.cashPercent}
              investedPercent={insights.investedPercent}
            />
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#1e2530] pt-3">
              <div>
                <p className="text-[11px] text-[#8a93a3]">Available Cash</p>
                <p className="mt-0.5 text-sm font-semibold text-[#f5f7fa]">
                  ₹{fmt(insights.cash)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-[#8a93a3]">Total Portfolio</p>
                <p className="mt-0.5 text-sm font-semibold text-[#f5f7fa]">
                  ₹{fmt(insights.totalPortfolio)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default PortfolioInsights;
