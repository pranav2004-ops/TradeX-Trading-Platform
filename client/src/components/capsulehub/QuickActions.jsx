import { Briefcase, ListOrdered, Plus, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  {
    label: "Buy Stock",
    to: "/dashboard",
    icon: Plus,
  },
  {
    label: "View Holdings",
    to: "/portfolio",
    icon: Briefcase,
  },
  {
    label: "View Positions",
    to: "/positions",
    icon: TrendingUp,
  },
  {
    label: "View Orders",
    to: "/orders",
    icon: ListOrdered,
  },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-[#1e2530] bg-[#11161f] px-4 py-4">
      <div className="mb-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#8a93a3]">
          Quick Actions
        </p>
        <p className="mt-1 text-sm text-[#8a93a3]">Trading shortcuts</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {actions.map(({ label, to, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => navigate(to)}
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-[#1e2530] bg-[#0d1117] px-3 text-xs font-medium text-[#f5f7fa] transition hover:border-[#2f6fed]/50 hover:bg-[#162033]"
          >
            <Icon size={14} strokeWidth={1.8} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
