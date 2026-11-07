import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Check, X, Flame, Trophy, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Sparkles, MessageSquareText,
  CalendarDays, Leaf, BookOpen, HeartHandshake, Footprints, Dumbbell, Flower2, Droplets, Sun, PenLine, Star,
  Moon, Smile, Lightbulb, Send, Clock, BarChart3, TrendingUp, Heart, ArrowRight,
} from 'lucide-react';

/* ─── Types & constants ─────────────────────────────────────────────────── */
type Status = 'done' | 'missed';
interface HabitLog { id: number; date: string; habitKey: string; status: Status; note: string | null }
interface Habit { id: number; name: string; emoji: string | null; goal: string | null; minutes: number | null }
type SetLogVars = { date: string; habitKey: string; status: Status | 'none'; note?: string | null };

/** One line in "Today's Habits": the built-in Prayers (5 a day) or one habit of your own (1 a day). */
type Item = { key: string; name: string; goal: string; target: number; minutes: number; icon: string };

const PRAYERS = [
  { key: 'fajr',    label: 'Fajr',    hint: 'Dawn' },
  { key: 'dhuhr',   label: 'Dhuhr',   hint: 'Midday' },
  { key: 'asr',     label: 'Asr',     hint: 'Afternoon' },
  { key: 'maghrib', label: 'Maghrib', hint: 'Sunset' },
  { key: 'isha',    label: 'Isha',    hint: 'Night' },
];
const PRAYER_KEYS = PRAYERS.map(p => p.key);
const NOTE_KEY = '_note'; // the free-text note for a whole day (not a habit)
const PRAYER_ITEM: Item = { key: 'prayers', name: 'Prayers', goal: 'Fajr, Dhuhr, Asr, Maghrib, Isha', target: 5, minutes: 0, icon: 'mosque' };
const REASON_CHIPS = ['Overslept', 'At work / class', 'Travelling', 'Sick', 'Forgot', 'No suitable place'];
const LOGS_KEY = ['habit-logs'];
const HABITS_KEY = ['good-habits'];

const ICONS: Record<string, { Icon: React.ComponentType<{ className?: string }> | null; label: string; ink: string; bg: string }> = {
  mosque: { Icon: null,          label: 'Prayer',     ink: '#176B73', bg: '#DDF4F7' },
  book:   { Icon: BookOpen,      label: 'Reading',    ink: '#176B73', bg: '#DDF4F7' },
  heart:  { Icon: HeartHandshake, label: 'Kindness',  ink: '#D95757', bg: '#FBEEEE' },
  walk:   { Icon: Footprints,    label: 'Walk',       ink: '#233B63', bg: '#E8EEF6' },
  gym:    { Icon: Dumbbell,      label: 'Exercise',   ink: '#233B63', bg: '#E8EEF6' },
  lotus:  { Icon: Flower2,       label: 'Mindful',    ink: '#7C6CFF', bg: '#F2F0FF' },
  water:  { Icon: Droplets,      label: 'Water',      ink: '#2B8FA8', bg: '#E3F4F8' },
  sun:    { Icon: Sun,           label: 'Morning',    ink: '#B8860B', bg: '#FDF8EB' },
  pen:    { Icon: PenLine,       label: 'Writing',    ink: '#176B73', bg: '#DDF4F7' },
  star:   { Icon: Star,          label: 'Star',       ink: '#B8860B', bg: '#FDF8EB' },
  moon:   { Icon: Moon,          label: 'Night',      ink: '#7C6CFF', bg: '#F2F0FF' },
  smile:  { Icon: Smile,         label: 'Gratitude',  ink: '#B8860B', bg: '#FDF8EB' },
  leaf:   { Icon: Leaf,          label: 'Growth',     ink: '#176B73', bg: '#DDF4F7' },
};
const PICKABLE_ICONS = Object.keys(ICONS).filter(k => k !== 'mosque');

const HABIT_SUGGESTIONS = [
  { name: 'Reading Books',   icon: 'book',  goal: 'At least 20 pages', minutes: 0 },
  { name: 'Helping Others',  icon: 'heart', goal: 'A kind deed today', minutes: 0 },
  { name: 'Walk / Exercise', icon: 'walk',  goal: 'At least 30 min',   minutes: 30 },
  { name: 'Meditation',      icon: 'lotus', goal: 'At least 10 min',   minutes: 10 },
  { name: 'Gratitude',       icon: 'smile', goal: 'Write 3 good things', minutes: 0 },
];

