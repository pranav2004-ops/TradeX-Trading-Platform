import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getBatchSectors } from "../../api/stockApi";

const COLORS = {
  Technology: "#2f6fed",
  Finance: "#16a34a",
  Energy: "#f59e0b",
  Healthcare: "#dc2626",
  Consumer: "#8b5cf6",
  Other: "#8a93a3",
};

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SectorAllocation = ({ holdings = [] }) => {
  const [sectorMap, setSectorMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const symbolsKey = useMemo(
    () => holdings.map((holding) => holding.symbol).sort().join(","),
    [holdings]
  );

  useEffect(() => {
    if (!symbolsKey) {
      return;
    }

    let ignore = false;

    const loadSectors = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getBatchSectors(symbolsKey.split(","));

        if (!ignore) {
          setSectorMap(
            data.reduce((map, item) => ({
              ...map,
              [item.symbol]: item.sector,
            }), {})
          );
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load sector allocation.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadSectors();

    return () => {
      ignore = true;
    };
  }, [symbolsKey]);

  const allocation = useMemo(() => {
    const buckets = {
      Technology: 0,
      Finance: 0,
      Energy: 0,
      Healthcare: 0,
      Consumer: 0,
      Other: 0,
    };

    holdings.forEach((holding) => {
      const sector = sectorMap[holding.symbol] || "Other";
      const value = Number(holding.investedAmount || 0);

      buckets[sector] = (buckets[sector] || 0) + value;
    });

    return Object.entries(buckets)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [holdings, sectorMap]);

  return (
    <section className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
            Sector Allocation
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[#f5f7fa]">
            Portfolio Diversification
          </h2>
        </div>
      </div>

      {error ? (
        <div className="py-8 text-sm text-red-400">{error}</div>
      ) : loading ? (
        <div className="py-8 text-sm text-[#8a93a3]">Loading sector data...</div>
      ) : allocation.length === 0 ? (
        <div className="py-8 text-sm text-[#8a93a3]">No sector allocation yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={2}
                >
                  {allocation.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] || COLORS.Other} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#11161f",
                    border: "1px solid #1e2530",
                    borderRadius: 8,
                    color: "#f5f7fa",
                  }}
                  formatter={(value) => [`₹${fmt(Number(value))}`, "Invested"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {allocation.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-md border border-[#1e2530] bg-[#0d1117] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[item.name] || COLORS.Other }}
                  />
                  <span className="text-sm text-[#f5f7fa]">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-[#f5f7fa]">
                  ₹{fmt(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default SectorAllocation;
