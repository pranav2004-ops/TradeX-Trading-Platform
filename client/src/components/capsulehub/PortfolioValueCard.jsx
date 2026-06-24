import { Briefcase, IndianRupee, Wallet } from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PortfolioValueCard = ({ summary, loading, error }) => {
  const cash = summary?.cash || 0;
  const investedAmount = summary?.investedAmount || 0;
  const portfolioValue = cash + investedAmount;

  return (
    <div className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            Portfolio Value
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#f5f7fa]">
            {loading ? "--" : `₹${fmt(portfolioValue)}`}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#2f6fed]/10 text-[#2f6fed]">
          <Briefcase size={17} strokeWidth={1.8} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-[#1e2530] bg-[#0d1117] px-3 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            <Wallet size={13} strokeWidth={1.8} />
            Cash Available
          </div>
          <p className="mt-1 text-sm font-semibold text-[#f5f7fa]">
            {loading ? "--" : `₹${fmt(cash)}`}
          </p>
        </div>

        <div className="rounded-md border border-[#1e2530] bg-[#0d1117] px-3 py-2.5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            <IndianRupee size={13} strokeWidth={1.8} />
            Invested Amount
          </div>
          <p className="mt-1 text-sm font-semibold text-[#f5f7fa]">
            {loading ? "--" : `₹${fmt(investedAmount)}`}
          </p>
        </div>
      </div>

      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
    </div>
  );
};

export default PortfolioValueCard;
