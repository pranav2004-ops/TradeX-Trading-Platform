import { useCallback, useEffect, useMemo, useState } from "react";
import PortfolioPerformanceCard from "../components/analytics/PortfolioPerformanceCard";
import PnLAnalytics from "../components/analytics/PnLAnalytics";
import SectorAllocation from "../components/analytics/SectorAllocation";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { getHoldings } from "../api/tradeApi";
import { useQuoteSubscription } from "../context/QuoteContext";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const TopHoldingsTable = ({ holdings = [], loading, error }) => (
  <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
          Top Holdings
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#f5f7fa]">
          Largest Positions by Invested Amount
        </h2>
      </div>
      <span className="text-xs text-[#8a93a3]">{holdings.length} holdings</span>
    </div>

    {error ? (
      <div className="py-8 text-sm text-red-400">{error}</div>
    ) : loading ? (
      <div className="py-8 text-sm text-[#8a93a3]">Loading holdings...</div>
    ) : holdings.length === 0 ? (
      <div className="py-8 text-sm text-[#8a93a3]">No holdings yet.</div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-[#1e2530]">
              {[
                "Symbol",
                "Quantity",
                "Average Price",
                "Current Price",
                "Invested Amount",
                "Current Value",
                "P&L",
                "P&L %",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const hasPrice = Number.isFinite(holding.currentPrice);
              const isProfit = Number(holding.pnl || 0) >= 0;

              return (
                <tr
                  key={holding._id || holding.symbol}
                  className="border-b border-[#1e2530] last:border-0 hover:bg-[#1a2030]"
                >
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium text-[#f5f7fa]">
                      {holding.symbol}
                    </p>
                    <p className="text-[11px] text-[#8a93a3]">{holding.companyName}</p>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                    {holding.quantity}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                    ₹{fmt(holding.averagePrice)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                    {hasPrice ? `₹${fmt(holding.currentPrice)}` : "--"}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                    ₹{fmt(holding.investedAmount)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[#f5f7fa]">
                    {hasPrice ? `₹${fmt(holding.currentValue)}` : "--"}
                  </td>
                  <td className="px-4 py-3">
                    {hasPrice ? (
                      <span className={`text-[13px] font-medium ${
                        isProfit ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {isProfit ? "+" : "-"}₹{fmt(Math.abs(holding.pnl))}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#8a93a3]">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {Number.isFinite(holding.pnlPercent) ? (
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${
                        isProfit
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {isProfit ? "+" : ""}
                        {holding.pnlPercent.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#8a93a3]">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const Portfolio = () => {
  const [holdings, setHoldings] = useState([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [holdingsError, setHoldingsError] = useState("");

  const symbols = useMemo(
    () => holdings.map((holding) => holding.symbol),
    [holdings]
  );
  const {
    quoteMap,
    loading: quotesLoading,
    error: quotesError,
  } = useQuoteSubscription("portfolio", symbols);

  const loadHoldings = useCallback(async () => {
    try {
      setHoldingsLoading(true);
      setHoldingsError("");

      const data = await getHoldings();

      setHoldings(data);
    } catch (err) {
      setHoldingsError(err.message || "Failed to load portfolio holdings.");
    } finally {
      setHoldingsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadHoldings, 0);

    return () => window.clearTimeout(timer);
  }, [loadHoldings]);

  const topHoldings = useMemo(() => {
    return holdings
      .map((holding) => {
        const quantity = Number(holding.quantity);
        const investedAmount = Number(holding.investedAmount || 0);
        const averagePrice = Number(holding.averagePrice || 0);
        const quote = quoteMap[String(holding.symbol).toUpperCase()];
        const currentPrice = Number(quote?.currentPrice);
        const hasPrice = Number.isFinite(currentPrice);
        const currentValue = hasPrice ? currentPrice * quantity : null;
        const pnl = hasPrice ? currentValue - investedAmount : null;
        const pnlPercent = hasPrice && investedAmount > 0
          ? (pnl / investedAmount) * 100
          : null;

        return {
          ...holding,
          quantity,
          averagePrice,
          investedAmount,
          currentPrice: hasPrice ? currentPrice : null,
          currentValue,
          pnl,
          pnlPercent,
        };
      })
      .sort((a, b) => b.investedAmount - a.investedAmount);
  }, [holdings, quoteMap]);

  const tableError = holdingsError || quotesError;
  const tableLoading = holdingsLoading || (quotesLoading && holdings.length > 0);

  return (
    <DashboardLayout>
      <div className="flex max-w-[1400px] flex-col gap-5">
        <header className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#2f6fed]">
            Portfolio
          </p>
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">
            Investment Analysis
          </h1>
          <p className="max-w-3xl text-sm text-[#8a93a3]">
            Track portfolio performance, live P&amp;L, diversification, and largest holdings.
          </p>
        </header>

        <PortfolioPerformanceCard />

        <PnLAnalytics
          holdings={holdings}
          quoteMap={quoteMap}
          quotesLoading={quotesLoading}
        />

        <SectorAllocation holdings={holdings} />

        <TopHoldingsTable
          holdings={topHoldings}
          loading={tableLoading}
          error={tableError}
        />
      </div>
    </DashboardLayout>
  );
};

export default Portfolio;
