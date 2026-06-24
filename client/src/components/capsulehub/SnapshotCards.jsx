import { Activity, Landmark, Layers, Wallet } from "lucide-react";

const fmt = (n) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SnapshotCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-3">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
        {label}
      </p>
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1e2530] text-[#8a93a3]">
        <Icon size={13} strokeWidth={1.8} />
      </div>
    </div>
    <p className="text-lg font-semibold text-[#f5f7fa]">{value}</p>
  </div>
);

const SnapshotCards = ({ summary, holdings = [], loading }) => {
  const cash = summary?.cash || 0;
  const holdingsCount = summary?.holdingsCount ?? holdings.length;
  const totalPositions = summary?.totalPositions || 0;

  const cards = [
    {
      label: "Total Holdings",
      value: loading ? "--" : holdingsCount.toLocaleString("en-IN"),
      icon: Layers,
    },
    {
      label: "Total Positions",
      value: loading ? "--" : totalPositions.toLocaleString("en-IN"),
      icon: Activity,
    },
    {
      label: "Cash Available",
      value: loading ? "--" : `₹${fmt(cash)}`,
      icon: Wallet,
    },
    {
      label: "Buying Power",
      value: loading ? "--" : `₹${fmt(cash)}`,
      icon: Landmark,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <SnapshotCard key={card.label} {...card} />
      ))}
    </div>
  );
};

export default SnapshotCards;
