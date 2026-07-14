import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Star, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  CheckCircle, AlertTriangle, Pause, BarChart2,
  Zap, Target, Activity, ChevronDown, Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import designerApi, {
  DesignerPerformanceData,
} from '../../api/designerApi';

function StarRating({ value, size = 'sm' }: { value: number | null; size?: string }) {
  const s = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const v = Math.round(value ?? 0);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${i <= v ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </span>
  );
}

function Delta({ prev, curr }: { prev: number | null | undefined; curr: number }) {
  if (prev == null || prev === 0) return null;
  if (curr == null) return null;
  const diff = curr - prev;
  if (Math.abs(diff) < 0.01) return <span className="text-xs text-gray-400 ml-1">&mdash;</span>;
  const pct = Math.abs((diff / prev) * 100).toFixed(1);
  return diff > 0 ? (
    <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium ml-1">
      <TrendingUp className="w-3 h-3" />+{pct}%
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium ml-1">
      <TrendingDown className="w-3 h-3" />-{pct}%
    </span>
  );
}

function getPeriodParams(
  mode: string,
  offset: number,
): { year: number; periodValue: number } {
  const now = new Date();

  if (mode === 'yearly') {
    return { year: now.getFullYear() - offset, periodValue: 0 };
  }

  const d = new Date(now);
  if (mode === 'monthly') {
    d.setMonth(d.getMonth() - offset);
    return { year: d.getFullYear(), periodValue: d.getMonth() + 1 };
  }
  if (mode === 'quarterly') {
    d.setMonth(d.getMonth() - offset * 3);
    return { year: d.getFullYear(), periodValue: Math.floor(d.getMonth() / 3) + 1 };
  }
  d.setDate(d.getDate() - offset * 7);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
  return { year: d.getFullYear(), periodValue: Math.floor(dayOfYear / 7) + 1 };
}

