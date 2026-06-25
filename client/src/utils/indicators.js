/**
 * client/src/utils/indicators.js
 *
 * Mathematical indicator helper functions for charting.
 * Calculates standard technical indicators on the client side
 * to prevent unnecessary REST requests.
 */

/**
 * Simple Moving Average (SMA)
 *
 * @param {number[]} data - Array of close prices
 * @param {number} period - Number of days
 * @returns {(number|null)[]}
 */
export const calculateSMA = (data, period = 20) => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(Math.round((sum / period) * 100) / 100);
    }
  }
  return result;
};

/**
 * Exponential Moving Average (EMA)
 *
 * @param {number[]} data - Array of close prices
 * @param {number} period - Number of days
 * @returns {(number|null)[]}
 */
export const calculateEMA = (data, period = 20) => {
  const result = [];
  const k = 2 / (period + 1);
  let ema = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is initialized with SMA
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      ema = sum / period;
      result.push(Math.round(ema * 100) / 100);
    } else {
      ema = data[i] * k + ema * (1 - k);
      result.push(Math.round(ema * 100) / 100);
    }
  }
  return result;
};

/**
 * Relative Strength Index (RSI)
 *
 * @param {number[]} data - Array of close prices
 * @param {number} period - RSI smoothing window (default 14)
 * @returns {(number|null)[]}
 */
export const calculateRSI = (data, period = 14) => {
  const result = [];
  if (data.length < period) return Array(data.length).fill(null);

  const gains = [];
  const losses = [];

  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First average (SMA-style)
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      // Wilder's smoothing technique
      const gain = gains[i - 1];
      const loss = losses[i - 1];

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
      }
    }
  }

  return result;
};

/**
 * Moving Average Convergence Divergence (MACD)
 *
 * @param {number[]} data - Array of close prices
 * @param {number} fast - Fast EMA (default 12)
 * @param {number} slow - Slow EMA (default 26)
 * @param {number} signal - Signal line EMA (default 9)
 * @returns {{ macd: (number|null)[], signal: (number|null)[], histogram: (number|null)[] }}
 */
export const calculateMACD = (data, fast = 12, slow = 26, signal = 9) => {
  const fastEMA = calculateEMA(data, fast);
  const slowEMA = calculateEMA(data, slow);

  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) {
      macdLine.push(null);
    } else {
      macdLine.push(Math.round((fastEMA[i] - slowEMA[i]) * 100) / 100);
    }
  }

  // Find first index where MACD is calculated
  const firstNonNullIndex = macdLine.findIndex((val) => val !== null);
  let signalLine = Array(data.length).fill(null);
  let histogram = Array(data.length).fill(null);

  if (firstNonNullIndex !== -1 && data.length - firstNonNullIndex >= signal) {
    const nonNullMACD = macdLine.slice(firstNonNullIndex);
    const signalLineNonNull = calculateEMA(nonNullMACD, signal);

    for (let i = 0; i < signalLineNonNull.length; i++) {
      const idx = i + firstNonNullIndex;
      signalLine[idx] = signalLineNonNull[i];
      if (macdLine[idx] !== null && signalLine[idx] !== null) {
        histogram[idx] = Math.round((macdLine[idx] - signalLine[idx]) * 100) / 100;
      }
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
};

/**
 * Bollinger Bands (BB)
 *
 * @param {number[]} data - Array of close prices
 * @param {number} period - SMA basis window (default 20)
 * @param {number} multiplier - StdDev multiplier (default 2)
 * @returns {{ basis: (number|null)[], upper: (number|null)[], lower: (number|null)[] }}
 */
export const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
  const upper = [];
  const lower = [];
  const basis = calculateSMA(data, period);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      // Calculate standard deviation of last N periods
      let sumOfSquares = 0;
      const mean = basis[i];
      for (let j = 0; j < period; j++) {
        const diff = data[i - j] - mean;
        sumOfSquares += diff * diff;
      }
      const stdDev = Math.sqrt(sumOfSquares / period);
      upper.push(Math.round((mean + multiplier * stdDev) * 100) / 100);
      lower.push(Math.round((mean - multiplier * stdDev) * 100) / 100);
    }
  }

  return { basis, upper, lower };
};