/* ─── Date helpers ──────────────────────────────────────────────────────── */
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function longDate(s: string) {
  return parseDate(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtMinutes(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h === 0) return `${mm}m`;
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
}

/* ─── Maths (pure) ──────────────────────────────────────────────────────── */
type DayStat = { done: number; missed: number };

function keysOf(item: Item): string[] {
  return item.key === 'prayers' ? PRAYER_KEYS : [item.key];
}

function computeDayStats(logs: HabitLog[], keys: string[]): Map<string, DayStat> {
  const inScope = new Set(keys);
  const map = new Map<string, DayStat>();
  logs.forEach(l => {
    if (!inScope.has(l.habitKey)) return;
    const s = map.get(l.date) ?? { done: 0, missed: 0 };
    if (l.status === 'done') s.done++; else s.missed++;
    map.set(l.date, s);
  });
  return map;
}

/** Run of consecutive days ending today (or yesterday, so today is not "broken" until it ends). */
function currentRun(has: (date: string) => boolean, today: Date): number {
  let cursor = has(localDateStr(today)) ? today : addDays(today, -1);
  let n = 0;
  while (has(localDateStr(cursor))) { n++; cursor = addDays(cursor, -1); }
  return n;
}
function bestRun(dates: string[]): number {
  const sorted = [...dates].sort();
  let best = 0, run = 0;
  let prev: Date | null = null;
  sorted.forEach(ds => {
    const d = parseDate(ds);
    if (prev && Math.round((d.getTime() - prev.getTime()) / 86_400_000) === 1) run++; else run = 1;
    best = Math.max(best, run);
    prev = d;
  });
  return best;
}
/** A day is "active" when at least one habit is done; "perfect" when every one is. */
function computeStreaks(stats: Map<string, DayStat>, total: number, today: Date) {
  const active = (d: string) => (stats.get(d)?.done ?? 0) >= 1;
  const full = (d: string) => total > 0 && (stats.get(d)?.done ?? 0) >= total;
  const activeDates = Array.from(stats.keys()).filter(active);
  const fullDates = Array.from(stats.keys()).filter(full);
  return {
    current: currentRun(active, today),
    best: bestRun(activeDates),
    activeDays: activeDates.length,
    fullDays: fullDates.length,
    currentFull: currentRun(full, today),
  };
}
/** Days in a row where one habit reached its daily target (all 5 for Prayers). */
function itemStreak(logs: HabitLog[], item: Item, today: Date) {
  const stats = computeDayStats(logs, keysOf(item));
  const ok = (d: string) => (stats.get(d)?.done ?? 0) >= item.target;
  return { current: currentRun(ok, today), best: bestRun(Array.from(stats.keys()).filter(ok)) };
}

/** Success rate, top habit, activity and time totals. Success looks at the last 30 days
 *  (or since your first log, if that is more recent). */
function computeInsights(logs: HabitLog[], items: Item[], today: Date, windowDays = 30) {
  const keySet = new Set(items.flatMap(keysOf));
  const real = logs.filter(l => keySet.has(l.habitKey));
  const doneLogs = real.filter(l => l.status === 'done');
  const minutesByKey = new Map<string, number>();
  items.forEach(i => { if (i.key !== 'prayers') minutesByKey.set(i.key, i.minutes); });
  const totalMinutes = doneLogs.reduce((sum, l) => sum + (minutesByKey.get(l.habitKey) ?? 0), 0);

  let success: number | null = null;
  let top: { name: string; pct: number } | null = null;
  if (real.length > 0) {
    const first = real.map(l => l.date).sort()[0];
    const windowStart = localDateStr(addDays(today, -(windowDays - 1)));
    const startStr = first > windowStart ? first : windowStart;
    const days = Math.max(1, Math.round((parseDate(localDateStr(today)).getTime() - parseDate(startStr).getTime()) / 86_400_000) + 1);
    let doneSum = 0, targetSum = 0;
    items.forEach(it => {
      const keys = new Set(keysOf(it));
      const done = doneLogs.filter(l => keys.has(l.habitKey) && l.date >= startStr).length;
      const target = it.target * days;
      doneSum += Math.min(done, target);
      targetSum += target;
      const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
      if (done > 0 && (!top || pct > top.pct)) top = { name: it.name, pct };
    });
    success = targetSum > 0 ? Math.round((doneSum / targetSum) * 100) : null;
  }
  return { success, top: top as { name: string; pct: number } | null, activities: doneLogs.length, minutes: totalMinutes };
}

function cellColor(done: number, missed: number, target: number) {
  if (done === 0) return missed > 0 ? '#F3CFCF' : '#E8EEF2';
  const r = done / target;
  if (r >= 1) return '#176B73';
  if (r > 0.5) return '#19C7B7';
  return '#A9DCE8';
}

/* ─── Small pieces ──────────────────────────────────────────────────────── */
function MosqueIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 90" fill="currentColor" className={className} aria-hidden="true">
      <path d="M60 12c-1 4-4 7-7 10-6 6-11 11-11 19v6h36v-6c0-8-5-13-11-19-3-3-6-6-7-10z" />
      <rect x="38" y="47" width="44" height="32" />
      <rect x="14" y="34" width="9" height="45" />
      <path d="M18.5 16l5.5 18H13z" />
      <rect x="97" y="34" width="9" height="45" />
      <path d="M101.5 16l5.5 18H96z" />
      <rect x="2" y="79" width="116" height="7" rx="2" />
    </svg>
  );
}