export function DesignerPerformanceDashboard() {
  const { user } = useAuth();

  const isCEO = user?.role === 'ceo';
  const isDesigner = user?.role === 'designer';

  const [mode, setMode] = useState<string>('monthly');
  const [offset, setOffset] = useState(0);
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [data, setData] = useState<DesignerPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { year, periodValue } = useMemo(() => getPeriodParams(mode, offset), [mode, offset]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: {
      userId?: string;
      mode: string;
      year: number;
      periodValue: number;
    } = { mode, year, periodValue };

    if (!isDesigner && selectedDesignerId) {
      params.userId = selectedDesignerId;
    }

    designerApi
      .getDesignerPerformance(params)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setData(res.data);
          if (!isDesigner && !selectedDesignerId && res.data.selected) {
            setSelectedDesignerId(res.data.selected.id);
          }
        } else {
          setError('Failed to load performance data');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load performance data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, mode, year, periodValue, selectedDesignerId, isDesigner]);

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    setOffset(0);
  };

  const handleDesignerChange = (id: string) => setSelectedDesignerId(id);

  const kpis = data?.kpis;
  const prevKpis = data?.previousKpis;
  const designer = data?.selected;
  const breakdown = data?.storyPointBreakdown;
  const ratingBd = data?.ratingBreakdown;
  const prevRatingBd = data?.previousRatingBreakdown;
  const trend = data?.trend ?? [];

  const pieSP = useMemo(() => {
    if (!breakdown) return [];
    const items = [
      { name: 'Completed', value: breakdown.completed, color: '#10b981' },
      { name: 'Pending', value: breakdown.pending, color: '#6366f1' },
      { name: 'Rejected', value: breakdown.rejected, color: '#ef4444' },
    ];
    return items.filter((d) => d.value > 0);
  }, [breakdown]);

  const comparisonMetrics = useMemo(() => {
    if (!ratingBd || !prevRatingBd) return [];
    return [
      {
        label: 'Overall Rating',
        curr: kpis?.ratingAvg ?? null,
        prev: prevKpis?.ratingAvg ?? null,
      },
      { label: 'Creativity', curr: ratingBd.creativity ?? null, prev: prevRatingBd.creativity ?? null },
      { label: 'Timeliness', curr: ratingBd.timeliness ?? null, prev: prevRatingBd.timeliness ?? null },
      {
        label: 'Client Understanding',
        curr: ratingBd.clientUnderstanding ?? null,
        prev: prevRatingBd.clientUnderstanding ?? null,
      },
      {
        label: 'Rendering Quality',
        curr: ratingBd.renderingQuality ?? null,
        prev: prevRatingBd.renderingQuality ?? null,
      },
    ].filter((m) => m.curr != null || m.prev != null);
  }, [ratingBd, prevRatingBd, kpis, prevKpis]);

  if (!user) return null;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            Designer Performance
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Analytics &amp; Story Points Dashboard</p>
        </div>

        {!isDesigner && data && data.designers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedDesignerId}
                onChange={(e) => handleDesignerChange(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {data.designers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 text-xs font-bold">
                  {designer?.initials}
                </span>
              </div>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* ── Designer Profile Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow">
          <span className="text-white font-bold">{designer?.initials ?? '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-900">{designer?.full_name ?? 'Unknown'}</span>
          <p className="text-xs text-gray-500">{designer?.email ?? ''}</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="flex items-center gap-1 justify-end">
            <StarRating value={kpis?.ratingAvg ?? null} size="sm" />
            <span className="text-sm font-bold text-gray-700">
              {kpis?.ratingAvg != null ? kpis.ratingAvg.toFixed(1) : '\u2014'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Current period rating</p>
        </div>
      </div>

      {/* ── Time Filter ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ['weekly', 'Weekly'],
              ['monthly', 'Monthly'],
              ['quarterly', 'Quarterly'],
              ['yearly', 'Yearly'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleModeChange(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === val
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
            {data?.periodLabel ?? '\u2014'}
          </span>
          <button
            onClick={() => setOffset((o) => (o > 0 ? o - 1 : o))}
            disabled={offset === 0}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(!kpis
          ? []
          : ([
              {
                label: 'Avg Rating',
                value: kpis?.ratingAvg != null ? kpis.ratingAvg.toFixed(1) : '\u2014',
                previ: prevKpis?.ratingAvg ?? null,
                icon: <Star className="w-4 h-4" />,
                color: 'text-amber-500 bg-amber-50',
              },
              {
                label: 'Completed Tasks',
                value: kpis.completed,
                previ: prevKpis?.completed ?? null,
                icon: <CheckCircle className="w-4 h-4" />,
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                label: 'Story Points',
                value: kpis.totalSp,
                previ: prevKpis?.totalSp ?? null,
                icon: <Zap className="w-4 h-4" />,
                color: 'text-indigo-600 bg-indigo-50',
              },
              {
                label: 'Deadline %',
                value: kpis.deadlinePercent + '%',
                previ: prevKpis?.deadlinePercent ?? null,
                icon: <Target className="w-4 h-4" />,
                color: 'text-sky-600 bg-sky-50',
              },
              {
                label: 'Pending Tasks',
                value: kpis.inReview,
                previ: prevKpis?.inReview ?? null,
                icon: <Activity className="w-4 h-4" />,
                color: 'text-sky-600 bg-sky-50',
              },
              {
                label: 'Paused',
                value: kpis.paused,
                previ: prevKpis?.paused ?? null,
                icon: <Pause className="w-4 h-4" />,
                color: 'text-amber-600 bg-amber-50',
              },
              {
                label: 'Rejected',
                value: kpis.rejected,
                previ: prevKpis?.rejected ?? null,
                icon: <AlertTriangle className="w-4 h-4" />,
                color: 'text-red-500 bg-red-50',
              },
            ] as { label: string; value: string | number; previ: number | null; icon: React.ReactNode; color: string }[])
        ).map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{card.label}</span>
              <span className={`p-1.5 rounded-lg ${card.color}`}>{card.icon}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{card.value}</p>
            <Delta prev={card.previ} curr={parseFloat(String(card.value))} />
          </div>
        ))}
      </div>

      {/* ── Trend Charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Rating Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart
              data={trend}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [Number(v).toFixed(1), 'Rating']} />
              <Area
                type="monotone"
                dataKey="rating"
                stroke="#6366f1"
                fill="url(#rGrad)"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Story Points Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart
              data={trend}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [v, 'Points']} />
              <Area
                type="monotone"
                dataKey="storyPoints"
                stroke="#10b981"
                fill="url(#spGrad)"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Deadline Compliance %</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart
              data={trend}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [
                  v != null ? v + '%' : '\u2014',
                  'Compliance',
                ]}
              />
              <Line
                type="monotone"
                dataKey="compliancePercent"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b' }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Story Point Breakdown + Comparison ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Story Point Breakdown</p>
          {pieSP.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie
                    data={pieSP}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieSP.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v + ' pts', name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {pieSP.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-gray-600">{d.name}</span>
                    </span>
                    <span className="font-semibold text-gray-800">{d.value} pts</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between text-xs font-semibold text-gray-700">
                  <span>Total</span>
                  <span>{pieSP.reduce((s, d) => s + d.value, 0)} pts</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-gray-400">
              No data for this period
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Period Comparison</p>
          {comparisonMetrics.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs text-gray-400 font-medium mb-1">
                <span>Metric</span>
                <span className="text-center">Previous</span>
                <span className="text-center">Current</span>
              </div>
              {comparisonMetrics.map((m, i) => {
                const currVal = m.curr ?? 0;
                const prevVal = m.prev ?? 0;
                const diff = currVal - prevVal;
                const improved = diff > 0.05;
                const declined = diff < -0.05;
                return (
                  <div
                    key={i}
                    className="grid grid-cols-3 items-center text-xs py-1.5 border-b border-gray-50"
                  >
                    <span className="text-gray-600 font-medium truncate pr-1">{m.label}</span>
                    <span className="text-center text-gray-500">{m.prev ?? '\u2014'}</span>
                    <span
                      className={`text-center font-semibold flex items-center justify-center gap-0.5 ${
                        improved
                          ? 'text-emerald-600'
                          : declined
                            ? 'text-red-500'
                            : 'text-gray-700'
                      }`}
                    >
                      {m.curr?.toFixed(1) ?? '\u2014'}
                      {improved && <TrendingUp className="w-3 h-3" />}
                      {declined && <TrendingDown className="w-3 h-3" />}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-gray-400">
              No comparison data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DesignerPerformanceDashboard;
