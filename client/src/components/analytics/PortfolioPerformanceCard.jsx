import { useEffect, useState } from "react";
import { getPortfolioPerformance } from "../../api/analyticsApi";
import PortfolioChart from "./PortfolioChart";

const PortfolioPerformanceCard = ({ refreshKey = 0 }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const loadPerformance = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getPortfolioPerformance();

        if (!ignore) {
          setSnapshots(data);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load portfolio performance.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPerformance();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return (
    <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            Portfolio Performance
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#f5f7fa]">
            Portfolio Value Over Time
          </h2>
        </div>
        <span className="rounded-md bg-[#1e2530] px-2 py-1 text-xs text-[#8a93a3]">
          {snapshots.length} snapshots
        </span>
      </div>

      {error ? (
        <div className="flex h-64 items-center justify-center text-sm text-red-400">
          {error}
        </div>
      ) : loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-[#8a93a3]">
          Loading performance...
        </div>
      ) : snapshots.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[#8a93a3]">
          No portfolio snapshots yet.
        </div>
      ) : (
        <PortfolioChart data={snapshots} />
      )}
    </section>
  );
};

export default PortfolioPerformanceCard;
