import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar as CalendarIcon, Edit2, PlayCircle, Headphones, MessageCircle, BookOpen, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip
} from 'recharts';

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
        <Radar name="Current" dataKey="Current" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} dot />
        <Radar name="Target" dataKey="Target" stroke="#2ec4b6" fill="#2ec4b6" fillOpacity={0.10} strokeWidth={2} strokeDasharray="4 2" />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
        <Tooltip
          formatter={(v: any, name: string) => [`Band ${Number(v).toFixed(1)}`, name]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/* ─── Weekly Progress Card ────────────────────────────────────────────────── */
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

/* ─── Main ────────────────────────────────────────────────────────────────── */
export function Dashboard() {
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
  const overallBand = totalScores.length === 4 ? (totalScores.reduce((a, b) => a + b, 0) / 4) : 0;

  const targets = {
    Reading: (settings as any)?.targetReading || 7,
    Listening: (settings as any)?.targetListening || 7,
    Writing: (settings as any)?.targetWriting || 7,
    Speaking: (settings as any)?.targetSpeaking || 7,
  };
  const overallTarget = Object.values(targets).reduce((a: any, b: any) => a + b, 0) / 4;

  const getDaysColor = (days: number) => {
    if (days > 30) return 'text-green-500 bg-green-50';
    if (days > 15) return 'text-yellow-500 bg-yellow-50';
    return 'text-red-500 bg-red-50';
  };

  const getProgressColor = (days: number) => {
    if (days > 30) return '[&>div]:bg-green-500';
    if (days > 15) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-red-500';
  };

  const getRoutineTask = (daysLeft: number) => {
    if (daysLeft > 28) return { phase: "Foundation", desc: "Focus on question type drills and building vocabulary.", color: "text-blue-600" };
    if (daysLeft > 14) return { phase: "Mixed Practice", desc: "Start doing timed passages and applying strategies.", color: "text-purple-600" };
    if (daysLeft > 7) return { phase: "Mock Tests", desc: "Do full timed tests to build stamina.", color: "text-coral" };
    return { phase: "Final Polish", desc: "Light review, rest well, and trust your preparation.", color: "text-teal" };
  };

  const task = getRoutineTask(daysRemaining);

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
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2B406A] rounded-2xl p-8 shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-coral opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <p className="text-teal font-medium tracking-wide mb-1 uppercase text-sm">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
            Welcome back, {settings?.name || 'Student'}! Keep going.
          </h1>
          <div className="bg-white/10 border border-white/20 rounded-lg p-4 inline-block backdrop-blur-md">
            <p className="text-white/90 italic font-serif">"{quote}"</p>
          </div>
        </div>
      </div>

      {/* Top 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 shadow-sm hover-elevate transition-all border-none">
          <CardContent className={`p-6 h-full flex flex-col justify-center ${hasExamDate ? getDaysColor(Math.max(0, daysRemaining)).split(' ')[1] : 'bg-gray-50'} rounded-xl border border-transparent`}>
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className={`w-5 h-5 ${hasExamDate ? getDaysColor(Math.max(0, daysRemaining)).split(' ')[0] : 'text-gray-400'}`} />
              <h3 className="font-semibold text-lg text-gray-800">Exam Countdown</h3>
            </div>
            {!hasExamDate ? (
              <div className="flex-1 flex flex-col justify-center">
                <p className="text-sm text-gray-400">Set your exam date in Settings to see the countdown.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-5xl font-heading font-bold mb-1 tracking-tight text-gray-900">
                  {daysRemaining > 0 ? daysRemaining : daysRemaining === 0 ? '🎓' : `${Math.abs(daysRemaining)}d`}
                </div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-4">
                  {daysRemaining > 0 ? 'Days left' : daysRemaining === 0 ? 'Exam day!' : 'Days ago'}
                </p>
                <Progress value={Math.min(100, Math.max(0, (90 - Math.max(0, daysRemaining)) / 90 * 100))} className={`h-2.5 bg-black/10 ${getProgressColor(Math.max(0, daysRemaining))}`} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm hover-elevate transition-all border-none">
          <CardContent className="p-6 h-full flex flex-col justify-center items-center text-center bg-card rounded-xl">
            <h3 className="font-semibold text-lg text-foreground mb-4 w-full text-left">Overall Band</h3>
            <div className="relative w-32 h-32 flex items-center justify-center mb-2">
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#E5E7EB" strokeWidth="12" className="dark:stroke-gray-800" />
                <circle cx="64" cy="64" r="56" fill="none" stroke="#2EC4B6" strokeWidth="12" strokeDasharray="351.8"
                  strokeDashoffset={351.8 - (351.8 * Math.min(100, overallTarget > 0 ? (overallBand / overallTarget) * 100 : 0)) / 100}
                  className="transition-all duration-1000 ease-out" strokeLinecap="round" />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-4xl font-bold text-foreground">{overallBand.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground font-medium">Target: {overallTarget.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm hover-elevate transition-all border-none">
          <CardContent className="p-6 h-full flex flex-col bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-5 h-5 text-teal" />
              <h3 className="font-semibold text-lg text-foreground">Today's Focus</h3>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 w-max bg-white dark:bg-gray-800 shadow-sm ${task.color}`}>{task.phase}</span>
              <p className="text-muted-foreground font-medium leading-relaxed">{task.desc}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── This Week ── */}
      <section>
        <div className="flex items-center gap-2 mb-4 border-l-4 border-teal pl-3">
          <TrendingUp className="w-5 h-5 text-teal" />
          <h2 className="text-2xl font-heading font-bold text-foreground">This Week</h2>
          <span className="text-xs text-muted-foreground ml-1">vs last week</span>
        </div>
        <WeeklyProgress
          sessions={sessions as any[]}
          practiceLogs={practiceLogs as any[]}
          vocabWords={vocabWords as any[]}
          dailyGoalMinutes={settings?.dailyGoalMinutes || 60}
        />
      </section>

      {/* ── 2-col: Radar + Heatmap ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Study heatmap */}
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              📅 Study Activity — Last 52 Weeks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(sessions as any[]).length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                <span className="text-3xl">🌱</span>
                <p className="text-sm">Log your first study session to grow your heatmap.</p>
              </div>
            ) : (
              <StudyHeatmap sessions={sessions as any[]} />
            )}
          </CardContent>
        </Card>
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
            const progress = Math.min(100, target > 0 ? (current / target) * 100 : 0);
            const config = getModuleConfig(mod);
            const Icon = config.icon;
            return (
              <Card key={mod} className={`overflow-hidden shadow-sm hover-elevate border-t-4 ${config.border}`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}><Icon className="w-4 h-4" /></div>
                      <h3 className="font-semibold text-foreground">{mod}</h3>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-xl ${config.color}`}>{current > 0 ? current.toFixed(1) : '-'}</div>
                      <div className="text-xs text-muted-foreground font-medium">of {target.toFixed(1)}</div>
                    </div>
                  </div>
                  <Progress value={progress} className={`h-2 bg-muted ${config.bar}`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
