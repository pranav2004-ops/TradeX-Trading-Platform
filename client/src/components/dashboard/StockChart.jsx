/**
 * client/src/components/dashboard/StockChart.jsx
 *
 * Premium interactive financial charting component inspired by Zerodha Kite.
 * Renders high-quality candlestick and volume bars using Recharts,
 * supports overlay technical indicators (SMA, EMA, Bollinger Bands),
 * timeframes (1D, 1W, 1M, 3M, 1Y), and oscillators (RSI, MACD) in a dual-pane layout.
 */

import { useEffect, useState, useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from "../../utils/indicators";
import { useQuotes } from "../../context/QuoteContext";
import useSettings from "../../hooks/useSettings";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const TIMEFRAMES = [
  { id: "1D", label: "1D" },
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "3M", label: "3M" },
  { id: "1Y", label: "1Y" },
];

export default function StockChart({ symbol }) {
  const { settings } = useSettings();
  const { quoteMap } = useQuotes();
  
  const [timeframe, setTimeframe] = useState(() => settings?.defaultTimeframe || "1M");
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Indicators visibility state
  const [showSMA, setShowSMA] = useState(() => settings?.defaultOverlayIndicator === "SMA");
  const [showEMA, setShowEMA] = useState(() => settings?.defaultOverlayIndicator === "EMA");
  const [showBB, setShowBB] = useState(() => settings?.defaultOverlayIndicator === "BB");
  const [activeOscillator, setActiveOscillator] = useState(() => settings?.defaultOscillator || "NONE");

  // Fetch historical data
  useEffect(() => {
    let ignore = false;
    const fetchCandles = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/stocks/candles/${symbol}?timeframe=${timeframe}`);
        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.message || "Failed to load historical candles");
        }

        if (!ignore) {
          setCandles(result.data.candles || []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load historical chart data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchCandles();
    return () => {
      ignore = true;
    };
  }, [symbol, timeframe]);

  // Combine historical candles with live ticks from QuoteContext socket!
  const combinedCandles = useMemo(() => {
    if (candles.length === 0) return [];
    
    const liveQuote = quoteMap[String(symbol).toUpperCase()];
    if (!liveQuote || !liveQuote.currentPrice) return candles;

    // Check if the last candle timestamp matches today
    const last = candles[candles.length - 1];
    const livePrice = liveQuote.currentPrice;

    // If live price is different, update the last candle close (or append if newer)
    const updated = [...candles];
    
    // For simplicity, update the close of the final candle to match the live socket tick
    const updatedLast = {
      ...last,
      close: livePrice,
      high: Math.max(last.high, livePrice),
      low: Math.min(last.low, livePrice),
    };
    updated[updated.length - 1] = updatedLast;

    return updated;
  }, [candles, quoteMap, symbol]);

  // Pre-calculate all indicators
  const chartData = useMemo(() => {
    if (combinedCandles.length === 0) return [];

    const closes = combinedCandles.map((c) => c.close);

    const sma = calculateSMA(closes, 20);
    const ema = calculateEMA(closes, 20);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes, 12, 26, 9);
    const bb = calculateBollingerBands(closes, 20, 2);

    return combinedCandles.map((c, i) => {
      const isGreen = c.close >= c.open;
      return {
        ...c,
        timeLabel: new Date(c.time).toLocaleDateString("en-IN", {
          day: "numeric",
          month: timeframe === "1D" || timeframe === "1W" ? "short" : "short",
          hour: timeframe === "1D" || timeframe === "1W" ? "2-digit" : undefined,
          minute: timeframe === "1D" || timeframe === "1W" ? "2-digit" : undefined,
        }),
        bodyRange: [c.open, c.close],
        wickRange: [c.low, c.high],
        color: isGreen ? "#10b981" : "#ef4444",
        SMA: sma[i],
        EMA: ema[i],
        RSI: rsi[i],
        MACD_line: macd.macd[i],
        MACD_signal: macd.signal[i],
        MACD_hist: macd.histogram[i],
        BB_upper: bb.upper[i],
        BB_basis: bb.basis[i],
        BB_lower: bb.lower[i],
      };
    });
  }, [combinedCandles, timeframe]);

  if (loading && chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-[#8a93a3]">
        Loading interactive chart data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-72 items-center justify-center text-xs text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1e2530] pb-3 gap-3">
        {/* Timeframes */}
        <div className="flex items-center gap-1 bg-[#0d1117] border border-[#1e2530] rounded-lg p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                timeframe === tf.id
                  ? "bg-[#2f6fed] text-white"
                  : "text-[#8a93a3] hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Indicators checklist */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Overlays */}
          <button
            onClick={() => setShowSMA((prev) => !prev)}
            className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition ${
              showSMA
                ? "bg-violet-500/10 text-violet-400 border-violet-500/40"
                : "border-[#1e2530] text-[#8a93a3] hover:text-white"
            }`}
          >
            SMA (20)
          </button>
          <button
            onClick={() => setShowEMA((prev) => !prev)}
            className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition ${
              showEMA
                ? "bg-pink-500/10 text-pink-400 border-pink-500/40"
                : "border-[#1e2530] text-[#8a93a3] hover:text-white"
            }`}
          >
            EMA (20)
          </button>
          <button
            onClick={() => setShowBB((prev) => !prev)}
            className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition ${
              showBB
                ? "bg-blue-500/10 text-blue-400 border-blue-500/40"
                : "border-[#1e2530] text-[#8a93a3] hover:text-white"
            }`}
          >
            Bollinger Bands
          </button>

          <span className="h-4 w-px bg-[#1e2530]" />

          {/* Oscillators */}
          {["RSI", "MACD"].map((osc) => (
            <button
              key={osc}
              onClick={() =>
                setActiveOscillator((prev) => (prev === osc ? "NONE" : osc))
              }
              className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition ${
                activeOscillator === osc
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                  : "border-[#1e2530] text-[#8a93a3] hover:text-white"
              }`}
            >
              {osc}
            </button>
          ))}
        </div>
      </div>

      {/* Candlestick & Volume Panel */}
      <div className="w-full h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
          >
            <XAxis
              dataKey="timeLabel"
              stroke="#8a93a3"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#1e2530" }}
            />
            <YAxis
              domain={["auto", "auto"]}
              stroke="#8a93a3"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "#1e2530" }}
              tickFormatter={(v) => `₹${Math.round(v)}`}
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: "#11161f",
                border: "1px solid #1e2530",
                borderRadius: 8,
                color: "#f5f7fa",
                fontSize: 11,
              }}
              formatter={(value, name) => {
                if (name === "bodyRange") {
                  const [o, c] = value;
                  return [
                    `Open: ₹${fmt(o)} | Close: ₹${fmt(c)}`,
                    "Price Body",
                  ];
                }
                if (name === "wickRange") {
                  const [l, h] = value;
                  return [`Low: ₹${fmt(l)} | High: ₹${fmt(h)}`, "Range Wick"];
                }
                return [`₹${fmt(value)}`, name];
              }}
            />

            {/* Wick */}
            <Bar dataKey="wickRange" fill="#8a93a3" barSize={1.5}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-wick-${index}`} fill={entry.color} />
              ))}
            </Bar>

            {/* Body */}
            <Bar dataKey="bodyRange" barSize={7}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-body-${index}`}
                  fill={entry.color}
                  stroke={entry.color}
                />
              ))}
            </Bar>

            {/* Indicator Overlays */}
            {showSMA && (
              <Line
                type="monotone"
                dataKey="SMA"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                name="SMA (20)"
              />
            )}
            {showEMA && (
              <Line
                type="monotone"
                dataKey="EMA"
                stroke="#ec4899"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                name="EMA (20)"
              />
            )}
            {showBB && (
              <Line
                type="monotone"
                dataKey="BB_upper"
                stroke="#3b82f6"
                strokeWidth={1.2}
                strokeDasharray="3 3"
                dot={false}
                activeDot={false}
                name="BB Upper"
              />
            )}
            {showBB && (
              <Line
                type="monotone"
                dataKey="BB_basis"
                stroke="#3b82f6"
                strokeWidth={1.2}
                dot={false}
                activeDot={false}
                name="BB Basis"
              />
            )}
            {showBB && (
              <Line
                type="monotone"
                dataKey="BB_lower"
                stroke="#3b82f6"
                strokeWidth={1.2}
                strokeDasharray="3 3"
                dot={false}
                activeDot={false}
                name="BB Lower"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Sub-Pane Oscillators */}
      {activeOscillator === "RSI" && (
        <div className="w-full h-24 border-t border-[#1e2530] pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <XAxis
                dataKey="timeLabel"
                stroke="#8a93a3"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                hide={true}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[30, 70]}
                stroke="#8a93a3"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: "#1e2530" }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "#11161f",
                  border: "1px solid #1e2530",
                  borderRadius: 8,
                  fontSize: 10,
                }}
              />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="RSI"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
                name="RSI (14)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeOscillator === "MACD" && (
        <div className="w-full h-28 border-t border-[#1e2530] pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
            >
              <XAxis
                dataKey="timeLabel"
                stroke="#8a93a3"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                hide={true}
              />
              <YAxis
                stroke="#8a93a3"
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={{ stroke: "#1e2530" }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "#11161f",
                  border: "1px solid #1e2530",
                  borderRadius: 8,
                  fontSize: 10,
                }}
              />
              {/* Histogram bars */}
              <Bar dataKey="MACD_hist" name="Histogram" barSize={3}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`macd-hist-${index}`}
                    fill={entry.MACD_hist >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="MACD_line"
                stroke="#3b82f6"
                strokeWidth={1.2}
                dot={false}
                activeDot={false}
                name="MACD"
              />
              <Line
                type="monotone"
                dataKey="MACD_signal"
                stroke="#f97316"
                strokeWidth={1.2}
                dot={false}
                activeDot={false}
                name="Signal"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
