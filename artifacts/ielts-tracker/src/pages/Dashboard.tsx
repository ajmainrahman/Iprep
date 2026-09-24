import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar as CalendarIcon, Edit2, Headphones, MessageCircle, BookOpen, TrendingUp, TrendingDown, Minus, Flame, Trophy, Sparkles, ChevronLeft, ChevronRight, Plus, X, Clock, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import { DashboardHeroIllustration } from '@/components/illustrations/HigherStudyIllustrations';
import { useLocation } from 'wouter';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function calcCurrentStreak(sessions: any[]): number {
  const dayMap: Record<string, number> = {};
  sessions.forEach((session: any) => {
    const date = String(session.date || '');
    if (date) dayMap[date] = (dayMap[date] || 0) + Number(session.minutes || 0);
  });
  const activeDays = new Set(Object.keys(dayMap).filter(date => dayMap[date] > 0));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateStr(today);
  const yesterday = addDays(today, -1);
  const streakStart = activeDays.has(todayKey) ? today : yesterday;
  let currentStreak = 0;
  let cursor = streakStart;
  while (activeDays.has(localDateStr(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }
  return currentStreak;
}

const MOTIVATIONAL_QUOTES = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "Your only limit is your mind.",
  "Don't stop until you're proud.",
  "Small daily improvements are the key to staggering long-term results.",
  "Believe you can and you're halfway there.",
  "You don't have to be great to start, but you have to start to be great.",
  "Dream big and dare to fail.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Wake up with determination. Go to bed with satisfaction."
];

/* ─── 52-week heatmap ─────────────────────────────────────────────────────── */
function StudyHeatmap({ sessions }: { sessions: any[] }) {
  const [tooltip, setTooltip] = useState<{ date: string; mins: number; x: number; y: number } | null>(null);

  const dayMap = useMemo(() => {
    const m: Record<string, number> = {};
    sessions.forEach((s: any) => {
      m[s.date] = (m[s.date] || 0) + Number(s.minutes || 0);
    });
    return m;
  }, [sessions]);

  const today = new Date();
  const start = addDays(startOfWeek(today), -51 * 7);

  const weeks: { date: Date; dateStr: string; mins: number }[][] = [];
  let cur = new Date(start);
  while (cur <= today) {
    const week: { date: Date; dateStr: string; mins: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const ds = localDateStr(cur);
      week.push({ date: new Date(cur), dateStr: ds, mins: dayMap[ds] || 0 });
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }

  const cellColor = (mins: number) => {
    if (mins === 0) return '#e5e7eb';
    if (mins < 20) return '#c7d2fe';
    if (mins < 45) return '#818cf8';
    if (mins < 90) return '#4f46e5';
    return '#3730a3';
  };

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        <div className="flex flex-col gap-1 mr-1 pt-5">
          {DAYS.map((d, i) => (
            <div key={i} className="h-3 w-3 text-[9px] text-muted-foreground flex items-center">{i % 2 === 1 ? d : ''}</div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {wi % 4 === 0 && (
              <div className="text-[9px] text-muted-foreground h-4 leading-4">
                {week[0].date.toLocaleDateString(undefined, { month: 'short' })}
              </div>
            )}
            {wi % 4 !== 0 && <div className="h-4" />}
            {week.map((day, di) => (
              <div
                key={di}
                className="h-3 w-3 rounded-sm cursor-pointer transition-opacity hover:opacity-80 relative"
                style={{ backgroundColor: cellColor(day.mins) }}
                onMouseEnter={(e) => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setTooltip({ date: day.dateStr, mins: day.mins, x: rect.left, y: rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
        <span>Less</span>
        {['#e5e7eb', '#c7d2fe', '#818cf8', '#4f46e5', '#3730a3'].map(c => (
          <div key={c} className="h-3 w-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{ top: tooltip.y - 36, left: tooltip.x - 20 }}
        >
          {tooltip.date}: {tooltip.mins > 0 ? `${tooltip.mins} min` : 'No study'}
        </div>
      )}
    </div>
  );
}

/* ─── Progress visualisations ─────────────────────────────────────────────── */
function SemiCircleGauge({ value, target, scoredModules }: { value: number; target: number; scoredModules: number }) {
  const percent = Math.min(100, Math.max(0, target > 0 ? (value / target) * 100 : 0));

  return (
    <div className="relative mx-auto w-full max-w-[280px]" aria-label={`Overall band ${value.toFixed(1)} of ${target.toFixed(1)}`}>
      <svg viewBox="0 0 240 140" className="w-full overflow-visible" role="img">
        <defs>
          <linearGradient id="overall-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1B6B5B" />
            <stop offset="100%" stopColor="#F4A972" />
          </linearGradient>
        </defs>
        <path
          d="M 20 120 A 100 100 0 0 1 220 120"
          fill="none"
          stroke="currentColor"
          className="text-muted/70"
          strokeWidth="18"
          strokeLinecap="round"
          pathLength="100"
        />
        <path
          d="M 20 120 A 100 100 0 0 1 220 120"
          fill="none"
          stroke="url(#overall-gauge-gradient)"
          strokeWidth="18"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - percent}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-4xl font-heading font-bold tracking-tight text-foreground">
          {value > 0 ? value.toFixed(1) : '—'}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {scoredModules === 4 ? 'Overall band' : `${scoredModules}/4 modules scored`}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">Target {target.toFixed(1)}</span>
      </div>
    </div>
  );
}

function ModuleProgressRing({
  module,
  current,
  target,
  color,
  icon: Icon,
}: {
  module: string;
  current: number;
  target: number;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, target > 0 ? (current / target) * 100 : 0));

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" role="img" aria-label={`${module} progress`}>
          <circle cx="38" cy="38" r={radius} fill="none" stroke="currentColor" className="text-muted" strokeWidth="7" />
          <circle
            cx="38"
            cy="38"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * progress) / 100}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">
          {current > 0 ? current.toFixed(1) : '—'}
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18`, color }}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <p className="truncate text-sm font-semibold text-foreground">{module}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Target {target.toFixed(1)}</p>
        <p className="mt-0.5 text-[11px] font-semibold" style={{ color }}>
          {current > 0 ? `${Math.round(progress)}% there` : 'Awaiting first score'}
        </p>
      </div>
    </div>
  );
}

function StreakTracker({ sessions }: { sessions: any[] }) {
  const { currentStreak, record, activeDays, flameDays } = useMemo(() => {
    const dayMap: Record<string, number> = {};
    sessions.forEach((session: any) => {
      const date = String(session.date || '');
      if (date) dayMap[date] = (dayMap[date] || 0) + Number(session.minutes || 0);
    });

    const dates = Object.keys(dayMap).filter(date => dayMap[date] > 0).sort();
    const activeDays = new Set(dates);
    let record = 0;
    let running = 0;
    let previous: Date | null = null;

    dates.forEach(date => {
      const current = new Date(`${date}T00:00:00`);
      if (previous && Math.round((current.getTime() - previous.getTime()) / 86_400_000) === 1) running++;
      else running = 1;
      record = Math.max(record, running);
      previous = current;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = localDateStr(today);
    const yesterday = addDays(today, -1);
    const streakStart = activeDays.has(todayKey) ? today : yesterday;
    let currentStreak = 0;
    let cursor = streakStart;
    while (activeDays.has(localDateStr(cursor))) {
      currentStreak++;
      cursor = addDays(cursor, -1);
    }

    const flameDays = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(today, index - 6);
      const dateKey = localDateStr(date);
      return {
        key: dateKey,
        label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2),
        active: activeDays.has(dateKey),
        minutes: dayMap[dateKey] || 0,
      };
    });

    return { currentStreak, record, activeDays, flameDays };
  }, [sessions]);

  return (
    <Card className="h-full overflow-hidden border-0 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-[#FCE7B8]/40 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FCE7B8] text-[#8A5A0A]">
                <Flame className="h-4 w-4 fill-current" />
              </span>
              Study streak
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Build a rhythm, one focused session at a time.</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-heading font-bold leading-none text-[#8A5A0A]">{currentStreak}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">days</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="flex items-center justify-between rounded-2xl border border-[#FCE7B8] bg-[#FCE7B8]/40 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#8A5A0A]" />
            <span className="text-xs font-medium text-foreground">Your record</span>
          </div>
          <span className="text-sm font-bold text-[#8A5A0A]">{record} days</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {flameDays.map(day => (
            <div key={day.key} className="flex flex-col items-center gap-1.5">
              <div
                title={`${day.key}: ${day.minutes > 0 ? `${day.minutes} minutes` : 'No study'}`}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${
                  day.active
                    ? 'bg-[#FCE7B8] text-[#8A5A0A]'
                    : 'bg-muted/70 text-muted-foreground/40'
                }`}
              >
                <Flame className={`h-4 w-4 ${day.active ? 'fill-current' : ''}`} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          Activity heatmap
          <span className="ml-auto normal-case tracking-normal font-medium">{activeDays.size} active days</span>
        </div>
        {sessions.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            Log your first study session to start your streak.
          </div>
        ) : (
          <StudyHeatmap sessions={sessions} />
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Band Radar ──────────────────────────────────────────────────────────── */
function BandRadar({ scores, targets }: { scores: any[]; targets: Record<string, number> }) {
  const MODULES = ['Reading', 'Listening', 'Writing', 'Speaking'];
  const data = MODULES.map(mod => {
    const modScores = scores
      .filter((s: any) => s.module === mod)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const current = modScores.length > 0 ? modScores[0].band : 0;
    return { module: mod, Current: current, Target: targets[mod as keyof typeof targets] || 7 };
  });

  const hasData = data.some(d => d.Current > 0);

  if (!hasData) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
        <span className="text-3xl">📊</span>
        <p className="text-sm">Log your first score to see your radar chart.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="module" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <PolarRadiusAxis angle={90} domain={[0, 9]} tick={false} axisLine={false} />
        <Radar name="Current" dataKey="Current" stroke="#9C2B55" fill="#FBDCE6" fillOpacity={0.45} strokeWidth={2} dot />
        <Radar name="Target" dataKey="Target" stroke="#1B6B5B" fill="#CFEEE0" fillOpacity={0.25} strokeWidth={2} strokeDasharray="4 2" />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        <Tooltip
          formatter={(v: any, name: string) => [`Band ${Number(v).toFixed(1)}`, name]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* ─── Weekly Progress Card (retained per no-deletion rule; no longer rendered
   in the main layout — Learning Activity, which had replaced it, was also
   removed from the layout; this function is kept unrendered, not deleted) ── */
function WeeklyProgress({
  sessions, practiceLogs, vocabWords, dailyGoalMinutes
}: {
  sessions: any[];
  practiceLogs: any[];
  vocabWords: any[];
  dailyGoalMinutes: number;
}) {
  const today = new Date();

  const thisWeekStart = localDateStr(addDays(today, -6));
  const lastWeekStart = localDateStr(addDays(today, -13));
  const lastWeekEnd = localDateStr(addDays(today, -7));

  const inRange = (date: string, from: string, to: string) => date >= from && date <= to;
  const todayStr = localDateStr(today);

  const thisWeekSessions = sessions.filter((s: any) => s.date >= thisWeekStart && s.date <= todayStr);
  const lastWeekSessions = sessions.filter((s: any) => inRange(s.date, lastWeekStart, lastWeekEnd));

  const thisWeekMins = thisWeekSessions.reduce((a: number, s: any) => a + Number(s.minutes || 0), 0);
  const lastWeekMins = lastWeekSessions.reduce((a: number, s: any) => a + Number(s.minutes || 0), 0);

  const thisWeekPractice = practiceLogs.filter((p: any) => p.date >= thisWeekStart && p.date <= todayStr).length;
  const lastWeekPractice = practiceLogs.filter((p: any) => inRange(p.date, lastWeekStart, lastWeekEnd)).length;

  const thisWeekVocab = vocabWords.filter((w: any) => {
    if (!w.createdAt) return false;
    const d = localDateStr(new Date(w.createdAt));
    return d >= thisWeekStart && d <= todayStr;
  }).length;
  const lastWeekVocab = vocabWords.filter((w: any) => {
    if (!w.createdAt) return false;
    const d = localDateStr(new Date(w.createdAt));
    return inRange(d, lastWeekStart, lastWeekEnd);
  }).length;

  const dailyGoal = dailyGoalMinutes || 60;
  const daysMet = Array.from({ length: 7 }, (_, i) => localDateStr(addDays(today, -6 + i))).filter(day => {
    const dayMins = sessions.filter((s: any) => s.date === day).reduce((a: number, s: any) => a + Number(s.minutes || 0), 0);
    return dayMins >= dailyGoal;
  }).length;

  const delta = (cur: number, prev: number) => {
    if (prev === 0 && cur === 0) return null;
    const pct = prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);
    return pct;
  };

  const Arrow = ({ cur, prev }: { cur: number; prev: number }) => {
    const pct = delta(cur, prev);
    if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
    if (pct > 0) return <span className="flex items-center gap-0.5 text-xs text-green-600 font-semibold"><TrendingUp className="w-3 h-3" />+{pct}%</span>;
    if (pct < 0) return <span className="flex items-center gap-0.5 text-xs text-red-500 font-semibold"><TrendingDown className="w-3 h-3" />{pct}%</span>;
    return <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Minus className="w-3 h-3" />Same</span>;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Study Minutes', cur: thisWeekMins, prev: lastWeekMins, unit: 'min', emoji: '⏱️' },
        { label: 'Practice Logs', cur: thisWeekPractice, prev: lastWeekPractice, unit: '', emoji: '🎯' },
        { label: 'New Vocab', cur: thisWeekVocab, prev: lastWeekVocab, unit: '', emoji: '📚' },
        { label: 'Goal Days', cur: daysMet, prev: null, unit: '/7', emoji: '✅' },
      ].map(({ label, cur, prev, unit, emoji }) => (
        <div key={label} className="flex flex-col gap-1 p-4 rounded-xl bg-white dark:bg-gray-900 border border-border shadow-sm">
          <span className="text-lg">{emoji}</span>
          <p className="text-2xl font-bold text-foreground">{cur}{unit}</p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          {prev !== null ? <Arrow cur={cur} prev={prev} /> : <span className="text-xs text-muted-foreground">this week</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── NEW: Exam Calendar Widget (additive — does not replace anything) ─────── */
function ScheduleCalendarWidget({ examDate }: { examDate: string | null }) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(localDateStr(now));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newModule, setNewModule] = useState('General');
  const [newTime, setNewTime] = useState('18:00');
  const [newDuration, setNewDuration] = useState(30);

  const { data: scheduledSessions = [] } = useQuery({ queryKey: ['scheduled-sessions'], queryFn: api.getScheduledSessions });

  const addMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.addScheduledSession(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] });
      setShowAddForm(false);
      setNewTitle('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteScheduledSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled-sessions'] }),
  });

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const todayStr = localDateStr(now);
  const cells: { label: string; dateStr: string | null }[] = [];
  for (let i = 0; i < startOffset; i++) cells.push({ label: '', dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ label: String(d), dateStr: localDateStr(new Date(viewYear, viewMonth, d)) });
  }

  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const MODULES_LIST = ['General', 'Listening', 'Reading', 'Writing', 'Speaking', 'Vocabulary', 'Grammar', 'Mock Test'];

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const sessionsOnDate = (dateStr: string) => (scheduledSessions as any[]).filter((s: any) => s.date === dateStr);
  const selectedSessions = sessionsOnDate(selectedDate).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addMutation.mutate({
      title: newTitle.trim(),
      module: newModule,
      date: selectedDate,
      startTime: newTime,
      durationMinutes: Number(newDuration) || 30,
      priority: 'medium',
    });
  };

  return (
    <Card className="shadow-sm border-none h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-teal" />
            {monthLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <button type="button" onClick={goPrevMonth} aria-label="Previous month" className="h-7 w-7 rounded-full flex items-center justify-center bg-[#F4F5F6] hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={goNextMonth} aria-label="Next month" className="h-7 w-7 rounded-full flex items-center justify-center bg-[#F4F5F6] hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {DOW.map(d => (
            <div key={d} className="text-[10px] font-semibold uppercase text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {cells.map((cell, i) => {
            if (!cell.dateStr) return <div key={i} />;
            const isToday = cell.dateStr === todayStr;
            const isExam = examDate === cell.dateStr;
            const isSelected = cell.dateStr === selectedDate;
            const hasSessions = sessionsOnDate(cell.dateStr).length > 0;
            return (
              <button
                type="button"
                key={i}
                onClick={() => setSelectedDate(cell.dateStr as string)}
                className={`text-xs rounded-full h-8 w-8 flex items-center justify-center mx-auto font-medium transition-colors ${
                  isSelected ? 'bg-[#15181A] text-white font-bold' :
                  isExam ? 'bg-[#FBDCE6] text-[#9C2B55] font-bold' :
                  hasSessions ? 'bg-[#CFEEE0] text-[#1B6B5B] font-semibold' :
                  isToday ? 'border border-dashed border-muted-foreground text-foreground' :
                  'text-foreground hover:bg-muted'
                }`}
              >
                {cell.label}
              </button>
            );
          })}
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">
              {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1 text-xs font-medium text-[#1B6B5B] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add task
            </button>
          </div>

          {showAddForm && (
            <div className="mb-3 p-3 rounded-lg bg-[#F6FBF8] border border-[#CFEEE0] space-y-2">
              <input
                type="text"
                placeholder="Task title, e.g. Writing Task 2 practice"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full text-xs rounded-md border border-border px-2 py-1.5 bg-white"
              />
              <div className="flex gap-2">
                <select value={newModule} onChange={e => setNewModule(e.target.value)} className="flex-1 text-xs rounded-md border border-border px-2 py-1.5 bg-white">
                  {MODULES_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="text-xs rounded-md border border-border px-2 py-1.5 bg-white" />
                <input type="number" min={5} step={5} value={newDuration} onChange={e => setNewDuration(Number(e.target.value))} className="w-16 text-xs rounded-md border border-border px-2 py-1.5 bg-white" />
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={addMutation.isPending || !newTitle.trim()}
                className="w-full text-xs font-medium bg-[#1B6B5B] text-white rounded-md py-1.5 disabled:opacity-50"
              >
                {addMutation.isPending ? 'Saving…' : 'Save task'}
              </button>
            </div>
          )}

          {selectedSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No tasks scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedSessions.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-[#CFEEE0]/60 px-3 py-2.5 text-xs">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shrink-0">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#1B6B5B]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{s.title}</p>
                    <p className="text-[#1B6B5B]">{s.startTime} · {s.durationMinutes}m · {s.module}</p>
                  </div>
                  <button type="button" onClick={() => deleteMutation.mutate(s.id)} aria-label="Delete task" className="text-[#1B6B5B]/60 hover:text-red-500 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {examDate && (
          <p className="mt-3 text-[10px] text-muted-foreground text-center border-t border-border pt-2">
            🎓 Exam day: {new Date(examDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── NEW: Live Exam Countdown Timer (days/hrs/mins/secs) ───────────────────── */
function ExamCountdownTimer({ examDate, examTime }: { examDate: string | null; examTime: string | null }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!examDate) {
    return (
      <Card className="col-span-1 shadow-sm hover-elevate transition-all border-none">
        <CardContent className="p-6 h-full flex flex-col justify-center bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-lg text-gray-800">Exam Countdown</h3>
          </div>
          <p className="text-sm text-gray-400">Set your exam date in Settings to see the countdown.</p>
        </CardContent>
      </Card>
    );
  }

  const [y, mo, d] = examDate.split('-').map(Number);
  const [th, tm] = (examTime || '00:00').split(':').map(Number);
  const target = new Date(y, mo - 1, d, th || 0, tm || 0, 0);
  const diffMs = Math.max(0, target.getTime() - now.getTime());

  const days = Math.floor(diffMs / 86_400_000);
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  const seconds = Math.floor((diffMs % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const isPast = target.getTime() <= now.getTime();

  return (
    <Card className="col-span-1 shadow-lg border-none overflow-hidden">
      <CardContent className="p-6 h-full flex flex-col justify-center bg-gradient-to-br from-navy to-navy/80 rounded-xl text-white">
        {isPast ? (
          <div className="flex flex-col items-center justify-center gap-2 py-4">
            <span className="text-4xl">🎓</span>
            <p className="text-sm font-medium text-white/80">Exam day has arrived — good luck!</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { value: days, label: 'Days' },
                { value: hours, label: 'Hrs' },
                { value: minutes, label: 'Mins' },
                { value: seconds, label: 'Secs' },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center bg-white/10 rounded-xl py-3">
                  <span className="text-2xl font-heading font-bold tabular-nums">{pad(value)}</span>
                  <span className="text-[10px] uppercase tracking-wider text-white/60 mt-1">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-medium">
                <CalendarIcon className="w-3.5 h-3.5" />
                {target.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                {target.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── NEW: Vocabulary Progress Card (reads the same data as Vocabulary Bank) ── */
function VocabularyProgressCard({ words }: { words: any[] }) {
  const total = words.length;
  const learned = words.filter((w: any) => w.known === 'true').length;
  const remaining = total - learned;
  const percent = total === 0 ? 0 : (learned / total) * 100;

  return (
    <Card className="shadow-sm border-none">
      <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6 bg-[#E3DEFA]/40 rounded-xl">
        <div className="flex items-center gap-2 shrink-0">
          <BookOpen className="w-5 h-5 text-[#4A3B8C]" />
          <h3 className="font-semibold text-base text-foreground">Vocabulary Progress</h3>
        </div>
        <div className="flex gap-8 flex-1 justify-around sm:justify-start">
          <div className="text-center sm:text-left">
            <p className="text-[11px] text-[#4A3B8C] font-bold uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-heading font-bold text-foreground">{total}</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-[11px] text-[#1B6B5B] font-bold uppercase tracking-wider mb-1">Learned</p>
            <p className="text-2xl font-heading font-bold text-foreground">{learned}</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-[11px] text-[#8A5A0A] font-bold uppercase tracking-wider mb-1">Remaining</p>
            <p className="text-2xl font-heading font-bold text-foreground">{remaining}</p>
          </div>
        </div>
        <div className="w-full sm:w-48">
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground mb-1.5">
            <span>Mastery</span>
            <span className="text-[#4A3B8C] font-semibold">{Math.round(percent)}%</span>
          </div>
          <Progress value={percent} className="h-2 [&>div]:bg-[#4A3B8C] bg-[#E3DEFA]" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const { data: scores = [], isLoading: scoresLoading } = useQuery({ queryKey: ['scores'], queryFn: api.getScores });
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({ queryKey: ['study-sessions'], queryFn: api.getStudySessions });
  const { data: practiceLogs = [] } = useQuery({ queryKey: ['practice-logs'], queryFn: api.getPracticeLogs });
  const { data: vocabWords = [] } = useQuery({ queryKey: ['vocab'], queryFn: api.getVocab });

  if (settingsLoading || scoresLoading || sessionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  const getDaysRemaining = () => {
    if (!settings?.examDate) return null;
    const [y, mo, d] = (settings.examDate as string).split('-').map(Number);
    const exam = new Date(y, mo - 1, d);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining() ?? 0;
  const hasExamDate = getDaysRemaining() !== null;
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const quote = MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];

  const latestScores: Record<string, number> = {};
  ['Reading', 'Writing', 'Speaking', 'Listening'].forEach(mod => {
    const modScores = (scores as any[]).filter(s => s.module === mod).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    latestScores[mod] = modScores.length > 0 ? modScores[0].band : 0;
  });

  const totalScores = Object.values(latestScores).filter(s => s > 0);
  const overallBand = totalScores.length > 0 ? (totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 0;

  const targets = {
    Reading: (settings as any)?.targetReading || 7,
    Listening: (settings as any)?.targetListening || 7,
    Writing: (settings as any)?.targetWriting || 7,
    Speaking: (settings as any)?.targetSpeaking || 7,
  };
  const overallTarget = Object.values(targets).reduce((a: any, b: any) => a + b, 0) / 4;

  const getDaysColor = (days: number) => {
    if (days > 30) return 'text-[#1B6B5B] bg-[#CFEEE0]';
    if (days > 15) return 'text-[#8A5A0A] bg-[#FCE7B8]';
    return 'text-[#9C2B55] bg-[#FBDCE6]';
  };

  const getProgressColor = (days: number) => {
    if (days > 30) return '[&>div]:bg-[#1B6B5B]';
    if (days > 15) return '[&>div]:bg-[#8A5A0A]';
    return '[&>div]:bg-[#9C2B55]';
  };

  const getModuleConfig = (mod: string) => {
    switch (mod) {
      case 'Reading': return { color: 'text-coral', bg: 'bg-coral/10', border: 'border-coral', bar: '[&>div]:bg-coral', icon: BookOpen };
      case 'Writing': return { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-500', bar: '[&>div]:bg-green-500', icon: Edit2 };
      case 'Speaking': return { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-500', bar: '[&>div]:bg-purple-500', icon: MessageCircle };
      case 'Listening': return { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-500', bar: '[&>div]:bg-yellow-500', icon: Headphones };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-500', bar: '[&>div]:bg-gray-500', icon: Target };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Hero */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E7ECE9] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#CFEEE0] opacity-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FBDCE6] opacity-40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div>
            <p className="text-[#1B6B5B] font-medium tracking-wide mb-1 uppercase text-sm">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4 text-foreground">
              Welcome back, {settings?.name || 'Student'}! Keep going.
            </h1>
            <div className="bg-[#F4F5F6] border border-[#E7ECE9] rounded-lg p-4 inline-block">
              <p className="text-muted-foreground italic font-serif">"{quote}"</p>
            </div>
          </div>
          <div className="hidden md:block shrink-0">
            <DashboardHeroIllustration size={160} />
          </div>
        </div>
      </div>

      {/* Quick stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setLocation('/study/study')} className="text-left rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(160deg, #FDEEE8 0%, #FBE9F0 100%)' }}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><Flame className="h-4 w-4" style={{ color: '#EA6A1F' }} /></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground mt-3">Study Streak</p>
          <p className="text-2xl font-black leading-none mt-1" style={{ color: '#14142B' }}>{calcCurrentStreak(sessions as any[])} {calcCurrentStreak(sessions as any[]) === 1 ? 'day' : 'days'}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Keep it up!</p>
        </button>

        <button onClick={() => setLocation('/study/scores')} className="text-left rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(160deg, #F3EEFC 0%, #EFEAF9 100%)' }}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><Target className="h-4 w-4" style={{ color: '#6B46C1' }} /></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground mt-3">IELTS Exam</p>
          <p className="text-2xl font-black leading-none mt-1" style={{ color: '#14142B' }}>{!hasExamDate ? 'Not set' : daysRemaining < 0 ? 'Passed' : `${daysRemaining} days`}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Left to apply</p>
        </button>

        <button onClick={() => setLocation('/study/scores')} className="text-left rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(160deg, #EAFBF5 0%, #E8F5F0 100%)' }}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><BookOpen className="h-4 w-4" style={{ color: '#108888' }} /></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground mt-3">Modules</p>
          <p className="text-2xl font-black leading-none mt-1" style={{ color: '#14142B' }}>{totalScores.length} / 4</p>
          <p className="text-[11px] text-muted-foreground mt-1">Completed</p>
        </button>

        <button onClick={() => setLocation('/study/scores')} className="text-left rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(160deg, #DCEFFB 0%, #E4F0FB 100%)' }}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><TrendingUp className="h-4 w-4" style={{ color: '#1D6FA5' }} /></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground mt-3">Target Band</p>
          <p className="text-2xl font-black leading-none mt-1" style={{ color: '#14142B' }}>{overallTarget.toFixed(1)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Overall</p>
        </button>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExamCountdownTimer examDate={hasExamDate ? (settings?.examDate as string) : null} examTime={(settings as any)?.examTime ?? null} />

        <Card className="col-span-1 shadow-sm hover-elevate transition-all border-none">
          <CardContent className="p-6 h-full flex flex-col justify-center items-center text-center bg-[#F6FBF8] rounded-xl">
            <h3 className="font-semibold text-lg text-foreground mb-4 w-full text-left">Overall Band</h3>
            <SemiCircleGauge value={overallBand} target={overallTarget} scoredModules={totalScores.length} />
          </CardContent>
        </Card>

      </div>

      {/* ── Vocabulary Progress ── */}
      <VocabularyProgressCard words={vocabWords as any[]} />

      {/* ── Lesson Schedule (calendar widget) ── */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-l-4 border-teal pl-3">
          <CalendarIcon className="w-5 h-5 text-teal" />
          <h2 className="text-2xl font-heading font-bold text-foreground">Lesson Schedule</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ScheduleCalendarWidget examDate={hasExamDate ? (settings?.examDate as string) : null} />
        </div>
      </section>

      {/* ── 2-col: Radar + Streak tracker ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[0.85fr_1.15fr] gap-6">
        {/* Radar chart */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              🎯 Band Score vs Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BandRadar scores={scores as any[]} targets={targets as Record<string, number>} />
          </CardContent>
        </Card>

        <StreakTracker sessions={sessions as any[]} />
      </div>

      {/* ── Module Progress ── */}
      <section>
        <div className="flex items-center justify-between mb-4 border-l-4 border-teal pl-3">
          <h2 className="text-2xl font-heading font-bold text-foreground">Module Progress</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['Reading', 'Listening', 'Writing', 'Speaking'].map((mod) => {
            const target = (targets as any)[mod] || 0;
            const current = latestScores[mod] || 0;
            const config = getModuleConfig(mod);
            const Icon = config.icon;
            return (
              <ModuleProgressRing
                key={mod}
                module={mod}
                current={current}
                target={target}
                color={config.color.includes('coral') ? '#9C2B55' : config.color.includes('green') ? '#1B6B5B' : config.color.includes('purple') ? '#4A3B8C' : '#8A5A0A'}
                icon={Icon}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
