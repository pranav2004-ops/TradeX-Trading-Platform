import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import PortfolioPerformanceCard from "../components/analytics/PortfolioPerformanceCard";
import PnLAnalytics from "../components/analytics/PnLAnalytics";
import AdvancedMetrics from "../components/analytics/AdvancedMetrics";
import SectorAllocation from "../components/analytics/SectorAllocation";
import PortfolioInsights from "../components/analytics/PortfolioInsights";
import { getHoldings, getTradeSummary } from "../api/tradeApi";
import { getAdvancedAnalytics } from "../api/analyticsApi";
import { useQuoteSubscription } from "../context/QuoteContext";

const Analytics = () => {
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [advancedData, setAdvancedData] = useState(null);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [advancedLoading, setAdvancedLoading] = useState(true);
  const [holdingsError, setHoldingsError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [advancedError, setAdvancedError] = useState("");

  const symbols = useMemo(
    () => holdings.map((h) => h.symbol),
    [holdings]
  );

  const {
    quoteMap,
    loading: quotesLoading,
    error: quotesError,
  } = useQuoteSubscription("analytics-page", symbols);

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

  const loadAdvancedData = useCallback(async () => {
    try {
      setAdvancedLoading(true);
      setAdvancedError("");
      const data = await getAdvancedAnalytics();
      setAdvancedData(data);
    } catch (err) {
      setAdvancedError(err.message || "Failed to load advanced portfolio analytics.");
    } finally {
      setAdvancedLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadHoldings();
      loadSummary();
      loadAdvancedData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadHoldings, loadSummary, loadAdvancedData]);

  const dataError = holdingsError || quotesError || summaryError || advancedError;

  return (
    <DashboardLayout>
      <div className="flex max-w-[1400px] flex-col gap-5">
        {/* Page header */}
        <header className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#2f6fed]">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">
            Deep Portfolio Analytics
          </h1>
          <p className="max-w-3xl text-sm text-[#8a93a3]">
            Comprehensive view of your portfolio performance, P&amp;L breakdown,
            sector diversification, and position intelligence — powered by live
            market data.
          </p>
        </header>

        {/* Top-level data error */}
        {dataError ? (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {dataError}
          </div>
        ) : null}

        {/* Empty state — user has no holdings yet */}
        {!holdingsLoading && !holdingsError && holdings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#1e2530] bg-[#11161f] py-16 text-center">
            <p className="text-sm font-medium text-[#f5f7fa]">No holdings yet</p>
            <p className="max-w-xs text-xs text-[#8a93a3]">
              Place your first trade on the Dashboard to start seeing portfolio analytics here.
            </p>
          </div>
        ) : null}

        {/* Portfolio performance chart */}
        <PortfolioPerformanceCard />

        {/* P&L Analytics — needs live quoteMap */}
        <PnLAnalytics
          holdings={holdings}
          quoteMap={quoteMap}
          quotesLoading={holdingsLoading || quotesLoading}
        />

        {/* Advanced risk intelligence, SPY benchmark comparison, and asset heatmap */}
        {!holdingsLoading && holdings.length > 0 && (
          <>
            {advancedLoading ? (
              <div className="rounded-lg border border-[#1e2530] bg-[#11161f] p-8 text-center text-xs text-[#8a93a3]">
                Computing advanced portfolio risk statistics and index benchmark metrics...
              </div>
            ) : advancedError ? (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center text-xs text-red-400">
                Failed to load advanced risk and benchmark calculations.
              </div>
            ) : advancedData ? (
              <AdvancedMetrics data={advancedData} />
            ) : null}
          </>
        )}

        {/* Two-column: Sector Allocation + Portfolio Insights */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <SectorAllocation holdings={holdings} />
          <PortfolioInsights
            holdings={holdings}
            quoteMap={quoteMap}
            summary={summary}
            quotesLoading={holdingsLoading || summaryLoading || quotesLoading}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
