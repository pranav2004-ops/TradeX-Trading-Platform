import { Activity, BarChart3, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const Metric = ({ label, value, tone = "neutral" }) => {
  const color = tone === "profit"
    ? "text-emerald-400"
    : tone === "loss"
      ? "text-red-400"
      : "text-[#f5f7fa]";

  return (
    <div className="rounded-md border border-[#1e2530] bg-[#0d1117] px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
};

const PnLAnalytics = ({ holdings = [], quoteMap = {}, quotesLoading = false }) => {
  const analytics = useMemo(() => {
    const positions = holdings
      .map((holding) => {
        const quote = quoteMap[String(holding.symbol).toUpperCase()];
        const currentPrice = Number(quote?.currentPrice);
        const quantity = Number(holding.quantity);
        const averagePrice = Number(holding.averagePrice);
        const investedAmount = Number(holding.investedAmount);

        if (!Number.isFinite(currentPrice) || !Number.isFinite(quantity)) {
          return null;
        }

        const currentValue = currentPrice * quantity;
        const pnl = currentValue - investedAmount;
        const pnlPercent = averagePrice > 0
          ? ((currentPrice - averagePrice) / averagePrice) * 100
          : 0;

        return {
          symbol: holding.symbol,
          currentPrice,
          investedAmount,
          currentValue,
          pnl,
          pnlPercent,
        };
      })
      .filter(Boolean);

    const totalInvested = holdings.reduce(
      (total, holding) => total + Number(holding.investedAmount || 0),
      0
    );
    const currentValue = positions.reduce((total, item) => total + item.currentValue, 0);
    const netPnl = currentValue - totalInvested;
    const profitPercent = totalInvested > 0 ? (netPnl / totalInvested) * 100 : 0;
    const best = positions.length
      ? positions.reduce((winner, item) => item.pnlPercent > winner.pnlPercent ? item : winner)
      : null;
    const worst = positions.length
      ? positions.reduce((loser, item) => item.pnlPercent < loser.pnlPercent ? item : loser)
      : null;

    return {
      totalInvested,
      currentValue,
      netPnl,
      profitPercent,
      winningPositions: positions.filter((item) => item.pnl >= 0).length,
      losingPositions: positions.filter((item) => item.pnl < 0).length,
      best,
      worst,
    };
  }, [holdings, quoteMap]);

  const pnlTone = analytics.netPnl >= 0 ? "profit" : "loss";

  return (
    <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            P&amp;L Analytics
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#f5f7fa]">
            Real-Time Position Health
          </h2>
        </div>
        <Activity size={18} className="text-[#2f6fed]" strokeWidth={1.8} />
      </div>

      {quotesLoading ? (
        <div className="py-8 text-sm text-[#8a93a3]">Loading quote analytics...</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Total Invested" value={`₹${fmt(analytics.totalInvested)}`} />
          <Metric label="Current Value" value={`₹${fmt(analytics.currentValue)}`} />
          <Metric label="Net Profit/Loss" value={`₹${fmt(analytics.netPnl)}`} tone={pnlTone} />
          <Metric label="Profit %" value={`${analytics.profitPercent.toFixed(2)}%`} tone={pnlTone} />
          <Metric label="Winning Positions" value={analytics.winningPositions} />
          <Metric label="Losing Positions" value={analytics.losingPositions} />
          <Metric
            label="Best Performer"
            value={analytics.best ? `${analytics.best.symbol} ${analytics.best.pnlPercent.toFixed(2)}%` : "--"}
            tone="profit"
          />
          <Metric
            label="Worst Performer"
            value={analytics.worst ? `${analytics.worst.symbol} ${analytics.worst.pnlPercent.toFixed(2)}%` : "--"}
            tone="loss"
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-[#8a93a3]">
        <span className="flex items-center gap-1">
          <TrendingUp size={13} className="text-emerald-400" />
          Gains use current quote price
        </span>
        <span className="flex items-center gap-1">
          <TrendingDown size={13} className="text-red-400" />
          Losses use average cost
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <BarChart3 size={13} />
          {holdings.length} holdings tracked
        </span>
      </div>
    </section>
  );
};

export default PnLAnalytics;
