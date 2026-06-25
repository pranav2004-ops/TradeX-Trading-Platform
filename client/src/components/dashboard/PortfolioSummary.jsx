import { TrendingUp, Wallet, Briefcase, IndianRupee, ArrowUpRight, Percent } from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const StatCard = ({ label, value, sub, trend, icon: Icon }) => {
  const isUp = trend === "up";
  const isDown = trend === "down";

  return (
    <div className="bg-[#11161f] border border-[#1e2530] rounded-lg px-4 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#8a93a3] uppercase tracking-wider">{label}</span>
        <div className="w-7 h-7 rounded-md bg-[#1e2530] flex items-center justify-center">
          <Icon size={13} className="text-[#8a93a3]" strokeWidth={1.8} />
        </div>
      </div>
      <div>
        <p className={`text-xl font-semibold tracking-tight ${isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-[#f5f7fa]"}`}>
          {value}
        </p>
        <p className={`text-xs mt-0.5 ${isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-[#8a93a3]"}`}>{sub}</p>
      </div>
    </div>
  );
};

const PortfolioSummary = ({
  summary,
  loading,
  error,
  liveHoldingsValue = 0,
  unrealizedPnL = 0,
  dayPnL = 0,
  pnlAvailable = false,
  quotesLoading = false,
}) => {
  const cash = summary?.cash || 0;
  const investedAmount = summary?.investedAmount || 0;
  const realizedPnL = summary?.realizedPnL || 0;
  const holdingsCount = summary?.holdingsCount || 0;

  const portfolioValue = cash + liveHoldingsValue;
  const totalPnL = realizedPnL + unrealizedPnL;
  const totalReturnPct = investedAmount > 0 ? (totalPnL / investedAmount) * 100 : 0;

  const dayPnLSign = dayPnL >= 0 ? "+" : "-";
  const dayPnLTrend = dayPnL >= 0 ? "up" : "down";

  const realizedPnLSign = realizedPnL >= 0 ? "+" : "-";
  const realizedPnLTrend = realizedPnL >= 0 ? "up" : "down";

  const totalPnLSign = totalPnL >= 0 ? "+" : "-";
  const totalPnLTrend = totalPnL >= 0 ? "up" : "down";

  const pnlSign = unrealizedPnL >= 0 ? "+" : "-";
  const pnlTrend = pnlAvailable ? (unrealizedPnL >= 0 ? "up" : "down") : "neutral";
  const portfolioSub = error
    ? error
    : pnlAvailable
    ? `${pnlSign}₹${fmt(Math.abs(unrealizedPnL))} unrealized`
    : quotesLoading
    ? "Fetching live prices..."
    : `${holdingsCount} holdings`;

  const stats = [
    {
      label: "Portfolio Value",
      value: loading ? "--" : `₹${fmt(portfolioValue)}`,
      sub: portfolioSub,
      trend: pnlTrend,
      icon: Briefcase,
    },
    {
      label: "Day P&L",
      value: loading ? "--" : `₹${fmt(dayPnL)}`,
      sub: `${dayPnLSign}₹${fmt(Math.abs(dayPnL))} today`,
      trend: dayPnLTrend,
      icon: ArrowUpRight,
    },
    {
      label: "Realized P&L",
      value: loading ? "--" : `₹${fmt(realizedPnL)}`,
      sub: `${realizedPnLSign}₹${fmt(Math.abs(realizedPnL))} booked`,
      trend: realizedPnLTrend,
      icon: Percent,
    },
    {
      label: "Total Net Returns",
      value: loading ? "--" : `₹${fmt(totalPnL)}`,
      sub: `${totalPnLSign}${totalReturnPct.toFixed(2)}% overall`,
      trend: totalPnLTrend,
      icon: TrendingUp,
    },
    {
      label: "Available Cash",
      value: loading ? "--" : `₹${fmt(cash)}`,
      sub: "Cash balance",
      trend: "neutral",
      icon: Wallet,
    },
    {
      label: "Invested Amount",
      value: loading ? "--" : `₹${fmt(investedAmount)}`,
      sub: "Book value",
      trend: "neutral",
      icon: IndianRupee,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
};

export default PortfolioSummary;
