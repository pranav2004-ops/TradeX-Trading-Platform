import { TrendingDown } from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const WorstPerformerCard = ({ performer, loading, error }) => {
  const value = performer?.gainPercent ?? 0;
  const isLoss = value < 0;

  return (
    <div className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            Worst Performer
          </p>
          <p className="mt-1 text-sm text-[#8a93a3]">Lowest current gain</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500/10 text-red-400">
          <TrendingDown size={16} strokeWidth={1.8} />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[#8a93a3]">Loading quotes...</p>
      ) : performer ? (
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xl font-semibold text-[#f5f7fa]">
                {performer.symbol}
              </p>
              <p className="mt-0.5 text-xs text-[#8a93a3]">
                Current Price ₹{fmt(performer.currentPrice)}
              </p>
            </div>
            <p className={`text-lg font-semibold ${isLoss ? "text-red-400" : "text-emerald-400"}`}>
              {value > 0 ? "+" : ""}
              {value.toFixed(2)}%
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#8a93a3]">
          {error || "No holdings with quote data."}
        </p>
      )}
    </div>
  );
};

export default WorstPerformerCard;
