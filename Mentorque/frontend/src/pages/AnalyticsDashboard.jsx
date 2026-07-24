import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import * as adminApi from "../api/admin";
import { useToast } from "../context/ToastContext";
import { SkeletonCardGrid, SkeletonChart } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { Spinner } from "../components/Spinner";

const CHART_COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f87171", "#818cf8"];

const CARD_META = [
  { key: "users", label: "Total Users", icon: "👥" },
  { key: "mentors", label: "Total Mentors", icon: "🎓" },
  { key: "scheduledCalls", label: "Scheduled Calls", icon: "📅" },
  { key: "completedCalls", label: "Completed Calls", icon: "✅" },
];

const EXPORTS = [
  { kind: "users", label: "Users" },
  { kind: "mentors", label: "Mentors" },
  { kind: "bookings", label: "Bookings" },
  { kind: "recommendations", label: "Recommendations" },
];

function KpiCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.035]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <span className="text-lg" aria-hidden>{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-ink-50 tabular-nums">{value}</p>
    </div>
  );
}

function ChartCard({ title, children, empty }) {
  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-5">
      <h3 className="text-sm font-semibold text-ink-200 mb-4">{title}</h3>
      {empty ? (
        <div className="flex h-56 items-center justify-center text-xs text-ink-600">No data yet</div>
      ) : (
        <div className="h-56">{children}</div>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  fontSize: 12,
  color: "#e2e8f0",
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exportingKind, setExportingKind] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApi.getAnalytics();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load analytics");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExport(kind) {
    setExportingKind(kind);
    try {
      await adminApi.exportCsv(kind);
      toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} CSV downloaded.`);
    } catch (err) {
      toast.error(err.message || `Failed to export ${kind}`);
    } finally {
      setExportingKind(null);
    }
  }

  if (error) {
    return (
      <EmptyState
        title="Couldn't load analytics"
        description={error}
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    );
  }

  const weeklyLabel = (w) => new Date(w).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const dayLabel = (d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Analytics</h1>
          <p className="text-ink-400 text-sm mt-1">Platform activity at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <button
              key={e.kind}
              onClick={() => handleExport(e.kind)}
              disabled={exportingKind === e.kind}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors hover:bg-white/[0.07] hover:text-ink-50 disabled:opacity-50"
            >
              {exportingKind === e.kind ? (
                <Spinner className="h-3 w-3" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              Export {e.label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <>
          <SkeletonCardGrid count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonChart />
            <SkeletonChart />
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CARD_META.map((c) => (
              <KpiCard key={c.key} label={c.label} value={data.totals[c.key]} icon={c.icon} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Weekly Activity" empty={!data.weeklyActivity?.some((w) => w.bookings > 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.weeklyActivity} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="week" tickFormatter={weeklyLabel} stroke="#64748b" fontSize={11} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={weeklyLabel} />
                  <Line type="monotone" dataKey="bookings" stroke="#38bdf8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Booking Trends (30 days)" empty={!data.bookingTrends?.some((d) => d.bookings > 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.bookingTrends} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bookingTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tickFormatter={dayLabel} stroke="#64748b" fontSize={11} interval={4} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} />
                  <Area type="monotone" dataKey="bookings" stroke="#a78bfa" fill="url(#bookingTrendGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Call Type Distribution" empty={!data.callTypeDistribution?.some((c) => c.count > 0)}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.callTypeDistribution}
                    dataKey="count"
                    nameKey="callType"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {data.callTypeDistribution.map((entry, i) => (
                      <Cell key={entry.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Mentor Utilization" empty={!data.mentorUtilization?.length}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.mentorUtilization} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={100} stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="bookings" fill="#34d399" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
