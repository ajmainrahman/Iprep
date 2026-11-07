/* ielts-analytics-v1 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { StudyPageHeader } from '@/components/illustrations/StudyPageHeader';
import { TrophyBadge } from '@/components/illustrations/StudyIllustrations';
import { MODULE_STYLES } from '@/lib/moduleStyles';
import {
  CalendarClock, TrendingUp, TrendingDown, Minus, ThumbsUp, TriangleAlert, Clock, Flame, ListChecks, Lightbulb, ArrowRight, Check,
} from 'lucide-react';

/* ─── What we know about each practice area ─────────────────────────────── */
const MODS = ['Reading', 'Listening', 'Writing', 'Speaking'] as const;
type Mod = typeof MODS[number];

interface AreaDef { id: string; module: Mod; label: string; kind: 'accuracy' | 'band' }
const AREAS: AreaDef[] = [
  ...['True/False/Not Given', 'Yes/No/Not Given', 'Summary/Gap Fill', 'Matching Headings', 'Matching Information', 'Multiple Choice', 'Sentence Completion']
    .map(id => ({ id, module: 'Reading' as Mod, label: id.replace(/\//g, ' / '), kind: 'accuracy' as const })),
  { id: 'Part 1', module: 'Listening', label: 'Part 1 · forms & notes', kind: 'accuracy' },
  { id: 'Part 2', module: 'Listening', label: 'Part 2 · monologue', kind: 'accuracy' },
  { id: 'Part 3', module: 'Listening', label: 'Part 3 · discussion', kind: 'accuracy' },
  { id: 'Part 4', module: 'Listening', label: 'Part 4 · lecture', kind: 'accuracy' },
  { id: 'Task 1', module: 'Writing', label: 'Task 1 · graph / chart', kind: 'band' },
  { id: 'Task 2', module: 'Writing', label: 'Task 2 · essay', kind: 'band' },
  { id: 'Part 1', module: 'Speaking', label: 'Part 1 · interview', kind: 'band' },
  { id: 'Part 2', module: 'Speaking', label: 'Part 2 · cue card', kind: 'band' },
  { id: 'Part 3', module: 'Speaking', label: 'Part 3 · discussion', kind: 'band' },
];
const ACCURACY_GOAL = 80; // % correct that counts as "exam ready" for Reading / Listening question practice
const DEFAULT_TARGETS: Record<Mod, number> = { Reading: 6.5, Listening: 6.5, Writing: 6.5, Speaking: 6.0 };

/* ─── Small date helpers (local time) ───────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
const shortDate = (s: string) => parse(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const half = (n: number) => Math.round(n * 2) / 2; // IELTS rounds to the nearest half band
const fmt = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(Math.round(n * 10) / 10));

/* ─── The analysis (pure, so it is easy to check) ───────────────────────── */
export interface Area extends AreaDef { attempts: number; value: number; readiness: number; recent: number | null }
export function analyze(input: { settings: any; scores: any[]; sessions: any[]; logs: any[] }, now = new Date()) {
  const { settings, scores, sessions, logs } = input;
  const targets: Record<Mod, number> = {
    Reading: Number(settings?.targetReading) || DEFAULT_TARGETS.Reading,
    Listening: Number(settings?.targetListening) || DEFAULT_TARGETS.Listening,
    Writing: Number(settings?.targetWriting) || DEFAULT_TARGETS.Writing,
    Speaking: Number(settings?.targetSpeaking) || DEFAULT_TARGETS.Speaking,
  };
  const overallTarget = half(MODS.reduce((a, m) => a + targets[m], 0) / 4);
  const dailyGoal = Number(settings?.dailyGoalMinutes) || 30;
  const examDate: Date | null = settings?.examDate ? parse(settings.examDate) : null;
  const daysLeft = examDate ? dayDiff(examDate, now) : null;

  // ---- mock tests: one row per module per date
  const byMod: Record<Mod, { date: string; band: number }[]> = { Reading: [], Listening: [], Writing: [], Speaking: [] };
  scores.forEach(s => { if ((MODS as readonly string[]).includes(s.module) && typeof s.band === 'number') byMod[s.module as Mod].push({ date: s.date, band: s.band }); });
  MODS.forEach(m => byMod[m].sort((a, b) => a.date.localeCompare(b.date)));
  const modules = MODS.map(m => {
    const list = byMod[m];
    const latest = list.length ? list[list.length - 1].band : null;
    const prev = list.length > 1 ? list[list.length - 2].band : null;
    const best = list.length ? Math.max(...list.map(x => x.band)) : null;
    const gap = latest === null ? null : Math.round((targets[m] - latest) * 10) / 10;
    return { module: m, target: targets[m], latest, prev, best, gap, history: list.map(x => x.band), count: list.length };
  });
  const have = modules.filter(m => m.latest !== null);
  const currentOverall = have.length ? half(have.reduce((a, m) => a + (m.latest as number), 0) / have.length) : null;

  // ---- sittings (all scores on the same date) and the overall trend
  const dateMap = new Map<string, number[]>();
  scores.forEach(s => { if ((MODS as readonly string[]).includes(s.module) && typeof s.band === 'number') { if (!dateMap.has(s.date)) dateMap.set(s.date, []); dateMap.get(s.date)!.push(s.band); } });
  const sittings = [...dateMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, bands]) => ({ date, overall: Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 100) / 100, full: bands.length >= 4 }));
  let projected: number | null = null;
  let slopePerWeek: number | null = null;
  if (sittings.length >= 3 && daysLeft !== null && daysLeft > 0) {
    const t0 = parse(sittings[0].date).getTime();
    const xs = sittings.map(s => (parse(s.date).getTime() - t0) / 86400000);
    const ys = sittings.map(s => s.overall);
    const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    const den = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    if (den > 0) {
      const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / den;
      slopePerWeek = Math.round(slope * 7 * 100) / 100;
      const xe = (examDate!.getTime() - t0) / 86400000;
      projected = Math.max(0, Math.min(9, half(my + slope * (xe - mx))));
    }
  }
  const lastSitting = sittings.length ? sittings[sittings.length - 1] : null;
  const daysSinceMock = lastSitting ? dayDiff(now, parse(lastSitting.date)) : null;

  // ---- practice areas
  const areas: Area[] = AREAS.map(def => {
    const rows = logs.filter(l => l.module === def.module && l.subType === def.id).sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const attempts = rows.length;
    let value = 0, readiness = 0, recent: number | null = null;
    if (attempts) {
      if (def.kind === 'accuracy') {
        const tot = rows.reduce((a, l) => a + (l.totalQuestions || 0), 0);
        value = tot ? (rows.reduce((a, l) => a + l.score, 0) / tot) * 100 : 0;
        readiness = Math.min(130, (value / ACCURACY_GOAL) * 100);
        const last = rows.slice(-3); const lt = last.reduce((a, l) => a + (l.totalQuestions || 0), 0);
        recent = lt ? (last.reduce((a, l) => a + l.score, 0) / lt) * 100 : null;
      } else {
        const last = rows.slice(-3);
        value = last.reduce((a, l) => a + l.score, 0) / last.length;
        readiness = Math.min(130, (value / targets[def.module]) * 100);
        recent = value;
      }
    }
    return { ...def, attempts, value, readiness, recent };
  });
  const practised = areas.filter(a => a.attempts > 0);
  const weaknesses = practised.filter(a => a.readiness < 100).sort((a, b) => a.readiness - b.readiness).slice(0, 4);
  const strengths = practised.filter(a => a.readiness >= 100).sort((a, b) => b.readiness - a.readiness).slice(0, 4);
  const untouched = areas.filter(a => a.attempts === 0);

  // ---- study time (last 30 days) and the last 14 days strip
  const limit30 = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  const recentSessions = sessions.filter(s => s.date >= limit30);
  const minutesBy: Record<string, number> = {};
  recentSessions.forEach(s => { minutesBy[s.module] = (minutesBy[s.module] || 0) + (s.minutes || 0); });
  const totalMin = MODS.reduce((a, m) => a + (minutesBy[m] || 0), 0);
  const needRaw = modules.map(m => {
    const fromMock = m.gap;
    const area = practised.filter(a => a.module === m.module);
    const fromPractice = area.length ? Math.max(0, 1 - area.reduce((a, x) => a + Math.min(1, x.readiness / 100), 0) / area.length) * 2 : null;
    return Math.max(0.25, fromMock ?? fromPractice ?? 0.5);
  });
  const needSum = needRaw.reduce((a, b) => a + b, 0);
  const balance = modules.map((m, i) => ({
    module: m.module,
    minutes: minutesBy[m.module] || 0,
    spendPct: totalMin ? Math.round(((minutesBy[m.module] || 0) / totalMin) * 100) : 0,
    needPct: Math.round((needRaw[i] / needSum) * 100),
  }));
  const strip = Array.from({ length: 14 }, (_, i) => {
    const d = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (13 - i)));
    return { date: d, minutes: sessions.filter(s => s.date === d).reduce((a, s) => a + (s.minutes || 0), 0) };
  });
  const activeDays = strip.filter(d => d.minutes > 0).length;
  const goalDays = strip.filter(d => d.minutes >= dailyGoal).length;
  let streak = 0;
  for (let i = strip.length - 1; i >= 0; i--) { if (strip[i].minutes > 0) streak++; else if (i === strip.length - 1) continue; else break; }
  const avgPerActive = activeDays ? Math.round(strip.reduce((a, d) => a + d.minutes, 0) / activeDays) : 0;
  const improveNotes = [...sessions].filter(s => (s.improve || '').trim()).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 4);

  // ---- the biggest gap and what to do about it
  const worstModule = [...modules].filter(m => m.gap !== null && (m.gap as number) > 0).sort((a, b) => (b.gap as number) - (a.gap as number))[0] ?? null;
  const sessionsPossible = daysLeft !== null && daysLeft > 0 ? Math.max(1, Math.floor(daysLeft / 3)) : null;
  const plan: { tone: 'high' | 'mid' | 'low'; title: string; detail: string }[] = [];
  if (!scores.length) plan.push({ tone: 'high', title: 'Take a full mock test', detail: 'No mock scores yet. A full mock is the quickest way to see your real level in all four skills. Log it in Mock Test.' });
  else if (daysSinceMock !== null && daysSinceMock >= 14) plan.push({ tone: 'high', title: 'Take a new mock test', detail: `Your last mock was ${daysSinceMock} days ago. Do one soon so these numbers stay true.` });
  if (worstModule) {
    const b = balance.find(x => x.module === worstModule.module)!;
    plan.push({ tone: 'high', title: `Focus on ${worstModule.module}`, detail: `It is ${fmt(worstModule.gap as number)} band below target (${fmt(worstModule.latest as number)} now, ${fmt(worstModule.target)} needed). You spent ${b.spendPct}% of your last 30 days of study time on it${b.spendPct < b.needPct ? `; aim for about ${b.needPct}%` : ''}.` });
  }
  weaknesses.slice(0, 2).forEach(a => plan.push({
    tone: 'mid',
    title: `Practise ${a.module}: ${a.label}`,
    detail: `${a.kind === 'accuracy' ? `${Math.round(a.value)}% correct (goal ${ACCURACY_GOAL}%)` : `band ${fmt(a.value)} (target ${fmt(targets[a.module])})`} over ${a.attempts} ${a.attempts === 1 ? 'attempt' : 'attempts'}.${sessionsPossible ? ` About ${sessionsPossible} sessions before the exam would be one every 3 days.` : ''}`,
  }));
  const untouchedSW = untouched.filter(a => a.kind === 'band');
  if (untouchedSW.length) plan.push({ tone: 'mid', title: 'Get Writing and Speaking scored', detail: `No band logged for ${untouchedSW.map(a => `${a.module} ${a.label.split(' · ')[0]}`).slice(0, 4).join(', ')}. Without a band, these skills cannot be judged. Ask a teacher or use a scoring tool, then log it in Practice Tracker.` });
  const untouchedQ = untouched.filter(a => a.kind === 'accuracy');
  if (untouchedQ.length) plan.push({ tone: 'low', title: 'Try question types you have not practised', detail: `${untouchedQ.length} not tried yet: ${untouchedQ.slice(0, 3).map(a => `${a.module} ${a.label}`).join(', ')}${untouchedQ.length > 3 ? '…' : ''}.` });
  if (activeDays < 10) plan.push({ tone: 'low', title: 'Study more days in a row', detail: `You studied ${activeDays} of the last 14 days. Short daily sessions beat long rare ones; your goal is ${dailyGoal} min a day.` });

  let phase: { name: string; tip: string } | null = null;
  if (daysLeft !== null) {
    phase = daysLeft < 0 ? { name: 'Exam date passed', tip: 'Update your exam date in Settings to plan the next attempt.' }
      : daysLeft <= 7 ? { name: 'Final week', tip: 'Light revision, timed Writing and Speaking, sleep well. No new topics.' }
      : daysLeft <= 21 ? { name: 'Mock and polish', tip: 'Full timed mocks, fix repeated mistakes, practise under exam conditions.' }
      : daysLeft <= 60 ? { name: 'Strengthen', tip: 'Work on your weakest areas every day and check progress with a mock every 1 to 2 weeks.' }
      : { name: 'Build', tip: 'Build the base: vocabulary, grammar, listening habit and a steady daily routine.' };
  }

  return { targets, overallTarget, dailyGoal, examDate, daysLeft, modules, currentOverall, sittings, projected, slopePerWeek, lastSitting, daysSinceMock, areas, weaknesses, strengths, untouched, balance, totalMin, strip, activeDays, goalDays, streak, avgPerActive, improveNotes, worstModule, plan, phase };
}

