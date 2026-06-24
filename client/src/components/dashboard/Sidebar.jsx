import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, PieChart, ClipboardList, TrendingUp,
  Star, BarChart2, Settings, LogOut, Zap, Wallet, Bell, X,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", enabled: true },
  { to: "/funds", icon: Wallet, label: "Funds", enabled: true },
  { to: "/orders", icon: ClipboardList, label: "Orders", enabled: true },
  { to: "/positions", icon: TrendingUp, label: "Positions", enabled: true },
  { to: "/portfolio", icon: PieChart, label: "Portfolio", enabled: true },
  { to: "/watchlist", icon: Star, label: "Watchlist", enabled: true },
  { to: "/analytics", icon: BarChart2, label: "Analytics", enabled: true },
  { to: "/alerts", icon: Bell, label: "Alerts", enabled: true },
];

const bottomItems = [
  { to: "/settings", icon: Settings, label: "Settings", enabled: true },
];

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onClose) onClose();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const linkBase =
    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150";
  const activeClass = "bg-[#2f6fed]/10 text-[#2f6fed]";
  const inactiveClass = "text-[#8a93a3] hover:text-[#f5f7fa] hover:bg-[#1e2530]";
  const disabledClass = "text-[#4f5867] cursor-not-allowed opacity-60";

  const renderDisabledLink = ({ icon: Icon, label }) => (
    <button
      key={label}
      type="button"
      disabled
      className={`${linkBase} ${disabledClass} w-full text-left`}
      aria-disabled="true"
    >
      <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
          role="presentation"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-56 bg-[#0d1117] border-r border-[#1e2530] flex flex-col z-40 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-[#1e2530]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#2f6fed] rounded-md flex items-center justify-center flex-shrink-0">
              <Zap size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[#f5f7fa] font-semibold text-[15px] tracking-tight">TradeX</span>
          </div>

          {/* Close button for mobile drawer */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1 rounded-md text-[#8a93a3] hover:bg-[#1e2530] hover:text-[#f5f7fa] transition-colors"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, enabled }) => (
            enabled ? (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="flex-shrink-0" />
                    <span>{label}</span>
                    {isActive && <span className="ml-auto w-1 h-1 rounded-full bg-[#2f6fed]" />}
                  </>
                )}
              </NavLink>
            ) : renderDisabledLink({ icon: Icon, label })
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-[#1e2530] pt-3 flex flex-col gap-0.5">
          {bottomItems.map(({ to, icon: Icon, label, enabled }) => (
            enabled ? (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => `${linkBase} ${isActive ? activeClass : inactiveClass}`}
              >
                <Icon size={16} strokeWidth={1.8} className="flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ) : renderDisabledLink({ icon: Icon, label })
          ))}
          <button onClick={handleLogout} className={`${linkBase} ${inactiveClass} w-full text-left`}>
            <LogOut size={16} strokeWidth={1.8} className="flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
