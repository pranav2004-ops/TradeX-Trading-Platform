import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const PortfolioChart = ({ data = [] }) => {
  return (
    <div className="w-full h-64 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="createdAt"
            tickFormatter={formatDate}
            stroke="#8a93a3"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#1e2530" }}
          />
          <YAxis
            tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`}
            stroke="#8a93a3"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#1e2530" }}
            width={82}
          />
          <Tooltip
            contentStyle={{
              background: "#11161f",
              border: "1px solid #1e2530",
              borderRadius: 8,
              color: "#f5f7fa",
            }}
            labelFormatter={formatDate}
            formatter={(value) => [`₹${fmt(Number(value))}`, "Portfolio Value"]}
          />
          <Line
            type="monotone"
            dataKey="portfolioValue"
            stroke="#2f6fed"
            strokeWidth={2}
            dot={{ r: 3, fill: "#2f6fed", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#2f6fed", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioChart;