function iconTone(key: string) {
  return ICONS[key] ?? { Icon: null, label: '', ink: '#176B73', bg: '#DDF4F7' };
}
function HabitIcon({ iconKey, className = 'h-5 w-5' }: { iconKey: string; className?: string }) {
  if (iconKey === 'mosque') return <MosqueIcon className={className} />;
  const meta = ICONS[iconKey];
  if (meta && meta.Icon) { const I = meta.Icon; return <I className={className} />; }
  return <span className="text-lg leading-none">{iconKey || '✨'}</span>; // older habits stored a plain emoji
}
function IconTile({ iconKey, size = 'h-11 w-11' }: { iconKey: string; size?: string }) {
  const t = iconTone(iconKey);
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-2xl`} style={{ backgroundColor: t.bg, color: t.ink }}>
      <HabitIcon iconKey={iconKey} className="h-5 w-5" />
    </span>
  );
}

function NoteField({ value, placeholder, label, onSave }: { value: string; placeholder: string; label: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  return (
    <Input
      value={text}
      maxLength={300}
      aria-label={label}
      placeholder={placeholder}
      className="h-9 bg-white text-sm"
      onChange={e => setText(e.target.value)}
      onBlur={() => { if (text.trim() !== value.trim()) onSave(text.trim()); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
    />
  );
}

function ReasonChips({ current, onPick }: { current: string; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {REASON_CHIPS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            current === c ? 'border-[#D95757] bg-[#FBEEEE] text-[#D95757]' : 'border-[#E3EAF0] bg-white text-muted-foreground hover:border-[#D95757]/40'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/** One prayer inside the Prayers Log card: tick = prayed, cross = missed (then say why). */
function PrayerRow({ label, hint, log, onSet }: {
  label: string; hint: string; log: HabitLog | undefined;
  onSet: (status: Status | 'none', note: string | null) => void;
}) {
  const status = log?.status ?? null;
  const note = log?.note ?? '';
  const tone = status === 'done' ? 'border-[#BFE9E4] bg-[#F1FBF9]' : status === 'missed' ? 'border-[#F3CFCF] bg-[#FDF5F5]' : 'border-[#E3EAF0] bg-white';
  return (
    <li className={`rounded-2xl border px-3 py-2.5 transition-colors ${tone}`} data-testid={`prayer-row-${label}`}>
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#17243D]">{label}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <button
          type="button"
          aria-label={`${label}: prayed`}
          aria-pressed={status === 'done'}
          onClick={() => onSet(status === 'done' ? 'none' : 'done', null)}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
            status === 'done' ? 'border-[#176B73] bg-[#176B73] text-white' : 'border-[#D9E3E9] bg-white text-[#176B73] hover:bg-[#DDF4F7]'
          }`}
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={`${label}: missed`}
          aria-pressed={status === 'missed'}
          onClick={() => onSet(status === 'missed' ? 'none' : 'missed', status === 'missed' ? null : note || null)}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
            status === 'missed' ? 'border-[#D95757] bg-[#D95757] text-white' : 'border-[#D9E3E9] bg-white text-[#D95757] hover:bg-[#FBEEEE]'
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {status === 'missed' && (
        <div className="mt-2.5 space-y-2">
          <NoteField value={note} label={`Reason for missing ${label}`} placeholder="Why couldn't you pray? e.g. overslept, at work…" onSave={v => onSet('missed', v || null)} />
          <ReasonChips current={note} onPick={v => onSet('missed', v)} />
        </div>
      )}
    </li>
  );
}

