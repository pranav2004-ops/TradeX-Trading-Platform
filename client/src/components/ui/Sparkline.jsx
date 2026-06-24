const WIDTH = 72;
const HEIGHT = 28;
const PADDING = 2;

const Sparkline = ({ prices = [], className = "" }) => {
  if (!prices || prices.length < 2) {
    return (
      <span className={`text-[11px] text-[#8a93a3] ${className}`}>--</span>
    );
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const step = (WIDTH - PADDING * 2) / (prices.length - 1);

  const points = prices
    .map((price, i) => {
      const x = PADDING + i * step;
      const y = PADDING + (1 - (price - min) / range) * (HEIGHT - PADDING * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "#34d399" : "#f87171";

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default Sparkline;
