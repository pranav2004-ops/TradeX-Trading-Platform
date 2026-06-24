import { useEffect, useState } from "react";
import { Briefcase, IndianRupee, Wallet, Zap } from "lucide-react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { getTradeSummary } from "../api/tradeApi";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MetricCard = ({ label, value, note, icon: Icon }) => (
  <div className="rounded-lg border border-[#1e2530] bg-[#11161f] px-5 py-4">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
        {label}
      </p>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1e2530]">
        <Icon size={15} className="text-[#8a93a3]" strokeWidth={1.8} />
      </div>
    </div>
    <p className="mt-4 text-2xl font-semibold text-[#f5f7fa]">{value}</p>
    <p className="mt-1 text-xs text-[#8a93a3]">{note}</p>
  </div>
);

const Funds = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFunds = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getTradeSummary();

        setSummary(data);
      } catch (err) {
        setError(err.message || "Failed to load funds.");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(loadFunds, 0);

    return () => clearTimeout(timer);
  }, []);

  const cash = summary?.cash || 0;
  const investedAmount = summary?.investedAmount || 0;
  const portfolioValue = cash + investedAmount;
  const buyingPower = cash;

  return (
    <DashboardLayout>
      <div className="max-w-[1200px]">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-[#f5f7fa]">Funds</h1>
          <p className="mt-1 text-sm text-[#8a93a3]">
            Track available cash and deployed capital.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Available Cash"
            value={loading ? "--" : `₹${fmt(cash)}`}
            note="Cash available for new orders"
            icon={Wallet}
          />
          <MetricCard
            label="Invested Amount"
            value={loading ? "--" : `₹${fmt(investedAmount)}`}
            note="Book value of current holdings"
            icon={IndianRupee}
          />
          <MetricCard
            label="Portfolio Value"
            value={loading ? "--" : `₹${fmt(portfolioValue)}`}
            note="Cash plus invested amount"
            icon={Briefcase}
          />
          <MetricCard
            label="Buying Power"
            value={loading ? "--" : `₹${fmt(buyingPower)}`}
            note="MVP uses cash balance as buying power"
            icon={Zap}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Funds;