/* ─── Tiny SVG charts ───────────────────────────────────────────────────── */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span className="text-[10px] text-muted-foreground">1 mock so far</span>;
  const w = 80, h = 24, min = Math.min(...values) - 0.25, max = Math.max(...values) + 0.25;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min || 1)) * h}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function TrendChart({ sittings, target }: { sittings: { date: string; overall: number; full: boolean }[]; target: number }) {
  const W = 560, H = 190, L = 30, R = 26, T = 12, B = 26;
  const vals = sittings.map(s => s.overall);
  const lo = Math.floor(Math.min(...vals, target) - 0.5), hi = Math.ceil(Math.max(...vals, target) + 0.5);
  const x = (i: number) => L + (sittings.length === 1 ? (W - L - R) / 2 : (i / (sittings.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks: number[] = []; for (let v = Math.ceil(lo); v <= hi; v += 1) ticks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Overall mock band over time">
      {ticks.map(v => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#E3EAF0" /><text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#94A3B8">{v}</text></g>)}
      <line x1={L} x2={W - R} y1={y(target)} y2={y(target)} stroke="#B8860B" strokeDasharray="5 4" strokeWidth="1.5" />
      <text x={W - R} y={y(target) - 5} textAnchor="end" fontSize="10" fill="#B8860B" fontWeight="600">Target {fmt(target)}</text>
      <polyline fill="none" stroke="#176B73" strokeWidth="2.5" strokeLinejoin="round" points={sittings.map((s, i) => `${x(i)},${y(s.overall)}`).join(' ')} />
      {sittings.map((s, i) => (
        <g key={s.date}>
          <circle cx={x(i)} cy={y(s.overall)} r="4.5" fill={s.full ? '#176B73' : '#fff'} stroke="#176B73" strokeWidth="2" />
          {(sittings.length <= 8 || i === 0 || i === sittings.length - 1) && <text x={x(i)} y={y(s.overall) - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill="#17243D">{fmt(s.overall)}</text>}
          {(i === 0 || i === sittings.length - 1 || sittings.length <= 6) && <text x={x(i)} y={H - 8} textAnchor={i === 0 && sittings.length > 1 ? 'start' : i === sittings.length - 1 && sittings.length > 1 ? 'end' : 'middle'} fontSize="10" fill="#94A3B8">{shortDate(s.date)}</text>}
        </g>
      ))}
    </svg>
  );
}

const card = 'rounded-[20px] bg-white p-4 dark:bg-card sm:p-5';
const TONE = { high: { bg: '#FBEEEE', ink: '#D95757', label: 'Do first' }, mid: { bg: '#FDF8EB', ink: '#B8860B', label: 'Next' }, low: { bg: '#DDF4F7', ink: '#176B73', label: 'Also' } };

function AreaRow({ a }: { a: Area }) {
  const st = MODULE_STYLES[a.module];
  const pct = Math.max(4, Math.min(100, a.readiness / 1.3));
  const good = a.readiness >= 100, close = a.readiness >= 85;
  const color = good ? '#176B73' : close ? '#B8860B' : '#D95757';
  return (
    <div data-testid={`area-${a.module}-${a.id}`} className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5"><span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: st.bg, color: st.text }}>{a.module}</span><span className="truncate font-medium text-[#17243D] dark:text-foreground">{a.label}</span></span>
        <span className="shrink-0 font-semibold" style={{ color }}>{a.kind === 'accuracy' ? `${Math.round(a.value)}%` : fmt(a.value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F4]"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{a.attempts} {a.attempts === 1 ? 'attempt' : 'attempts'}{a.attempts < 3 ? ' · few attempts, treat as a first guess' : ''}</p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export function IELTSAnalytics() {
  const [, setLocation] = useLocation();
  const { data: settings, isLoading: l1 } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const { data: scores = [], isLoading: l2 } = useQuery({ queryKey: ['scores'], queryFn: api.getScores });
  const { data: sessions = [], isLoading: l3 } = useQuery({ queryKey: ['study-sessions'], queryFn: api.getStudySessions });
  const { data: logs = [], isLoading: l4 } = useQuery({ queryKey: ['practice-logs'], queryFn: api.getPracticeLogs });

  const a = useMemo(() => analyze({ settings, scores: scores as any[], sessions: sessions as any[], logs: logs as any[] }), [settings, scores, sessions, logs]);

  if (l1 || l2 || l3 || l4) return <div className="space-y-4"><Skeleton className="h-12 w-56" /><Skeleton className="h-48 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  const noData = !(scores as any[]).length && !(logs as any[]).length && !(sessions as any[]).length;
  const gapToTarget = a.currentOverall === null ? null : Math.round((a.overallTarget - a.currentOverall) * 10) / 10;
  const progressPct = a.currentOverall === null ? 0 : Math.max(0, Math.min(100, (a.currentOverall / a.overallTarget) * 100));
  const weeksLeft = a.daysLeft !== null && a.daysLeft > 0 ? Math.max(1, Math.round(a.daysLeft / 7)) : null;
  const needPerWeek = gapToTarget !== null && gapToTarget > 0 && weeksLeft ? Math.round((gapToTarget / weeksLeft) * 100) / 100 : null;
  const maxMin = Math.max(30, a.dailyGoal, ...a.strip.map(d => d.minutes));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="ielts-analytics">
      <StudyPageHeader icon={<TrophyBadge size={44} />} title="Analytics" subtitle="Find your strengths and weaknesses before exam day" />

      {/* Hero: where am I, how far, how long */}
      <section data-testid="an-hero" className="relative overflow-hidden rounded-[20px] p-5 text-white sm:p-6" style={{ background: 'linear-gradient(120deg, #17243D, #233B63 55%, #176B73)' }}>
        <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#A9DCE8]">Estimated overall band</p>
            <div className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span data-testid="an-current" className="font-heading text-5xl font-bold leading-none">{a.currentOverall === null ? '–' : fmt(a.currentOverall)}</span>
              <span className="pb-1 text-sm text-white/75">target <strong className="text-white">{fmt(a.overallTarget)}</strong>{gapToTarget !== null && (gapToTarget > 0 ? <> · {fmt(gapToTarget)} to go</> : <> · target reached</>)}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-[#42E6B8]" style={{ width: `${progressPct}%` }} /></div>
            <p data-testid="an-projection" className="mt-3 text-xs leading-relaxed text-white/80">
              {a.currentOverall === null ? 'Log a mock test to see your level.'
                : a.projected !== null ? `If you keep improving at your current pace (${a.slopePerWeek! >= 0 ? '+' : ''}${a.slopePerWeek} band a week), you are heading for about ${fmt(a.projected)} on exam day.${needPerWeek ? ` To reach ${fmt(a.overallTarget)} you need about +${needPerWeek} a week.` : ''}`
                : a.sittings.length < 3 ? 'Log at least 3 mock tests to get a projection for exam day.'
                : 'Add your exam date in Settings to see where you are heading.'}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 text-center sm:min-w-[9rem]" data-testid="an-countdown">
            <CalendarClock className="mx-auto h-5 w-5 text-[#A9DCE8]" />
            {a.daysLeft === null ? <p className="mt-1 text-sm font-semibold">Set exam date</p> : <p className="mt-1 font-heading text-3xl font-bold leading-none">{Math.max(0, a.daysLeft)}</p>}
            <p className="mt-1 text-[11px] text-white/70">{a.daysLeft === null ? 'in Settings' : a.daysLeft === 1 ? 'day left' : 'days left'}</p>
            {a.phase && <p className="mt-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">{a.phase.name}</p>}
          </div>
        </div>
        {a.phase && <p className="mt-4 border-t border-white/15 pt-3 text-xs text-white/80"><strong className="text-white">{a.phase.name}:</strong> {a.phase.tip}</p>}
      </section>

      {noData && (
        <div className={`${card} text-center`} data-testid="an-empty">
          <p className="font-heading text-lg font-bold text-[#17243D] dark:text-foreground">Nothing to analyse yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Log a mock test, a practice session or a study session, and this page will show your strengths, weaknesses and what to do next.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button onClick={() => setLocation('/study/scores')} className="min-h-[40px] rounded-full bg-[#233B63] px-4 text-xs font-semibold text-white">Log a mock test</button>
            <button onClick={() => setLocation('/study/practice')} className="min-h-[40px] rounded-full border px-4 text-xs font-semibold">Log practice</button>
          </div>
        </div>
      )}

      {/* Module scoreboard */}
      <section data-testid="an-modules">
        <h2 className="mb-3 font-heading text-lg font-bold text-[#17243D] dark:text-foreground">Four skills: now vs target</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {a.modules.map(m => {
            const st = MODULE_STYLES[m.module]; const Icon = st.icon;
            const delta = m.latest !== null && m.prev !== null ? Math.round((m.latest - m.prev) * 10) / 10 : null;
            const ok = m.gap !== null && m.gap <= 0;
            return (
              <div key={m.module} data-testid={`an-module-${m.module}`} className="min-w-0 rounded-[20px] p-4" style={{ backgroundColor: st.bg }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60"><Icon className="h-4 w-4" style={{ color: st.bar }} /></span>
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold" style={{ color: m.latest === null ? '#64748B' : ok ? '#176B73' : (m.gap as number) <= 0.5 ? '#B8860B' : '#D95757' }}>
                    {m.latest === null ? 'No mock' : ok ? 'On target' : `${fmt(m.gap as number)} to go`}
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium" style={{ color: st.text }}>{m.module}</p>
                <div className="flex items-end justify-between gap-2">
                  <p className="font-heading text-2xl font-bold" style={{ color: st.text }}>{m.latest === null ? '–' : fmt(m.latest)}<span className="ml-1 text-xs font-medium opacity-70">/ {fmt(m.target)}</span></p>
                  <Sparkline values={m.history.slice(-6)} color={st.bar} />
                </div>
                <p className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: st.text }}>
                  {delta === null ? 'Best: ' + (m.best === null ? '–' : fmt(m.best)) : delta > 0 ? <><TrendingUp className="h-3 w-3" /> +{fmt(delta)} since last mock</> : delta < 0 ? <><TrendingDown className="h-3 w-3" /> {fmt(delta)} since last mock</> : <><Minus className="h-3 w-3" /> same as last mock</>}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Strengths and weaknesses */}
      <section data-testid="an-sw" className="grid gap-4 lg:grid-cols-2">
        <div className={card} data-testid="an-weak">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D] dark:text-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FBEEEE] text-[#D95757]"><TriangleAlert className="h-4 w-4" /></span> Weaknesses to fix</h2>
          {a.weaknesses.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{a.areas.some(x => x.attempts) ? 'No weak area found. Everything you practised is at or above your goal.' : 'Log practice in Practice Tracker (question types, Listening parts, Writing tasks, Speaking parts) and your weakest areas will show here.'}</p>
          ) : <div className="mt-4 space-y-3.5">{a.weaknesses.map(x => <AreaRow key={x.module + x.id} a={x} />)}</div>}
        </div>
        <div className={card} data-testid="an-strong">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D] dark:text-foreground"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E1FAF3] text-[#0F8F72]"><ThumbsUp className="h-4 w-4" /></span> Strengths to keep</h2>
          {a.strengths.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{a.areas.some(x => x.attempts) ? 'Nothing is clearly above your goal yet. Keep practising; your best areas are shown in the full list below.' : 'Your strengths will appear here once you log practice.'}</p>
          ) : <div className="mt-4 space-y-3.5">{a.strengths.map(x => <AreaRow key={x.module + x.id} a={x} />)}</div>}
        </div>
      </section>
      <p className="-mt-3 px-1 text-[11px] text-muted-foreground">How this is judged: Reading and Listening practice counts as strong at {ACCURACY_GOAL}% correct or more. Writing and Speaking practice (your last 3 bands) counts as strong when it reaches your target band for that skill.</p>

      {/* Trend */}
      <section className={card} data-testid="an-trend">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-bold text-[#17243D] dark:text-foreground">Overall band across mock tests</h2>
          <span className="text-[11px] text-muted-foreground">Filled dot = all 4 skills in that test</span>
        </div>
        {a.sittings.length === 0 ? <p className="mt-3 rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">No mock tests logged yet.</p> : <div className="mt-3"><TrendChart sittings={a.sittings} target={a.overallTarget} /></div>}
        {a.daysSinceMock !== null && <p className="mt-2 text-[11px] text-muted-foreground">Last mock: {a.daysSinceMock === 0 ? 'today' : `${a.daysSinceMock} days ago`}.</p>}
      </section>

      {/* All areas */}
      {a.areas.some(x => x.attempts > 0) && (
        <section className={card} data-testid="an-areas">
          <h2 className="font-heading text-base font-bold text-[#17243D] dark:text-foreground">Every practice area, weakest first</h2>
          <div className="mt-4 grid gap-x-8 gap-y-3.5 md:grid-cols-2">
            {[...a.areas].filter(x => x.attempts > 0).sort((p, q) => p.readiness - q.readiness).map(x => <AreaRow key={x.module + x.id} a={x} />)}
          </div>
          {a.untouched.length > 0 && <p className="mt-4 text-[11px] text-muted-foreground" data-testid="an-untouched"><strong>Not practised yet ({a.untouched.length}):</strong> {a.untouched.map(x => `${x.module} ${x.label}`).join(' · ')}</p>}
        </section>
      )}

      {/* Time balance + consistency */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className={card} data-testid="an-balance">
          <h2 className="font-heading text-base font-bold text-[#17243D] dark:text-foreground">Study time: spent vs needed</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Last 30 days. "Needed" follows how far each skill is from its target.</p>
          {a.totalMin === 0 ? <p className="mt-3 rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">No study sessions in the last 30 days.</p> : (
            <div className="mt-4 space-y-3.5">
              {a.balance.map(b => {
                const st = MODULE_STYLES[b.module]; const under = b.needPct - b.spendPct >= 10;
                return (
                  <div key={b.module} data-testid={`balance-${b.module}`}>
                    <div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold" style={{ color: st.text }}>{b.module}</span><span className={under ? 'font-semibold text-[#D95757]' : 'text-muted-foreground'}>{b.spendPct}% spent · {b.needPct}% needed{under ? ' · needs more' : ''}</span></div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-[#EDF0F4]"><div className="h-full rounded-full" style={{ width: `${b.spendPct}%`, backgroundColor: st.bar }} /></div>
                    <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-[#EDF0F4]"><div className="h-full rounded-full bg-[#CBD5E1]" style={{ width: `${b.needPct}%` }} /></div>
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground">Coloured bar = time you spent. Grey bar = time you need.</p>
            </div>
          )}
        </div>
        <div className={card} data-testid="an-consistency">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D] dark:text-foreground"><Flame className="h-4 w-4 text-[#F2994A]" /> Consistency, last 14 days</h2>
          <div className="mt-4 flex h-24 items-end gap-1">
            {a.strip.map(d => (
              <div key={d.date} title={`${shortDate(d.date)}: ${d.minutes} min`} className="flex h-full min-w-0 flex-1 items-end"><div className="w-full rounded-t" style={{ height: `${Math.max(d.minutes ? 8 : 3, (d.minutes / maxMin) * 100)}%`, backgroundColor: d.minutes >= a.dailyGoal ? '#176B73' : d.minutes > 0 ? '#A9DCE8' : '#EDF0F4' }} /></div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{shortDate(a.strip[0].date)}</span><span>today</span></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#DDF4F7] p-2"><p data-testid="an-active-days" className="font-heading text-lg font-bold text-[#176B73]">{a.activeDays}/14</p><p className="text-[10px] text-[#176B73]">days studied</p></div>
            <div className="rounded-xl bg-[#F2F0FF] p-2"><p className="font-heading text-lg font-bold text-[#7C6CFF]">{a.goalDays}</p><p className="text-[10px] text-[#7C6CFF]">met {a.dailyGoal} min goal</p></div>
            <div className="rounded-xl bg-[#FDF8EB] p-2"><p className="font-heading text-lg font-bold text-[#B8860B]">{a.avgPerActive}</p><p className="text-[10px] text-[#B8860B]">min per study day</p></div>
          </div>
        </div>
      </section>

      {/* Action plan */}
      <section className={card} data-testid="an-plan">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D] dark:text-foreground"><ListChecks className="h-4 w-4 text-[#176B73]" /> What to do next{a.daysLeft !== null && a.daysLeft > 0 ? ` (${a.daysLeft} days to go)` : ''}</h2>
        {a.plan.length === 0 ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#E1FAF3] p-4 text-sm text-[#0F8F72]"><Check className="h-4 w-4" /> Nothing urgent. Keep your routine and take a mock now and then.</p> : (
          <ol className="mt-4 space-y-3">
            {a.plan.map((p, i) => (
              <li key={i} data-testid={`plan-${i}`} className="flex gap-3 rounded-2xl border p-3.5" style={{ borderColor: 'var(--apps-border, #E3EAF0)' }}>
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: TONE[p.tone].bg, color: TONE[p.tone].ink }}>{i + 1}</span>
                <div className="min-w-0"><p className="flex flex-wrap items-center gap-2 text-sm font-bold text-[#17243D] dark:text-foreground">{p.title}<span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: TONE[p.tone].bg, color: TONE[p.tone].ink }}>{TONE[p.tone].label}</span></p><p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{p.detail}</p></div>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => setLocation('/study/scores')} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#233B63] px-4 text-xs font-semibold text-white">Log mock test <ArrowRight className="h-3.5 w-3.5" /></button>
          <button onClick={() => setLocation('/study/practice')} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 text-xs font-semibold">Practice Tracker</button>
          <button onClick={() => setLocation('/study/study')} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 text-xs font-semibold"><Clock className="h-3.5 w-3.5" /> Study Log</button>
        </div>
      </section>

      {a.improveNotes.length > 0 && (
        <section className={card} data-testid="an-notes">
          <h2 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D] dark:text-foreground"><Lightbulb className="h-4 w-4 text-[#B8860B]" /> What you told yourself to improve</h2>
          <ul className="mt-3 space-y-2">
            {a.improveNotes.map((s: any) => { const st = MODULE_STYLES[s.module] || MODULE_STYLES.Mixed; return (
              <li key={s.id} className="flex gap-2.5 rounded-xl bg-[#F8FAFC] p-3 text-xs dark:bg-muted"><span className="h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: st.bg, color: st.text }}>{s.module}</span><span className="min-w-0 break-words text-[#475569] dark:text-muted-foreground">{s.improve} <span className="whitespace-nowrap text-[10px] text-muted-foreground">· {shortDate(s.date)}</span></span></li>
            ); })}
          </ul>
        </section>
      )}
    </div>
  );
}
