import { TrendingUp, Wallet, Briefcase, IndianRupee } from "lucide-react";

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
  pnlAvailable = false,
  quotesLoading = false,
}) => {
  const cash = summary?.cash || 0;
  const investedAmount = summary?.investedAmount || 0;
  const holdingsCount = summary?.holdingsCount || 0;
  const totalPositions = summary?.totalPositions || 0;

  const portfolioValue = cash + liveHoldingsValue;

  const pnlSign = unrealizedPnL >= 0 ? "+" : "-";
  const pnlTrend = pnlAvailable ? (unrealizedPnL >= 0 ? "up" : "down") : "neutral";
  const portfolioSub = error
    ? error
    : pnlAvailable
    ? `${pnlSign}\u20b9${fmt(Math.abs(unrealizedPnL))} unrealized P&L`
    : quotesLoading
    ? "Fetching live prices..."
    : `${holdingsCount} holdings`;

  const stats = [
    {
      label: "Portfolio Value",
      value: loading ? "--" : `\u20b9${fmt(portfolioValue)}`,
      sub: portfolioSub,
      trend: pnlTrend,
      icon: Briefcase,
    },
    {
      label: "Available Cash",
      value: loading ? "--" : `\u20b9${fmt(cash)}`,
      sub: "Cash balance",
      trend: "neutral",
      icon: Wallet,
    },
    {
      label: "Invested Amount",
      value: loading ? "--" : `\u20b9${fmt(investedAmount)}`,
      sub: "Book value",
      trend: "neutral",
      icon: IndianRupee,
    },
    {
      label: "Positions",
      value: loading ? "--" : totalPositions.toLocaleString("en-IN"),
      sub: `${holdingsCount} active stocks`,
      trend: "neutral",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
};

export default PortfolioSummary;
