import { useState } from "react";
import { Bell, Trash2, Plus, CheckCircle, Clock } from "lucide-react";
import DashboardLayout from "../components/dashboard/DashboardLayout";
import { useAlerts } from "../context/AlertContext";
import SetAlertModal from "../components/alerts/SetAlertModal";

const fmt = (n) =>
  Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatRelativeTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const AlertRow = ({ alert, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(alert._id);
    } catch {
      setDeleting(false);
    }
  };

  const dirLabel = alert.condition === "above" ? "rises above" : "drops below";

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border px-4 py-3.5 transition ${
        alert.triggered
          ? "border-[#1e2530] bg-[#0d1117]"
          : "border-amber-500/20 bg-amber-500/5"
      }`}
    >
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          alert.triggered ? "bg-emerald-500/10" : "bg-amber-500/15"
        }`}
      >
        {alert.triggered ? (
          <CheckCircle size={14} className="text-emerald-400" strokeWidth={2} />
        ) : (
          <Bell size={14} className="text-amber-400" strokeWidth={2} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[#f5f7fa]">
            {alert.symbol}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              alert.triggered
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {alert.triggered ? "Triggered" : "Active"}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-[#8a93a3]">
          Alert when price{" "}
          <span className="font-medium text-[#f5f7fa]">{dirLabel}</span>{" "}
          <span className="font-semibold text-amber-400">₹{fmt(alert.targetPrice)}</span>
        </p>
        {alert.triggered && alert.triggeredAt && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#4f5867]">
            <Clock size={10} strokeWidth={1.8} />
            Triggered {formatRelativeTime(alert.triggeredAt)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="flex-shrink-0 rounded-md p-1.5 text-[#4f5867] transition hover:bg-[#1e2530] hover:text-red-400 disabled:opacity-40"
        aria-label="Delete alert"
      >
        <Trash2 size={13} strokeWidth={1.8} />
      </button>
    </div>
  );
};

const Alerts = () => {
  const { alerts, loading, removeAlert } = useAlerts();
  const [showModal, setShowModal] = useState(false);

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <DashboardLayout>
      <div className="flex max-w-[860px] flex-col gap-5">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-400">
              Price Alerts
            </p>
            <h1 className="text-2xl font-semibold text-[#f5f7fa]">Alerts</h1>
            <p className="text-sm text-[#8a93a3]">
              Get notified when a stock crosses your target price.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex flex-shrink-0 items-center gap-2 rounded-md bg-amber-500 px-3.5 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            <Plus size={14} strokeWidth={2.5} />
            New Alert
          </button>
        </header>

        {/* Active alerts */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#f5f7fa]">Active</h2>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
              {activeAlerts.length}
            </span>
          </div>

          {loading ? (
            <div className="rounded-lg border border-[#1e2530] bg-[#11161f] px-6 py-10 text-center text-sm text-[#8a93a3]">
              Loading alerts…
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-[#1e2530] bg-[#11161f] px-6 py-12">
              <Bell size={28} className="text-[#2a3344]" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[#f5f7fa]">No active alerts</p>
              <p className="text-xs text-[#4f5867]">
                Click &ldquo;New Alert&rdquo; or use the Set Alert button on the dashboard.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeAlerts.map((a) => (
                <AlertRow key={a._id} alert={a} onDelete={removeAlert} />
              ))}
            </div>
          )}
        </section>

        {/* Triggered alerts */}
        {triggeredAlerts.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#f5f7fa]">Triggered</h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                {triggeredAlerts.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {triggeredAlerts.map((a) => (
                <AlertRow key={a._id} alert={a} onDelete={removeAlert} />
              ))}
            </div>
          </section>
        )}
      </div>

      {showModal && (
        <SetAlertModal
          symbol=""
          currentPrice={null}
          onClose={() => setShowModal(false)}
          onCreated={() => setShowModal(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default Alerts;
