import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Card, { CardHeader, CardTitle } from "../ui/card";
import Badge from "../ui/badge";

const fmt = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDateTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: "--", time: "--" };
  }

  return {
    date: date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

const TransactionRow = ({ action, symbol, quantity, price, totalAmount, createdAt }) => {
  const isBuy = action === "BUY";
  const { date, time } = formatDateTime(createdAt);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#1e2530] last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isBuy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
        {isBuy ? <ArrowDownLeft size={14} strokeWidth={2} /> : <ArrowUpRight size={14} strokeWidth={2} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium text-[#f5f7fa]">{symbol}</p>
          <Badge variant={isBuy ? "buy" : "sell"}>{action}</Badge>
        </div>
        <p className="text-[11px] text-[#8a93a3] mt-0.5">{quantity} shares · ₹{fmt(price)}/sh</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-[13px] font-medium ${isBuy ? "text-red-400" : "text-emerald-400"}`}>
          {isBuy ? "−" : "+"}₹{fmt(totalAmount)}
        </p>
        <p className="text-[11px] text-[#8a93a3] mt-0.5">{date} · {time}</p>
      </div>
    </div>
  );
};

const RecentTransactions = ({ transactions = [], loading, error }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Recent Transactions</CardTitle>
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="text-xs text-[#2f6fed] hover:text-[#4a80ff] transition-colors font-medium"
        >
          Order history
        </button>
      </CardHeader>
      <div className="px-4">
        {error ? (
          <div className="py-8 text-sm text-red-400">{error}</div>
        ) : loading ? (
          <div className="py-8 text-sm text-[#8a93a3]">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-sm text-[#8a93a3]">No transactions yet.</div>
        ) : (
          transactions.map((t) => (
            <TransactionRow key={t._id} {...t} />
          ))
        )}
      </div>
    </Card>
  );
};

export default RecentTransactions;
