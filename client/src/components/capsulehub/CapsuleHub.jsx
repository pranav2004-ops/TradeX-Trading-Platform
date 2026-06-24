import { useMemo } from "react";
import BestPerformerCard from "./BestPerformerCard";
import MarketStatusCard from "./MarketStatusCard";
import PortfolioValueCard from "./PortfolioValueCard";
import QuickActions from "./QuickActions";
import SnapshotCards from "./SnapshotCards";
import WorstPerformerCard from "./WorstPerformerCard";

const CapsuleHub = ({
  summary,
  holdings = [],
  quoteMap = {},
  summaryLoading = false,
  holdingsLoading = false,
  quotesLoading = false,
  summaryError = "",
  holdingsError = "",
  quotesError = "",
  lastUpdatedAt = null,
}) => {
  const visiblePerformers = useMemo(() => {
    return holdings
      .map((holding) => {
        const currentPrice = Number(
          quoteMap[String(holding.symbol).toUpperCase()]?.currentPrice
        );
        const averagePrice = Number(holding.averagePrice);

        if (!Number.isFinite(currentPrice) || !Number.isFinite(averagePrice) || averagePrice <= 0) {
          return null;
        }

        return {
          symbol: holding.symbol,
          currentPrice,
          gainPercent: ((currentPrice - averagePrice) / averagePrice) * 100,
        };
      })
      .filter(Boolean);
  }, [holdings, quoteMap]);

  const bestPerformer = useMemo(() => {
    if (visiblePerformers.length === 0) return null;

    return visiblePerformers.reduce((best, item) =>
      item.gainPercent > best.gainPercent ? item : best
    );
  }, [visiblePerformers]);

  const worstPerformer = useMemo(() => {
    if (visiblePerformers.length === 0) return null;

    return visiblePerformers.reduce((worst, item) =>
      item.gainPercent < worst.gainPercent ? item : worst
    );
  }, [visiblePerformers]);

  const loading = summaryLoading || holdingsLoading;
  const performerLoading = holdingsLoading || (holdings.length > 0 && quotesLoading);
  const performerError = holdings.length > 0 ? holdingsError || quotesError : "";

  return (
    <section className="rounded-lg border border-[#1e2530] bg-[#0d1117] p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#2f6fed]">
            Capsule Hub
          </p>
          <h2 className="text-xl font-semibold text-[#f5f7fa]">
            Portfolio Intelligence
          </h2>
        </div>
        <p className="text-sm text-[#8a93a3]">Health, exposure, and trading status</p>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1.8fr]">
        <PortfolioValueCard
          summary={summary}
          loading={summaryLoading}
          error={summaryError}
        />
        <SnapshotCards
          summary={summary}
          holdings={holdings}
          loading={loading}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <BestPerformerCard
          performer={bestPerformer}
          loading={performerLoading}
          error={performerError}
        />
        <WorstPerformerCard
          performer={worstPerformer}
          loading={performerLoading}
          error={performerError}
        />
        <MarketStatusCard lastUpdatedAt={lastUpdatedAt} />
        <QuickActions />
      </div>
    </section>
  );
};

export default CapsuleHub;