/* ─── Activity heatmap: one row per habit, one column per day ───────────── */
function HabitMatrix({ items, logMap, days, selectedDate, onSelect }: {
  items: Item[]; logMap: Map<string, HabitLog>; days: number; selectedDate: string; onSelect: (d: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth; // keep "today" in view
  }, [days]);

  const today = new Date();
  const todayStr = localDateStr(today);
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i - (days - 1)));
  const LABEL = 128;
  const MIN = 11;

  // month labels: first column + every 1st of a month, skipping any that would collide
  const labelIdx = dates.map((d, i) => (i === 0 || d.getDate() === 1 ? i : -1)).filter(i => i >= 0);
  const shownLabels = labelIdx.filter((i, n) => !(i === 0 && labelIdx.length > 1 && labelIdx[1] - i < 4));

  const counts = (item: Item, ds: string) => {
    let done = 0, missed = 0;
    keysOf(item).forEach(k => {
      const l = logMap.get(`${ds}|${k}`);
      if (l) { if (l.status === 'done') done++; else missed++; }
    });
    return { done, missed };
  };

  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `${LABEL}px repeat(${days}, minmax(${MIN}px, 1fr))`, minWidth: LABEL + days * (MIN + 3) }}>
          {shownLabels.map(i => (
            <div key={`m${i}`} className="whitespace-nowrap text-[10px] font-medium leading-4 text-muted-foreground" style={{ gridColumn: `${i + 2} / span 4`, gridRow: 1 }}>
              {dates[i].toLocaleDateString(undefined, { month: 'short', year: i === 0 || dates[i].getMonth() === 0 ? 'numeric' : undefined })}
            </div>
          ))}
          {items.map((it, r) => (
            <React.Fragment key={it.key}>
              <div className="flex min-w-0 items-center gap-2 pr-2" style={{ gridColumn: 1, gridRow: r + 2 }}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: iconTone(it.icon).bg, color: iconTone(it.icon).ink }}>
                  <HabitIcon iconKey={it.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-xs font-medium text-[#17243D]">{it.name}</span>
              </div>
              {dates.map((d, ci) => {
                const ds = localDateStr(d);
                const c = counts(it, ds);
                const text = `${it.name} · ${ds}: ${c.done}/${it.target} done${c.missed ? `, ${c.missed} missed` : ''}`;
                return (
                  <button
                    key={ds}
                    type="button"
                    aria-label={text}
                    onClick={() => onSelect(ds)}
                    className={`aspect-square w-full rounded-[4px] transition-opacity hover:opacity-80 ${ds === selectedDate ? 'ring-2 ring-[#233B63] ring-offset-1' : ''}`}
                    style={{ gridColumn: ci + 2, gridRow: r + 2, backgroundColor: cellColor(c.done, c.missed, it.target), outline: ds === todayStr ? '1px dashed #176B73' : undefined }}
                    onMouseEnter={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTip({ text, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        {[['#E8EEF2', 'None'], ['#A9DCE8', 'Some'], ['#19C7B7', 'Most'], ['#176B73', 'All done'], ['#F3CFCF', 'Missed']].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />{l}</span>
        ))}
      </div>
      {tip && (
        <div className="pointer-events-none fixed z-50 rounded-lg bg-[#17243D] px-2 py-1.5 text-xs text-white shadow-lg" style={{ top: tip.y - 36, left: tip.x - 20 }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}

/* ─── Main tab ──────────────────────────────────────────────────────────── */
type HabitForm = { name: string; icon: string; goal: string; minutes: string };
const EMPTY_FORM: HabitForm = { name: '', icon: 'book', goal: '', minutes: '' };

export function GoodHabitsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const todayStr = localDateStr(new Date());

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [range, setRange] = useState(30);
  const [quickNote, setQuickNote] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [habitDialog, setHabitDialog] = useState<null | 'new' | Habit>(null);
  const [form, setForm] = useState<HabitForm>(EMPTY_FORM);
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: HABITS_KEY,
    queryFn: () => api.getGoodHabits() as Promise<Habit[]>,
  });
  const { data: logs = [], isLoading } = useQuery<HabitLog[]>({
    queryKey: LOGS_KEY,
    queryFn: () => api.getHabitLogs() as Promise<HabitLog[]>,
  });

  async function check<T>(p: Promise<T>): Promise<T> {
    const r: any = await p;
    if (r && typeof r === 'object' && !Array.isArray(r) && 'error' in r) throw new Error(String(r.error));
    return r;
  }
  function fail(err: unknown) {
    toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
  }

  /* log a day + habit (updates the screen instantly, rolls back if the save fails) */
  const setLog = useMutation({
    mutationFn: (v: SetLogVars) => check(api.setHabitLog(v as unknown as Record<string, unknown>)),
    onMutate: async (v: SetLogVars) => {
      await qc.cancelQueries({ queryKey: LOGS_KEY });
      const prev = qc.getQueryData<HabitLog[]>(LOGS_KEY);
      qc.setQueryData<HabitLog[]>(LOGS_KEY, (old = []) => {
        const rest = old.filter(l => !(l.date === v.date && l.habitKey === v.habitKey));
        if (v.status === 'none') return rest;
        return [...rest, { id: -1, date: v.date, habitKey: v.habitKey, status: v.status, note: v.note?.trim() ? v.note.trim() : null }];
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(LOGS_KEY, ctx.prev);
      fail(err);
    },
    onSettled: () => { qc.invalidateQueries({ queryKey: LOGS_KEY }); },
  });

  const addHabit = useMutation({
    mutationFn: (b: Record<string, unknown>) => check(api.addGoodHabit(b)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: HABITS_KEY }); },
    onError: fail,
  });
  const updateHabit = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => check(api.updateGoodHabit(id, body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: HABITS_KEY }),
    onError: fail,
  });
  const removeHabit = useMutation({
    mutationFn: (id: number) => api.deleteGoodHabit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: HABITS_KEY }); qc.invalidateQueries({ queryKey: LOGS_KEY }); },
    onError: fail,
  });

  /* ── derived data ── */
  const items: Item[] = useMemo(() => [
    PRAYER_ITEM,
    ...habits.map(h => ({ key: `h${h.id}`, name: h.name, goal: h.goal || '', target: 1, minutes: h.minutes || 0, icon: h.emoji || 'star' })),
  ], [habits]);
  const allKeys = useMemo(() => items.flatMap(keysOf), [items]);

  const logMap = useMemo(() => {
    const m = new Map<string, HabitLog>();
    logs.forEach(l => m.set(`${l.date}|${l.habitKey}`, l));
    return m;
  }, [logs]);
  const logFor = (date: string, key: string) => logMap.get(`${date}|${key}`);
  const set = (key: string, status: Status | 'none', note: string | null) => setLog.mutate({ date: selectedDate, habitKey: key, status, note });

  const countsFor = (item: Item, date: string) => {
    let done = 0, missed = 0;
    keysOf(item).forEach(k => {
      const l = logFor(date, k);
      if (l) { if (l.status === 'done') done++; else missed++; }
    });
    return { done, missed };
  };

  const prayed = PRAYER_KEYS.filter(k => logFor(selectedDate, k)?.status === 'done').length;
  const dayNote = logFor(selectedDate, NOTE_KEY)?.note ?? '';
  useEffect(() => { setQuickNote(''); setExpanded(null); }, [selectedDate]);

  const dayStats = useMemo(() => computeDayStats(logs, allKeys), [logs, allKeys]);
  const streaks = useMemo(() => computeStreaks(dayStats, allKeys.length, new Date()), [dayStats, allKeys.length]);
  const insights = useMemo(() => computeInsights(logs, items, new Date()), [logs, items]);

  /* ── actions ── */
  function goDay(n: number) {
    const next = localDateStr(addDays(parseDate(selectedDate), n));
    if (next <= todayStr) setSelectedDate(next);
  }
  function togglePrayers() {
    if (prayed === 5) {
      PRAYER_KEYS.forEach(k => { if (logFor(selectedDate, k)?.status === 'done') set(k, 'none', null); });
      return;
    }
    const remaining = PRAYER_KEYS.filter(k => !logFor(selectedDate, k));
    if (remaining.length === 0) {
      toast({ title: 'Missed prayers keep their reason', description: 'Tap a prayer in the Prayers Log to change it.' });
      return;
    }
    remaining.forEach(k => set(k, 'done', null));
  }
  function toggleHabit(it: Item) {
    const l = logFor(selectedDate, it.key);
    if (l?.status === 'done') set(it.key, 'none', null);
    else set(it.key, 'done', l?.note ?? null);
  }
  function saveQuickNote() {
    const text = quickNote.trim();
    if (!text) return;
    set(NOTE_KEY, 'done', text);
    setQuickNote('');
  }
  function openNewHabit(prefill?: Partial<HabitForm>) {
    setForm({ ...EMPTY_FORM, ...prefill });
    setHabitDialog('new');
  }
  function openEditHabit(h: Habit) {
    setForm({ name: h.name, icon: h.emoji && (ICONS[h.emoji] || h.emoji.length <= 3) ? h.emoji : 'star', goal: h.goal || '', minutes: h.minutes ? String(h.minutes) : '' });
    setHabitDialog(h);
  }
  function duplicateName(name: string, exceptId?: number) {
    return habits.some(h => h.id !== exceptId && h.name.trim().toLowerCase() === name.trim().toLowerCase());
  }
  function saveHabit() {
    const name = form.name.trim();
    if (!name) return;
    const editing = habitDialog !== null && habitDialog !== 'new' ? habitDialog : null;
    if (duplicateName(name, editing?.id)) { toast({ title: 'You already track that habit', variant: 'destructive' }); return; }
    const body = { name, emoji: form.icon, goal: form.goal.trim() || null, minutes: Math.max(0, Math.min(1440, Math.round(Number(form.minutes) || 0))) };
    if (editing) updateHabit.mutate({ id: editing.id, body }, { onSuccess: () => setHabitDialog(null) });
    else addHabit.mutate(body, { onSuccess: () => { setHabitDialog(null); toast({ title: '✅ Habit added' }); } });
  }
  function quickAdd(s: { name: string; icon: string; goal: string; minutes: number }) {
    if (duplicateName(s.name)) return;
    addHabit.mutate({ name: s.name, emoji: s.icon, goal: s.goal, minutes: s.minutes });
  }
  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker(); else el.click();
  }

  const unusedSuggestions = HABIT_SUGGESTIONS.filter(s => !duplicateName(s.name));
  const itemStreaks = useMemo(() => items.map(it => ({ it, ...itemStreak(logs, it, new Date()) })), [items, logs]);

  const history = useMemo(() => {
    const byDate = new Map<string, { date: string; prayed: number; loggedPrayers: number; missed: { name: string; note: string | null }[]; note: string }>();
    const nameOf = (key: string) => {
      const p = PRAYERS.find(x => x.key === key);
      if (p) return p.label;
      return habits.find(h => `h${h.id}` === key)?.name ?? null;
    };
    logs.forEach(l => {
      const e = byDate.get(l.date) ?? { date: l.date, prayed: 0, loggedPrayers: 0, missed: [], note: '' };
      if (l.habitKey === NOTE_KEY) e.note = l.note ?? '';
      else {
        const nm = nameOf(l.habitKey);
        if (nm) {
          if (PRAYER_KEYS.includes(l.habitKey)) { e.loggedPrayers++; if (l.status === 'done') e.prayed++; }
          if (l.status === 'missed') e.missed.push({ name: nm, note: l.note });
        }
      }
      byDate.set(l.date, e);
    });
    return Array.from(byDate.values())
      .filter(e => e.loggedPrayers > 0 || e.missed.length > 0 || e.note)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 60);
  }, [logs, habits]);

  const streakNow = streaks.current;
  const statCards = [
    { label: 'Day Streak', value: String(streakNow), after: <Flame className="h-4 w-4 fill-[#F2C75C] text-[#F2C75C]" />, icon: CalendarDays, bg: '#DDF4F7', ink: '#176B73', hint: 'Days in a row with at least one habit done' },
    { label: 'Overall Success', value: insights.success === null ? '—' : `${insights.success}%`, after: null, icon: Check, bg: '#DDF4F7', ink: '#176B73', hint: 'Share of your daily targets completed over the last 30 days' },
    { label: 'Total Activities', value: String(insights.activities), after: null, icon: Star, bg: '#FDF8EB', ink: '#B8860B', hint: 'Every prayer and habit you have ticked' },
    { label: 'Total Time', value: fmtMinutes(insights.minutes), after: null, icon: Clock, bg: '#F2F0FF', ink: '#7C6CFF', hint: 'Minutes of habits that have a time set (add it when you edit a habit)' },
  ];

  const successText = insights.success === null ? 'Log a habit to see this.' : insights.success >= 80 ? 'Excellent consistency!' : insights.success >= 50 ? 'Keep it up!' : 'Every day is a fresh start.';
  const streakText = streakNow === 0 ? 'Tick one habit today to start a streak.' : streakNow >= streaks.best && streakNow > 1 ? 'A new personal best!' : `Your best is ${streaks.best} day${streaks.best === 1 ? '' : 's'}.`;

  return (
    <div className="space-y-5" data-testid="good-habits">
      {/* header + verse */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-center">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#DDF4F7] text-[#176B73] sm:h-20 sm:w-20">
            <Leaf className="h-8 w-8 fill-[#19C7B7]/30 sm:h-10 sm:w-10" />
          </span>
          <div>
            <h2 className="font-heading text-3xl font-bold leading-tight text-[#17243D]">Good Habits</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#475569]">Build better habits, live a more purposeful life. <Leaf className="h-4 w-4 shrink-0 text-[#19C7B7]" /></p>
          </div>
        </div>
        <figure className="relative overflow-hidden rounded-2xl p-4 pr-24 sm:pr-28" style={{ background: 'linear-gradient(120deg, #DDF4F7, #EAF8F6)' }}>
          <MosqueIcon className="pointer-events-none absolute -bottom-1 right-2 h-20 w-28 text-[#A9DCE8] opacity-70" />
          <blockquote className="relative text-sm italic leading-6 text-[#17243D]">“Indeed, Allah loves those who are constantly repentant and loves those who purify themselves.”</blockquote>
          <figcaption className="relative mt-1 text-xs text-[#475569]">— Quran 2:222</figcaption>
        </figure>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(s => (
          <div key={s.label} title={s.hint} data-testid={`habit-stat-${s.label}`} className="flex items-center gap-2.5 rounded-2xl border border-[#E3EAF0] bg-white p-3 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:gap-4 sm:p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14" style={{ backgroundColor: s.bg, color: s.ink }}><s.icon className="h-4 w-4 sm:h-6 sm:w-6" /></span>
            <div className="min-w-0">
              <p className="whitespace-nowrap font-heading text-xl font-bold leading-none text-[#17243D] sm:text-[1.7rem]">{s.value}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">{s.label} {s.after}</p>
            </div>
          </div>
        ))}
      </div>

      {/* heatmap + streak */}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section className="min-w-0 rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5" data-testid="habit-heatmap">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D]"><BarChart3 className="h-5 w-5 text-[#176B73]" /> Activity Heatmap</h3>
            <select
              value={range}
              onChange={e => setRange(Number(e.target.value))}
              aria-label="Heatmap range"
              className="rounded-full border border-[#E3EAF0] bg-white px-3 py-1.5 text-xs font-semibold text-[#17243D] focus:outline-none focus:ring-2 focus:ring-[#176B73]/30"
            >
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 2 Months</option>
              <option value={90}>Last 3 Months</option>
            </select>
          </div>
          {isLoading ? <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p> : (
            <HabitMatrix items={items} logMap={logMap} days={range} selectedDate={selectedDate} onSelect={setSelectedDate} />
          )}
        </section>

        <section className="relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 text-white shadow-[0_12px_28px_rgba(23,36,61,.14)]" style={{ background: 'linear-gradient(135deg, #17243D, #233B63 55%, #176B73)' }} data-testid="habit-streak-card">
          <Trophy className="pointer-events-none absolute right-3 top-4 h-20 w-20 text-[#F2C75C]/90" />
          <Sparkles className="pointer-events-none absolute right-[5.5rem] top-4 h-4 w-4 text-[#F2C75C]" />
          <Sparkles className="pointer-events-none absolute right-4 top-24 h-3 w-3 text-[#A9DCE8]" />
          <div className="relative pr-16">
            <p data-testid="text-habit-streak" className="font-heading text-3xl font-bold leading-tight">{streakNow > 0 ? `${streakNow} Day${streakNow === 1 ? '' : 's'} Streak!` : 'Start your streak!'}</p>
            <p className="mt-2 text-sm text-white/80">{streakNow > 0 ? 'Keep going! Consistency builds a better you.' : 'Tick one habit today and the count begins.'}</p>
          </div>
          <button type="button" onClick={() => setShowDetails(true)} className="relative mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#19C7B7] px-4 py-2 text-sm font-semibold text-[#17243D] transition-colors hover:bg-[#42E6B8]">
            View Details <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>

      {/* today's habits + prayers log + insights */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,.8fr)]">
        {/* Today's Habits */}
        <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5" data-testid="habits-card">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D]">
              <Check className="h-5 w-5 rounded-md bg-[#176B73] p-0.5 text-white" /> {selectedDate === todayStr ? "Today's Habits" : 'Habits'}
            </h3>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => goDay(-1)} aria-label="Previous day" className="rounded-full p-1.5 text-muted-foreground hover:bg-[#F1F5F9]"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={openDatePicker} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-[#17243D] hover:bg-[#F1F5F9]">
                {longDate(selectedDate)} <CalendarDays className="h-3.5 w-3.5 text-[#176B73]" />
              </button>
              <input ref={dateInputRef} type="date" value={selectedDate} max={todayStr} aria-label="Pick a day" tabIndex={-1} className="pointer-events-none absolute h-0 w-0 opacity-0"
                onChange={e => { if (e.target.value && e.target.value <= todayStr) setSelectedDate(e.target.value); }} />
              <button type="button" onClick={() => goDay(1)} disabled={selectedDate >= todayStr} aria-label="Next day" className="rounded-full p-1.5 text-muted-foreground hover:bg-[#F1F5F9] disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          {selectedDate !== todayStr && (
            <button type="button" onClick={() => setSelectedDate(todayStr)} className="mb-1 text-xs font-semibold text-[#176B73] hover:underline">← Back to today</button>
          )}

          <ul className="divide-y divide-[#EEF2F6]">
            {items.map(it => {
              const isPrayers = it.key === 'prayers';
              const c = countsFor(it, selectedDate);
              const complete = c.done >= it.target;
              const log = isPrayers ? undefined : logFor(selectedDate, it.key);
              const skipped = !isPrayers && log?.status === 'missed';
              const habit = isPrayers ? null : habits.find(h => `h${h.id}` === it.key) ?? null;
              const open = expanded === it.key;
              return (
                <li key={it.key} data-testid={`habit-row-${it.name}`}>
                  <div className="flex items-center gap-3 py-3">
                    <IconTile iconKey={it.icon} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${skipped ? 'text-muted-foreground' : 'text-[#17243D]'}`}>{isPrayers ? 'Prayers (5 times)' : it.name}{skipped && <span className="ml-2 rounded-md bg-[#FBEEEE] px-1.5 py-0.5 text-[10px] font-bold text-[#D95757]">Skipped</span>}</p>
                      <p className="truncate text-xs text-muted-foreground">{it.goal || (isPrayers ? '' : 'Tap ⋯ to add a goal')}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold tabular-nums ${complete ? 'bg-[#DDF4F7] text-[#176B73]' : 'bg-[#F1F5F9] text-[#475569]'}`}>{c.done} / {it.target}</span>
                    {!isPrayers && (
                      <button type="button" aria-label={`Details for ${it.name}`} aria-expanded={open} onClick={() => setExpanded(open ? null : it.key)}
                        className={`shrink-0 rounded-full p-1.5 transition-colors ${open ? 'bg-[#DDF4F7] text-[#176B73]' : 'text-muted-foreground hover:bg-[#F1F5F9]'}`}>
                        <MessageSquareText className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={isPrayers ? (prayed === 5 ? 'Clear all prayers' : 'Mark remaining prayers as prayed') : complete ? `Mark ${it.name} as not done` : `Mark ${it.name} as done`}
                      aria-pressed={complete}
                      onClick={() => (isPrayers ? togglePrayers() : toggleHabit(it))}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${complete ? 'border-[#176B73] bg-[#176B73] text-white' : 'border-[#CBD5E1] text-transparent hover:border-[#176B73]'}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>

                  {open && !isPrayers && (
                    <div className="mb-3 space-y-2.5 rounded-2xl bg-[#F8FAFC] p-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => (log?.status === 'done' ? set(it.key, 'none', null) : set(it.key, 'done', log?.note ?? null))}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${log?.status === 'done' ? 'border-[#176B73] bg-[#176B73] text-white' : 'border-[#D9E3E9] bg-white text-[#176B73]'}`}><Check className="h-3.5 w-3.5" /> Done</button>
                        <button type="button" onClick={() => (log?.status === 'missed' ? set(it.key, 'none', null) : set(it.key, 'missed', log?.note ?? null))}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${log?.status === 'missed' ? 'border-[#D95757] bg-[#D95757] text-white' : 'border-[#D9E3E9] bg-white text-[#D95757]'}`}><X className="h-3.5 w-3.5" /> Skipped</button>
                      </div>
                      {log ? (
                        <>
                          <NoteField value={log.note ?? ''} label={`${log.status === 'missed' ? 'Reason' : 'Comment'} for ${it.name}`}
                            placeholder={log.status === 'missed' ? 'Why did you skip it?' : 'Comment, e.g. what you read / who you helped'} onSave={v => set(it.key, log.status, v || null)} />
                          {log.status === 'missed' && <ReasonChips current={log.note ?? ''} onPick={v => set(it.key, 'missed', v)} />}
                        </>
                      ) : <p className="text-[11px] text-muted-foreground">Mark it done or skipped to add a comment or reason.</p>}
                      {habit && (
                        <div className="flex gap-3 border-t border-[#E3EAF0] pt-2 text-xs font-semibold">
                          <button type="button" onClick={() => openEditHabit(habit)} className="inline-flex items-center gap-1 text-[#176B73] hover:underline"><Pencil className="h-3.5 w-3.5" /> Edit habit</button>
                          <button type="button" onClick={() => { if (window.confirm(`Delete "${habit.name}" and all its history?`)) removeHabit.mutate(habit.id); }} className="inline-flex items-center gap-1 text-[#D95757] hover:underline"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#EEF2F6] pt-3">
            <Button type="button" size="sm" onClick={() => openNewHabit()} className="bg-[#233B63] text-white hover:bg-[#17243D]"><Plus className="mr-1 h-3.5 w-3.5" /> Add habit</Button>
            {unusedSuggestions.map(s => (
              <button key={s.name} type="button" onClick={() => quickAdd(s)} className="inline-flex items-center gap-1.5 rounded-full border border-[#E3EAF0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#475569] hover:border-[#176B73]/40 hover:bg-[#DDF4F7]">
                <span style={{ color: iconTone(s.icon).ink }}><HabitIcon iconKey={s.icon} className="h-3 w-3" /></span> {s.name}
              </button>
            ))}
          </div>
        </section>

        {/* Prayers Log */}
        <section className="space-y-3" data-testid="prayers-card">
          <div className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-[#EEF2F6] pb-3">
              <h3 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D]"><BookOpen className="h-5 w-5 text-[#176B73]" /> Prayers Log</h3>
              <button type="button" onClick={() => setShowHistory(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B73] hover:underline">View All <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex items-center gap-3 py-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${prayed > 0 ? 'bg-[#176B73] text-white' : 'bg-[#F1F5F9] text-[#AAB6C2]'}`}><Check className="h-4 w-4" /></span>
              <p data-testid="text-prayed-count" className="font-heading text-lg font-bold text-[#17243D]">{prayed} {prayed === 1 ? 'time' : 'times'}</p>
              <p className="ml-auto text-xs text-muted-foreground">{longDate(selectedDate)}</p>
            </div>
            <ul className="space-y-2">
              {PRAYERS.map(p => (
                <PrayerRow key={p.key} label={p.label} hint={p.hint} log={logFor(selectedDate, p.key)} onSet={(status, note) => set(p.key, status, note)} />
              ))}
            </ul>
            {dayNote && (
              <div className="mt-3 rounded-2xl bg-[#DDF4F7] p-3.5" data-testid="day-note">
                <div className="mb-1 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-[#17243D]"><Pencil className="h-3.5 w-3.5 text-[#176B73]" /> Note</p>
                  <span className="flex items-center gap-2 text-[11px] font-semibold">
                    <button type="button" onClick={() => setQuickNote(dayNote)} className="text-[#176B73] hover:underline">Edit</button>
                    <button type="button" onClick={() => set(NOTE_KEY, 'none', null)} className="text-[#D95757] hover:underline">Remove</button>
                  </span>
                </div>
                <p className="break-words text-sm leading-6 text-[#17243D]">{dayNote}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#D9E3F0] p-4" style={{ background: 'linear-gradient(135deg, #EEF3FA, #E4F5F7)' }} data-testid="quick-note">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-[#17243D]"><Lightbulb className="h-4 w-4 text-[#B8860B]" /> Quick Note</p>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); saveQuickNote(); }}>
              <Input value={quickNote} onChange={e => setQuickNote(e.target.value)} maxLength={500} placeholder="Add a note for this day…" aria-label="Note for this day" className="h-10 bg-white text-sm" />
              <Button type="submit" disabled={!quickNote.trim()} className="h-10 shrink-0 text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }}><Send className="mr-1.5 h-4 w-4" /> Save</Button>
            </form>
          </div>
        </section>

        {/* Insights */}
        <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5" data-testid="habit-insights">
          <h3 className="mb-3 flex items-center gap-2 border-b border-[#EEF2F6] pb-3 font-heading text-base font-bold text-[#17243D]"><BarChart3 className="h-5 w-5 text-[#176B73]" /> Insights</h3>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <TrendingUp className="mt-0.5 h-6 w-6 shrink-0 text-[#176B73]" />
              <div><p className="text-sm font-semibold text-[#17243D]">Your streak is {streakNow} day{streakNow === 1 ? '' : 's'}!</p><p className="text-xs text-muted-foreground">{streakText}</p></div>
            </li>
            <li className="flex gap-3">
              <Star className="mt-0.5 h-6 w-6 shrink-0 fill-[#F2C75C] text-[#F2C75C]" />
              <div><p className="text-xs text-muted-foreground">Success Rate</p><p className="font-heading text-lg font-bold leading-tight text-[#17243D]">{insights.success === null ? '—' : `${insights.success}%`}</p><p className="text-xs text-muted-foreground">{successText}</p></div>
            </li>
            <li className="flex gap-3">
              <Leaf className="mt-0.5 h-6 w-6 shrink-0 text-[#19C7B7]" />
              <div>
                <p className="text-xs text-muted-foreground">Top Habit</p>
                <p className="text-sm font-bold leading-tight text-[#17243D]">{insights.top ? `${insights.top.name} (${insights.top.pct}%)` : '—'}</p>
                <p className="text-xs text-muted-foreground">{insights.top ? (insights.top.pct >= 90 ? 'Well done!' : 'Keep it going!') : 'Your best habit shows up here.'}</p>
              </div>
            </li>
          </ul>
          <div className="mt-5 rounded-2xl bg-[#F2F0FF] px-4 py-3 text-center text-xs font-medium text-[#475569]">
            <Heart className="mx-auto mb-1 h-4 w-4 text-[#7C6CFF]" />
            A better you, one good habit at a time.
          </div>
        </section>
      </div>

      {/* add / edit habit */}
      <Dialog open={habitDialog !== null} onOpenChange={open => { if (!open) setHabitDialog(null); }}>
        <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{habitDialog !== null && habitDialog !== 'new' ? 'Edit habit' : 'Add a habit'}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); saveHabit(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="gh-name">Habit name *</Label>
              <Input id="gh-name" value={form.name} maxLength={60} autoComplete="off" placeholder="e.g. Reading Books" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Icon">
                {PICKABLE_ICONS.map(k => (
                  <button key={k} type="button" role="radio" aria-checked={form.icon === k} aria-label={ICONS[k].label} onClick={() => setForm(f => ({ ...f, icon: k }))}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-colors ${form.icon === k ? 'border-[#176B73]' : 'border-transparent hover:border-[#E3EAF0]'}`}
                    style={{ backgroundColor: ICONS[k].bg, color: ICONS[k].ink }}>
                    <HabitIcon iconKey={k} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gh-goal">Goal (optional)</Label>
              <Input id="gh-goal" value={form.goal} maxLength={120} autoComplete="off" placeholder="e.g. At least 20 pages" onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gh-min">Minutes each time (optional)</Label>
              <Input id="gh-min" type="number" min={0} max={1440} value={form.minutes} placeholder="e.g. 30" onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground">Each time you finish it, these minutes are added to Total Time.</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setHabitDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={!form.name.trim() || addHabit.isPending || updateHabit.isPending} className="bg-[#233B63] text-white hover:bg-[#17243D]">{habitDialog !== null && habitDialog !== 'new' ? 'Save changes' : 'Add habit'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* streak details */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-h-[88vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Streak details</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Current streak', value: `${streaks.current}`, unit: 'days' },
              { label: 'Best streak', value: `${streaks.best}`, unit: 'days' },
              { label: 'Active days', value: `${streaks.activeDays}`, unit: 'logged' },
              { label: 'Perfect days', value: `${streaks.fullDays}`, unit: 'everything done' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-[#E3EAF0] p-3">
                <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-heading text-xl font-bold text-[#17243D]">{s.value}<span className="ml-1 text-[11px] font-medium text-muted-foreground">{s.unit}</span></p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">A day counts toward the streak when at least one habit is done. Perfect streak (everything done): <span className="font-semibold text-[#17243D]">{streaks.currentFull}</span> day{streaks.currentFull === 1 ? '' : 's'}.</p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Each habit (full days in a row)</p>
            <ul className="divide-y divide-[#EEF2F6]">
              {itemStreaks.map(({ it, current, best }) => (
                <li key={it.key} className="flex items-center gap-3 py-2">
                  <IconTile iconKey={it.icon} size="h-8 w-8" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#17243D]">{it.name}{it.key === 'prayers' && <span className="ml-1 text-[11px] font-normal text-muted-foreground">(all 5)</span>}</span>
                  <span className="text-xs text-muted-foreground">now <span className="font-bold text-[#17243D]">{current}</span> · best <span className="font-bold text-[#17243D]">{best}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* history */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">History &amp; reasons</DialogTitle></DialogHeader>
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#D9E3E9] py-8 text-center text-sm text-muted-foreground">Nothing logged yet. Prayers, notes and reasons you add will show up here.</p>
          ) : (
            <ul className="divide-y divide-[#EEF2F6]">
              {history.map(h => (
                <li key={h.date} className="space-y-1.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <button type="button" onClick={() => { setSelectedDate(h.date); setShowHistory(false); }} className="text-sm font-semibold text-[#176B73] hover:underline">{longDate(h.date)}</button>
                    {h.loggedPrayers > 0 && <span className="rounded-full bg-[#DDF4F7] px-2.5 py-0.5 text-xs font-bold text-[#176B73]">{h.prayed}/5 prayers</span>}
                  </div>
                  {h.missed.map((m, i) => (
                    <p key={i} className="text-sm text-[#475569]"><span className="mr-2 rounded-md bg-[#FBEEEE] px-1.5 py-0.5 text-[10px] font-bold text-[#D95757]">{m.name} missed</span>{m.note || <span className="text-muted-foreground">No reason written</span>}</p>
                  ))}
                  {h.note && <p className="rounded-xl bg-[#DDF4F7] px-3 py-2 text-sm text-[#17243D]">{h.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
