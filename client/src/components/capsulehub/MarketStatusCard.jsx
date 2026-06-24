import { Clock } from "lucide-react";
import useMarketStatus from "../../hooks/useMarketStatus";

const formatTime = (timestamp) => {
  if (!timestamp) return "--";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
};

const MarketStatusCard = ({ lastUpdatedAt }) => {
  const { state, nextEvent, isOpen, timeStr } = useMarketStatus();

  return (
    <div className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
              Market Status
            </p>
            <span className="text-[10px] text-[#4f5867]">{timeStr} IST</span>
          </div>
          <p className={`mt-2 text-lg font-semibold ${
            isOpen ? "text-emerald-400" : "text-[#f5f7fa]"
          }`}>
            {state}
          </p>
          <div className="mt-1 flex flex-col gap-0.5">
             <p className="text-xs text-[#8a93a3]">
                {nextEvent}
             </p>
             <p className="text-[10px] text-[#4f5867]">
                Quotes updated {formatTime(lastUpdatedAt)}
             </p>
          </div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${
           isOpen ? "bg-emerald-500/10 text-emerald-400" : "bg-[#2f6fed]/10 text-[#2f6fed]"
        }`}>
          <Clock size={17} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
};

export default MarketStatusCard;
