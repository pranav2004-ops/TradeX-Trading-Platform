import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Info, ShieldAlert, Award, AlertTriangle, Layers, Percent } from "lucide-react";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MetricCard = ({ title, value, description, tooltipText }) => (
  <div className="group relative flex flex-col gap-2 rounded-lg border border-[#1e2530] bg-[#0d1117] p-4 transition-all hover:border-[#2f6fed]/30">
    <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
      <span>{title}</span>
      <div className="relative flex cursor-help items-center">
        <Info size={12} className="text-[#4f5867] hover:text-[#8a93a3]" />
        <span className="pointer-events-none absolute right-0 bottom-full mb-2 w-48 rounded bg-[#1e2530] p-2 text-[10px] normal-case leading-normal text-[#f5f7fa] opacity-0 transition-opacity group-hover:opacity-100 z-10 shadow-lg border border-[#30363d]">
          {tooltipText}
        </span>
      </div>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-xl font-bold text-[#f5f7fa]">{value}</span>
    </div>
    <p className="text-[11px] text-[#8a93a3]">{description}</p>
  </div>
);

export default function AdvancedMetrics({ data }) {
  const {
    volatility = 0,
    sharpeRatio = 0,
    maxDrawdown = 0,
    riskScore = 0,
    riskClass = "Moderate Risk",
    riskRationale = [],
    benchmarkComparison = [],
    heatmap = [],
  } = data || {};

  // Color classes for risk score
  const riskColorClass = useMemo(() => {
    if (riskScore <= 35) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    if (riskScore >= 66) return "text-red-400 border-red-500/20 bg-red-500/5";
    return "text-amber-400 border-amber-500/20 bg-amber-500/5";
  }, [riskScore]);

  const riskBadgeClass = useMemo(() => {
    if (riskScore <= 35) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (riskScore >= 66) return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }, [riskScore]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Quantitative Metrics Deck */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Sharpe Ratio"
          value={sharpeRatio.toFixed(2)}
          description="Risk-adjusted return ratio"
          tooltipText="Measures the performance of the portfolio relative to a risk-free asset (assumed 5% treasury rate) adjusted for standard deviation. Higher is better (>1 is good, >2 is outstanding)."
        />
        <MetricCard
          title="Annualized Volatility"
          value={`${(volatility * 100).toFixed(2)}%`}
          description="Standard deviation of returns"
          tooltipText="Represents the dispersion of daily returns annualized. Higher volatility means greater price swings and higher investment risk."
        />
        <MetricCard
          title="Maximum Drawdown"
          value={`${(maxDrawdown * 100).toFixed(2)}%`}
          description="Peak-to-trough peak loss"
          tooltipText="Indicates the largest historical percentage drop from a peak value before a new peak is achieved. Shows potential downside risk."
        />
      </div>

      {/* 2. Middle Row: Risk Score Card & Heatmap Card */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        
        {/* Risk Score Gauge & Rationale */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-[#1e2530] bg-[#11161f] p-5">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
                  Risk Intelligence
                </p>
                <h3 className="mt-1 text-base font-semibold text-[#f5f7fa]">
                  Portfolio Risk Profiling
                </h3>
              </div>
              <ShieldAlert size={18} className="text-[#2f6fed]" strokeWidth={1.8} />
            </div>

            {/* Gauge Indicator */}
            <div className={`mt-2 flex items-center gap-4 rounded-xl border p-4 ${riskColorClass}`}>
              <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-4 border-current">
                <span className="text-base font-extrabold">{riskScore}</span>
              </div>
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${riskBadgeClass}`}>
                  {riskClass}
                </span>
                <p className="mt-1 text-xs text-[#8a93a3] leading-normal">
                  Your portfolio rating is based on standard volatility index, sector allocations, single-stock weighting, and cash cash-flows.
                </p>
              </div>
            </div>

            {/* Rationale list */}
            <div className="mt-5">
              <h4 className="text-xs font-semibold text-[#f5f7fa]">Risk Factors & Rationale</h4>
              <ul className="mt-3 flex flex-col gap-2">
                {riskRationale.map((rat, index) => (
                  <li key={index} className="flex gap-2 text-xs text-[#8a93a3] leading-relaxed">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#2f6fed]" />
                    <span>{rat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Portfolio Asset Heatmap */}
        <div className="lg:col-span-7 flex flex-col rounded-lg border border-[#1e2530] bg-[#11161f] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
                Diversification Heatmap
              </p>
              <h3 className="mt-1 text-base font-semibold text-[#f5f7fa]">
                Asset Weights & Daily Performance
              </h3>
            </div>
            <Layers size={18} className="text-[#2f6fed]" strokeWidth={1.8} />
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {heatmap.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8a93a3]">
                No holdings available for heatmap analysis.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2.5">
                  {heatmap.map((asset) => {
                    const isPositive = asset.changePercent > 0;
                    const isNegative = asset.changePercent < 0;
                    
                    let bgClass = "bg-[#161b22] border-[#21262d] text-[#8a93a3]";
                    if (isPositive) {
                      bgClass = asset.changePercent > 1.5 
                        ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/60" 
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15";
                    } else if (isNegative) {
                      bgClass = asset.changePercent < -1.5 
                        ? "bg-red-950/40 border-red-800/40 text-red-400 hover:bg-red-950/60" 
                        : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15";
                    }

                    return (
                      <div
                        key={asset.symbol}
                        style={{ flexGrow: Math.max(1, Math.round(asset.weight)) }}
                        className={`group relative min-w-[120px] p-3 rounded-lg border flex flex-col justify-between transition-all hover:scale-[1.01] ${bgClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs tracking-wide text-[#f5f7fa]">{asset.symbol}</span>
                          <span className="text-[10px] text-[#8a93a3] font-medium">{asset.weight}%</span>
                        </div>
                        <div className="mt-5 flex items-end justify-between">
                          <span className="text-[9px] text-[#8a93a3] truncate max-w-[80px]">{asset.sector}</span>
                          <span className="font-bold text-xs">
                            {isPositive ? "+" : ""}{asset.changePercent}%
                          </span>
                        </div>
                        
                        {/* Detail tooltip on hover */}
                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded-md border border-[#30363d] bg-[#161b22] p-2 text-[10px] text-[#8a93a3] opacity-0 transition-opacity group-hover:opacity-100 z-10 shadow-xl leading-normal">
                          <p className="font-semibold text-[#f5f7fa] mb-0.5">{asset.name}</p>
                          <p>Value: <span className="text-[#f5f7fa]">₹{fmt(asset.value)}</span></p>
                          <p>Weight: <span className="text-[#f5f7fa]">{asset.weight}%</span></p>
                          <p>Today Change: <span className={isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : ""}>{isPositive ? "+" : ""}{asset.changePercent}%</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Heatmap Legend */}
                <div className="flex items-center justify-end gap-4 border-t border-[#1e2530] pt-2 text-[10px] text-[#8a93a3]">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-emerald-600" />
                    <span>Strong Gain (&gt;1.5%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-emerald-500/25 border border-emerald-500/20" />
                    <span>Mild Gain</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-red-500/25 border border-red-500/20" />
                    <span>Mild Loss</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded bg-red-700" />
                    <span>Strong Loss (&lt;-1.5%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 3. Benchmark Comparison Line Chart */}
      <div className="rounded-lg border border-[#1e2530] bg-[#11161f] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
              Index Benchmark comparison
            </p>
            <h3 className="mt-1 text-base font-semibold text-[#f5f7fa]">
              Portfolio vs. S&P 500 (SPY) Performance
            </h3>
            <p className="text-[11px] text-[#8a93a3] mt-0.5">
              Comparison of percentage return returns normalized from 0% over the last 30 days.
            </p>
          </div>
          <Percent size={18} className="text-[#2f6fed]" strokeWidth={1.8} />
        </div>

        <div className="h-72 w-full">
          {benchmarkComparison.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-[#8a93a3]">
              No historical aligned comparison data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={benchmarkComparison}
                margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
              >
                <CartesianGrid stroke="#1e2530" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#8a93a3"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: "#1e2530" }}
                  tickFormatter={(d) => {
                    try {
                      return new Date(d).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      });
                    } catch {
                      return d;
                    }
                  }}
                />
                <YAxis
                  stroke="#8a93a3"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: "#1e2530" }}
                  tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#11161f",
                    border: "1px solid #1e2530",
                    borderRadius: 8,
                    color: "#f5f7fa",
                    fontSize: 11,
                  }}
                  formatter={(value, name) => [
                    `${value >= 0 ? "+" : ""}${value}%`,
                    name === "portfolio" ? "My Portfolio" : "S&P 500 (SPY)",
                  ]}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  name="portfolio"
                  stroke="#2f6fed"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  name="benchmark"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}
