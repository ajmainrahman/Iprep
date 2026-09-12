import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; } // Monday

const FILTERS = ['Overview', 'Listening', 'Reading', 'Writing', 'Speaking', 'Vocabulary'];
const RANGES = ['This Week', 'Last Week', 'Last 4 Weeks'] as const;
type Range = typeof RANGES[number];

function fmtDuration(mins: number) {
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
}

export function LearningActivity({ sessions }: { sessions: any[] }) {
  const [filter, setFilter] = useState('Overview');
  const [range, setRange] = useState<Range>('This Week');

  const filtered = filter === 'Overview' ? sessions : sessions.filter((s: any) => s.module === filter);

  const today = new Date();
  const thisWeekStart = startOfWeek(today);
  const lastWeekStart = addDays(thisWeekStart, -7);

  const dayTotals = (weekStart: Date) => Array.from({ length: 7 }, (_, i) => {
    const ds = localDateStr(addDays(weekStart, i));
    return filtered.filter((s: any) => s.date === ds).reduce((a: number, s: any) => a + Number(s.minutes || 0), 0);
  });

  const thisWeekDaily = dayTotals(thisWeekStart);
  const lastWeekDaily = dayTotals(lastWeekStart);
  const thisWeekTotal = thisWeekDaily.reduce((a, b) => a + b, 0);
  const lastWeekTotal = lastWeekDaily.reduce((a, b) => a + b, 0);

  const chartData = useMemo(() => {
    if (range === 'Last 4 Weeks') {
      return Array.from({ length: 4 }, (_, i) => {
        const wStart = addDays(thisWeekStart, -7 * (3 - i));
        const total = dayTotals(wStart).reduce((a, b) => a + b, 0);
        return { label: `Wk ${i + 1}`, ThisPeriod: total };
      });
    }
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (range === 'Last Week') {
      return days.map((d, i) => ({ label: d, ThisPeriod: lastWeekDaily[i] }));
    }
    return days.map((d, i) => ({ label: d, ThisWeek: thisWeekDaily[i], LastWeek: lastWeekDaily[i] }));
  }, [range, filtered]);

  const comparisonText = () => {
    if (lastWeekTotal === 0 && thisWeekTotal === 0) return null;
    if (lastWeekTotal === 0) return { text: 'Started studying this week', positive: true };
    const diff = thisWeekTotal - lastWeekTotal;
    const pct = Math.round((diff / lastWeekTotal) * 100);
    return { text: `${diff >= 0 ? '+' : ''}${fmtDuration(Math.abs(diff))} (${pct >= 0 ? '+' : ''}${pct}%)`, positive: diff >= 0 };
  };
  const comparison = comparisonText();

  const sessionsThisWeek = filtered.filter((s: any) => s.date >= localDateStr(thisWeekStart) && s.date <= localDateStr(today));
  const avgSession = sessionsThisWeek.length > 0 ? Math.round(thisWeekTotal / sessionsThisWeek.length) : 0;

  const recent = [...filtered]
    .sort((a: any, b: any) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt))
    .slice(0, 5);

  return (
    <Card className="shadow-sm border-none">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">Learning Activity</CardTitle>
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${range === r ? 'bg-white dark:bg-gray-800 shadow-sm text-foreground' : 'text-muted-foreground'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors ${filter === f ? 'bg-teal text-white border-teal' : 'border-border text-muted-foreground hover:border-teal/50'}`}>
              {f}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact metric row */}
        <div className="flex flex-wrap gap-6 border-b border-border/60 pb-3">
          <div><p className="text-lg font-heading font-bold text-foreground">{fmtDuration(thisWeekTotal)}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Study Time</p></div>
          <div><p className="text-lg font-heading font-bold text-foreground">{sessionsThisWeek.length}</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sessions</p></div>
          <div><p className="text-lg font-heading font-bold text-foreground">{avgSession}m</p><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Session</p></div>
          {comparison && (
            <div>
              <p className={`flex items-center gap-1 text-lg font-heading font-bold ${comparison.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                {comparison.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />} {comparison.text}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">vs Last Week</p>
            </div>
          )}
        </div>

        {thisWeekTotal === 0 && lastWeekTotal === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground gap-1">
            <p className="text-sm">No study activity yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 60)}h`} />
              <Tooltip formatter={(v: any) => fmtDuration(Number(v))} />
              {range === 'This Week' && <Legend wrapperStyle={{ fontSize: 11 }} />}
              {range === 'This Week' ? (
                <>
                  <Bar dataKey="LastWeek" fill="#c7d2fe" radius={[4, 4, 0, 0]} name="Last Week" />
                  <Bar dataKey="ThisWeek" fill="#6366F1" radius={[4, 4, 0, 0]} name="This Week" />
                </>
              ) : (
                <Bar dataKey="ThisPeriod" fill="#6366F1" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Recent activity */}
        <div className="pt-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Recent Activity</p>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground">No study activity yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recent.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium text-foreground">{s.activityType || s.module}</p>
                    <p className="text-muted-foreground">{s.date === localDateStr(today) ? 'Today' : s.date === localDateStr(addDays(today, -1)) ? 'Yesterday' : s.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{s.minutes} min</p>
                    <p className="text-emerald-600 text-[10px]">Completed</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
