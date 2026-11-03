#!/usr/bin/env python3
"""Fly: add a "Good Habits" section.

What you get
  * New "Good Habits" tab in the Fly sidebar (/fly/habits).
  * Five daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha): tap Prayed or Missed. Missed opens a
    "why?" box with quick reasons (Overslept, At work / class, Travelling, Sick, Forgot ...).
  * Your own habits (Reading books, Helping others, ...): Done / Skipped plus a comment.
  * Any day: use the arrows / date picker, or click a day in the heatmap, to log or fix past days.
  * Streak & activity: current + best streak, active days, perfect days, last-7-days flames,
    and a heatmap. Choose All habits, Prayers or one habit to see its own streak.
  * "Why I missed": your latest reasons in one list.
  * Two new database tables (good_habits, habit_logs). They are created automatically the
    first time the page is used, so no separate database step is needed.

Safe to run twice.   Usage (project root):  python3 add_good_habits.py artifacts/ielts-tracker
"""
import os, re, sys

APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
ROOT = os.path.abspath(os.path.join(APP, "..", ".."))
problems = []

FILES = {
    "lib/db/src/schema/good-habits.ts": r"""import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// Habits you add yourself (Reading books, Helping others, ...). The five daily
// prayers are built in and do not need rows here.
export const goodHabitsTable = pgTable("good_habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One row per day + habit: "done" or "missed", with an optional comment / reason.
// habitKey is "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" for prayers, or "h<id>" for your own habits.
export const habitLogsTable = pgTable(
  "habit_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(),
    habitKey: text("habit_key").notNull(),
    status: text("status").notNull().default("done"),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("habit_logs_user_date_habit_idx").on(t.userId, t.date, t.habitKey)],
);

export type GoodHabit = typeof goodHabitsTable.$inferSelect;
export type HabitLog = typeof habitLogsTable.$inferSelect;
""",
    "artifacts/api-server/src/routes/good-habits.ts": r"""import { Router, type IRouter } from "express";
import { eq, and, asc, gte, sql } from "drizzle-orm";
import { db, goodHabitsTable, habitLogsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The tables are created on first use, so no separate "db push" step is needed.
// They match lib/db/src/schema/good-habits.ts exactly.
let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (tablesReady) return tablesReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS good_habits (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        name text NOT NULL,
        emoji text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS habit_logs (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        date text NOT NULL,
        habit_key text NOT NULL,
        status text NOT NULL DEFAULT 'done',
        note text,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS habit_logs_user_date_habit_idx
      ON habit_logs (user_id, date, habit_key)
    `);
  })().catch((err: unknown) => {
    tablesReady = null;
    throw err;
  });
  tablesReady = created;
  return created;
}

router.use("/good-habits", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTables();
    next();
  } catch (err: any) {
    console.error("good-habits table error:", err?.message);
    res.status(500).json({ error: "Good Habits is not available right now." });
  }
});

/* ── your own habits ─────────────────────────────────────────────────────── */
const habitSchema = z.object({
  name: z.string().trim().min(1).max(60),
  emoji: z.string().trim().max(8).nullable().optional(),
});

router.get("/good-habits/habits", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(goodHabitsTable)
    .where(eq(goodHabitsTable.userId, req.userId!))
    .orderBy(asc(goodHabitsTable.id));
  res.json(rows);
});

router.post("/good-habits/habits", async (req, res): Promise<void> => {
  const parsed = habitSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(goodHabitsTable)
    .values({ ...parsed.data, userId: req.userId! })
    .returning();
  res.status(201).json(row);
});

router.put("/good-habits/habits/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = habitSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(goodHabitsTable)
    .set(parsed.data)
    .where(and(eq(goodHabitsTable.id, id), eq(goodHabitsTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/good-habits/habits/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(goodHabitsTable)
    .where(and(eq(goodHabitsTable.id, id), eq(goodHabitsTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  // its day-by-day history goes with it
  await db
    .delete(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, req.userId!), eq(habitLogsTable.habitKey, `h${id}`)));
  res.sendStatus(204);
});

/* ── day-by-day log ──────────────────────────────────────────────────────── */
router.get("/good-habits/logs", async (req, res): Promise<void> => {
  const days = Math.min(1100, Math.max(7, parseInt(String(req.query.days ?? "400"), 10) || 400));
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(habitLogsTable)
    .where(and(eq(habitLogsTable.userId, req.userId!), gte(habitLogsTable.date, from)))
    .orderBy(asc(habitLogsTable.date), asc(habitLogsTable.id));
  res.json(rows);
});

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  habitKey: z.string().trim().min(1).max(64),
  status: z.enum(["done", "missed", "none"]),
  note: z.string().max(1000).nullable().optional(),
});

// Sets one day + habit. status "none" clears it.
router.put("/good-habits/logs", async (req, res): Promise<void> => {
  const parsed = logSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { date, habitKey, status } = parsed.data;
  const userId = req.userId!;

  if (status === "none") {
    await db
      .delete(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.date, date), eq(habitLogsTable.habitKey, habitKey)));
    res.json({ ok: true, cleared: true });
    return;
  }

  const note = parsed.data.note?.trim() ? parsed.data.note.trim() : null;
  const [row] = await db
    .insert(habitLogsTable)
    .values({ userId, date, habitKey, status, note })
    .onConflictDoUpdate({
      target: [habitLogsTable.userId, habitLogsTable.date, habitLogsTable.habitKey],
      set: { status, note, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

export default router;
""",
    "@APP/src/pages/GoodHabits.tsx": r"""import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Check, X, Flame, Trophy, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Sparkles, MessageSquareText, CalendarDays, Leaf,
} from 'lucide-react';

/* ─── Types & constants ─────────────────────────────────────────────────── */
type Status = 'done' | 'missed';
interface HabitLog { id: number; date: string; habitKey: string; status: Status; note: string | null }
interface Habit { id: number; name: string; emoji: string | null }
type SetLogVars = { date: string; habitKey: string; status: Status | 'none'; note?: string | null };

const PRAYERS = [
  { key: 'fajr',    label: 'Fajr',    hint: 'Dawn' },
  { key: 'dhuhr',   label: 'Dhuhr',   hint: 'Midday' },
  { key: 'asr',     label: 'Asr',     hint: 'Afternoon' },
  { key: 'maghrib', label: 'Maghrib', hint: 'Sunset' },
  { key: 'isha',    label: 'Isha',    hint: 'Night' },
];
const PRAYER_KEYS = PRAYERS.map(p => p.key);
const REASON_CHIPS = ['Overslept', 'At work / class', 'Travelling', 'Sick', 'Forgot', 'No suitable place'];
const HABIT_SUGGESTIONS = [
  { name: 'Reading books', emoji: '📖' },
  { name: 'Helping others', emoji: '🤝' },
  { name: 'Exercise', emoji: '🏃' },
  { name: 'Gratitude', emoji: '🙏' },
  { name: 'Charity', emoji: '💝' },
];
const LOGS_KEY = ['habit-logs'];
const HABITS_KEY = ['good-habits'];

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
function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}
function prettyDate(s: string) {
  return parseDate(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

/* ─── Streak / heatmap maths (pure) ─────────────────────────────────────── */
type DayStat = { done: number; missed: number };

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

/* ─── Small pieces ──────────────────────────────────────────────────────── */
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

function HabitRow({
  emoji, label, hint, log, doneLabel, missedLabel, showNoteWhenDone, donePlaceholder, missedPlaceholder, chips, onSet, trailing,
}: {
  emoji: string; label: string; hint?: string; log: HabitLog | undefined;
  doneLabel: string; missedLabel: string; showNoteWhenDone: boolean;
  donePlaceholder: string; missedPlaceholder: string; chips?: string[];
  onSet: (status: Status | 'none', note: string | null) => void;
  trailing?: React.ReactNode;
}) {
  const status = log?.status ?? null;
  const note = log?.note ?? '';
  const showNote = status === 'missed' || (status === 'done' && showNoteWhenDone);
  const tone = status === 'done' ? 'border-[#BFE9E4] bg-[#F1FBF9]' : status === 'missed' ? 'border-[#F3CFCF] bg-[#FDF5F5]' : 'border-[#E3EAF0] bg-white';

  return (
    <li className={`rounded-2xl border px-3.5 py-3 transition-colors ${tone}`} data-testid={`habit-row-${label}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm" aria-hidden>{emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#17243D]">{label}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {trailing}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-pressed={status === 'done'}
            onClick={() => onSet(status === 'done' ? 'none' : 'done', status === 'done' || !showNoteWhenDone ? null : note || null)}
            className={`inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition-colors ${
              status === 'done' ? 'border-[#176B73] bg-[#176B73] text-white' : 'border-[#D9E3E9] bg-white text-[#176B73] hover:bg-[#DDF4F7]'
            }`}
          >
            <Check className="h-3.5 w-3.5" /> {doneLabel}
          </button>
          <button
            type="button"
            aria-pressed={status === 'missed'}
            onClick={() => onSet(status === 'missed' ? 'none' : 'missed', status === 'missed' ? null : note || null)}
            className={`inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold transition-colors ${
              status === 'missed' ? 'border-[#D95757] bg-[#D95757] text-white' : 'border-[#D9E3E9] bg-white text-[#D95757] hover:bg-[#FBEEEE]'
            }`}
          >
            <X className="h-3.5 w-3.5" /> {missedLabel}
          </button>
        </div>
      </div>

      {showNote && (
        <div className="mt-2.5 space-y-2">
          <NoteField
            value={note}
            label={`${status === 'missed' ? 'Reason' : 'Comment'} for ${label}`}
            placeholder={status === 'missed' ? missedPlaceholder : donePlaceholder}
            onSave={v => onSet(status as Status, v || null)}
          />
          {status === 'missed' && chips && chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSet('missed', c)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    note === c ? 'border-[#D95757] bg-[#FBEEEE] text-[#D95757]' : 'border-[#E3EAF0] bg-white text-muted-foreground hover:border-[#D95757]/40'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/* ─── Activity heatmap (fits its card; click a day to open it) ──────────── */
function HabitHeatmap({ stats, total, selectedDate, onSelect }: {
  stats: Map<string, DayStat>; total: number; selectedDate: string; onSelect: (d: string) => void;
}) {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBoxWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const LABEL_COL = 28;
  const MIN_PITCH = 17;
  const weekCount = boxWidth > 0 ? Math.max(10, Math.min(52, Math.floor((boxWidth - LABEL_COL) / MIN_PITCH))) : 26;

  const today = new Date();
  const todayStr = localDateStr(today);
  const start = addDays(startOfWeek(today), -(weekCount - 1) * 7);
  const weeks: { date: Date; dateStr: string }[][] = [];
  let cur = new Date(start);
  while (cur <= today) {
    const week: { date: Date; dateStr: string }[] = [];
    for (let d = 0; d < 7; d++) { week.push({ date: new Date(cur), dateStr: localDateStr(cur) }); cur = addDays(cur, 1); }
    weeks.push(week);
  }

  const color = (s: DayStat | undefined) => {
    if (!s || (s.done === 0 && s.missed === 0)) return '#E8EEF2';
    if (s.done === 0) return '#F3CFCF';
    const f = total > 0 ? s.done / total : 1;
    if (f >= 1) return '#0E4A52';
    if (f >= 0.67) return '#176B73';
    if (f >= 0.34) return '#19C7B7';
    return '#A9DCE8';
  };
  const DAY_LABELS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };

  return (
    <div className="w-full" ref={boxRef}>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `${LABEL_COL - 3}px repeat(${weeks.length}, minmax(0, 1fr))`, gridTemplateRows: '16px repeat(7, auto)' }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map(di => (
          <div key={`dl${di}`} className="flex items-center text-[9px] font-medium leading-none text-muted-foreground" style={{ gridColumn: 1, gridRow: di + 2 }}>
            {DAY_LABELS[di] || ''}
          </div>
        ))}
        {weeks.map((week, wi) => {
          const monthChanged = wi === 0 || week[0].date.getMonth() !== weeks[wi - 1][0].date.getMonth();
          const nextChanged = wi === 0 && weeks.length > 1 && weeks[1][0].date.getMonth() !== week[0].date.getMonth();
          const showLabel = monthChanged && !nextChanged;
          return (
            <React.Fragment key={wi}>
              {showLabel && (
                <div className="whitespace-nowrap text-[9px] font-medium leading-4 text-muted-foreground" style={{ gridColumn: wi + 2, gridRow: 1 }}>
                  {week[0].date.toLocaleDateString(undefined, { month: 'short' })}
                </div>
              )}
              {week.map((day, di) => {
                if (day.dateStr > todayStr) return <div key={di} style={{ gridColumn: wi + 2, gridRow: di + 2 }} />;
                const s = stats.get(day.dateStr);
                const text = `${day.dateStr}: ${s ? `${s.done}/${total} done${s.missed ? `, ${s.missed} missed` : ''}` : 'nothing logged'}`;
                return (
                  <button
                    key={di}
                    type="button"
                    aria-label={text}
                    onClick={() => onSelect(day.dateStr)}
                    className={`aspect-square w-full cursor-pointer rounded-[4px] transition-opacity hover:opacity-80 ${day.dateStr === selectedDate ? 'ring-2 ring-[#233B63] ring-offset-1' : ''}`}
                    style={{ gridColumn: wi + 2, gridRow: di + 2, backgroundColor: color(s) }}
                    onMouseEnter={e => {
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setTip({ text, x: r.left, y: r.top });
                    }}
                    onMouseLeave={() => setTip(null)}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: '#F3CFCF' }} />Missed only</span>
        <span className="inline-flex items-center gap-1.5">
          Less
          {['#E8EEF2', '#A9DCE8', '#19C7B7', '#176B73', '#0E4A52'].map(c => <span key={c} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: c }} />)}
          More
        </span>
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
export function GoodHabitsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const todayStr = localDateStr(new Date());

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [scope, setScope] = useState<string>('all');
  const [newHabit, setNewHabit] = useState('');

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
    mutationFn: (b: { name: string; emoji: string }) => check(api.addGoodHabit(b)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: HABITS_KEY }); setNewHabit(''); },
    onError: fail,
  });
  const renameHabit = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => check(api.updateGoodHabit(id, { name })),
    onSuccess: () => qc.invalidateQueries({ queryKey: HABITS_KEY }),
    onError: fail,
  });
  const removeHabit = useMutation({
    mutationFn: (id: number) => api.deleteGoodHabit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: HABITS_KEY }); qc.invalidateQueries({ queryKey: LOGS_KEY }); },
    onError: fail,
  });

  const habitKey = (h: Habit) => `h${h.id}`;
  const logMap = useMemo(() => {
    const m = new Map<string, HabitLog>();
    logs.forEach(l => m.set(`${l.date}|${l.habitKey}`, l));
    return m;
  }, [logs]);
  const logFor = (date: string, key: string) => logMap.get(`${date}|${key}`);
  const set = (key: string, status: Status | 'none', note: string | null) => setLog.mutate({ date: selectedDate, habitKey: key, status, note });

  /* if a habit that was selected for the streak is deleted, fall back to "all" */
  useEffect(() => {
    if (scope !== 'all' && scope !== 'prayers' && !habits.some(h => habitKey(h) === scope)) setScope('all');
  }, [habits, scope]);

  /* ── numbers ── */
  const allKeys = useMemo(() => [...PRAYER_KEYS, ...habits.map(habitKey)], [habits]);
  const scopeKeys = scope === 'all' ? allKeys : scope === 'prayers' ? PRAYER_KEYS : [scope];
  const stats = useMemo(() => computeDayStats(logs, scopeKeys), [logs, scope, habits]);
  const streaks = useMemo(() => computeStreaks(stats, scopeKeys.length, new Date()), [stats, scopeKeys.length]);

  const dayStats = useMemo(() => computeDayStats(logs, allKeys).get(selectedDate) ?? { done: 0, missed: 0 }, [logs, allKeys, selectedDate]);
  const dayTotal = allKeys.length;
  const dayPct = dayTotal ? Math.round((dayStats.done / dayTotal) * 100) : 0;
  const prayed = PRAYER_KEYS.filter(k => logFor(selectedDate, k)?.status === 'done').length;
  const prayerMissed = PRAYER_KEYS.filter(k => logFor(selectedDate, k)?.status === 'missed').length;

  const flameDays = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(t, i - 6);
      const ds = localDateStr(d);
      return { key: ds, label: d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2), active: (stats.get(ds)?.done ?? 0) >= 1 };
    });
  }, [stats]);

  const nameFor = (key: string) => {
    const p = PRAYERS.find(x => x.key === key);
    if (p) return p.label;
    const h = habits.find(x => habitKey(x) === key);
    return h ? h.name : 'Habit';
  };
  const recentReasons = useMemo(
    () => logs.filter(l => l.status === 'missed' && l.note).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 8),
    [logs],
  );
  const missedNoReason = useMemo(() => logs.filter(l => l.status === 'missed' && !l.note).length, [logs]);

  function markAllPrayed() {
    PRAYER_KEYS.forEach(k => { if (logFor(selectedDate, k)?.status !== 'done') set(k, 'done', logFor(selectedDate, k)?.note ?? null); });
  }
  function goDay(n: number) {
    const next = localDateStr(addDays(parseDate(selectedDate), n));
    if (next <= todayStr) setSelectedDate(next);
  }
  function submitHabit(name: string, emoji: string) {
    const clean = name.trim();
    if (!clean) return;
    if (habits.some(h => h.name.trim().toLowerCase() === clean.toLowerCase())) {
      toast({ title: 'You already track that habit', variant: 'destructive' });
      return;
    }
    addHabit.mutate({ name: clean, emoji });
  }

  const scopeOptions = [
    { id: 'all', label: 'All habits' },
    { id: 'prayers', label: 'Prayers' },
    ...habits.map(h => ({ id: habitKey(h), label: `${h.emoji || '✨'} ${h.name}` })),
  ];
  const unusedSuggestions = HABIT_SUGGESTIONS.filter(s => !habits.some(h => h.name.trim().toLowerCase() === s.name.toLowerCase()));

  return (
    <div className="space-y-6" data-testid="good-habits">
      {/* header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">Fly · Good Habits</p>
        <h2 className="mt-1 flex items-center gap-2 font-heading text-xl font-bold text-[#17243D]">
          <Leaf className="h-5 w-5 text-[#176B73]" /> Good Habits
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Small things, done every day: prayers, reading, helping others. Note the reason when you miss one.</p>
      </div>

      {/* day picker + summary */}
      <div className="rounded-3xl p-5 text-white shadow-[0_12px_28px_rgba(23,36,61,.14)] sm:p-6" style={{ background: 'linear-gradient(120deg, #17243D, #233B63, #176B73)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => goDay(-1)} aria-label="Previous day" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => goDay(1)} disabled={selectedDate >= todayStr} aria-label="Next day" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
            <div className="ml-2">
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#A9DCE8]">{selectedDate === todayStr ? 'Today' : 'Viewing'}</p>
              <p className="font-heading text-lg font-bold leading-tight">{prettyDate(selectedDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedDate !== todayStr && (
              <button type="button" onClick={() => setSelectedDate(todayStr)} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">Back to today</button>
            )}
            <label className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <CalendarDays className="h-3.5 w-3.5" />
              <input
                type="date" value={selectedDate} max={todayStr} aria-label="Pick a day"
                onChange={e => { if (e.target.value && e.target.value <= todayStr) setSelectedDate(e.target.value); }}
                className="w-[7.5rem] bg-transparent text-xs text-white [color-scheme:dark] focus:outline-none"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className="flex items-end gap-2">
            <span data-testid="text-habits-done" className="font-heading text-5xl font-bold leading-none">{dayStats.done}</span>
            <span className="pb-1 text-sm text-white/75">of {dayTotal} done</span>
          </div>
          <div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={dayPct} aria-valuemin={0} aria-valuemax={100} aria-label="Habits done for this day">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dayPct}%`, background: 'linear-gradient(90deg, #19C7B7, #42E6B8)' }} />
            </div>
            <p className="mt-2 text-xs text-white/75">{prayed}/5 prayers{prayerMissed > 0 ? ` · ${prayerMissed} missed` : ''}{dayStats.missed - prayerMissed > 0 ? ` · ${dayStats.missed - prayerMissed} habit${dayStats.missed - prayerMissed === 1 ? '' : 's'} skipped` : ''}</p>
          </div>
        </div>
      </div>

      {/* prayers + habits */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5" data-testid="prayers-card">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-base font-bold text-[#17243D]">Prayers</h3>
              <p className="text-xs text-muted-foreground">Mark each one. If you miss a prayer, write why.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={markAllPrayed} disabled={prayed === 5} className="shrink-0 border-[#176B73]/40 text-[#176B73] hover:bg-[#DDF4F7]">
              <Check className="mr-1 h-3.5 w-3.5" /> All 5 prayed
            </Button>
          </div>
          <ul className="space-y-2.5">
            {PRAYERS.map(p => (
              <HabitRow
                key={p.key}
                emoji="🕌"
                label={p.label}
                hint={p.hint}
                log={logFor(selectedDate, p.key)}
                doneLabel="Prayed"
                missedLabel="Missed"
                showNoteWhenDone={false}
                donePlaceholder=""
                missedPlaceholder="Why couldn't you pray? e.g. overslept, at work…"
                chips={REASON_CHIPS}
                onSet={(status, note) => set(p.key, status, note)}
              />
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5" data-testid="habits-card">
          <div className="mb-3">
            <h3 className="font-heading text-base font-bold text-[#17243D]">Other good habits</h3>
            <p className="text-xs text-muted-foreground">Add anything you want to do daily. Add a comment for what you did, or why you skipped.</p>
          </div>

          {habits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D9E3E9] px-4 py-6 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF4F7] text-xl">🌱</span>
              <p className="mt-2 text-sm font-semibold text-[#17243D]">No habits yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Pick one below to start, or type your own.</p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {habits.map(h => (
                <HabitRow
                  key={h.id}
                  emoji={h.emoji || '✨'}
                  label={h.name}
                  log={logFor(selectedDate, habitKey(h))}
                  doneLabel="Done"
                  missedLabel="Skipped"
                  showNoteWhenDone
                  donePlaceholder="Comment, e.g. what you read / who you helped"
                  missedPlaceholder="Why did you skip it?"
                  chips={REASON_CHIPS}
                  onSet={(status, note) => set(habitKey(h), status, note)}
                  trailing={
                    <span className="flex shrink-0 items-center">
                      <button type="button" aria-label={`Rename ${h.name}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#F1F5F7] hover:text-[#17243D]"
                        onClick={() => { const n = window.prompt('Rename habit', h.name); if (n && n.trim() && n.trim() !== h.name) renameHabit.mutate({ id: h.id, name: n.trim() }); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label={`Delete ${h.name}`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#FBEEEE] hover:text-[#D95757]"
                        onClick={() => { if (window.confirm(`Delete "${h.name}" and all its history?`)) removeHabit.mutate(h.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  }
                />
              ))}
            </ul>
          )}

          <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); submitHabit(newHabit, '✨'); }}>
            <Input value={newHabit} onChange={e => setNewHabit(e.target.value)} maxLength={60} placeholder="New habit, e.g. Read 20 pages" aria-label="New habit name" className="h-9 text-sm" />
            <Button type="submit" size="sm" disabled={!newHabit.trim() || addHabit.isPending} className="shrink-0 bg-[#233B63] text-white hover:bg-[#17243D]"><Plus className="mr-1 h-3.5 w-3.5" /> Add</Button>
          </form>
          {unusedSuggestions.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {unusedSuggestions.map(s => (
                <button key={s.name} type="button" onClick={() => submitHabit(s.name, s.emoji)} className="rounded-full border border-[#E3EAF0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#475569] hover:border-[#176B73]/40 hover:bg-[#DDF4F7]">
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* streak + heatmap */}
      <section className="overflow-hidden rounded-2xl border border-[#E3EAF0] bg-white shadow-[0_8px_30px_rgba(23,36,61,.045)]" data-testid="habit-streak-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E3EAF0] bg-[#FDF8EB] px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2C75C] text-[#B8860B]"><Flame className="h-4 w-4 fill-current" /></span>
            <div>
              <h3 className="font-heading text-base font-bold text-[#17243D]">Streak &amp; activity</h3>
              <p className="text-xs text-muted-foreground">A day counts when you finish at least one habit.</p>
            </div>
          </div>
          <div className="text-right">
            <p data-testid="text-habit-streak" className="font-heading text-3xl font-bold leading-none text-[#B8860B]">{streaks.current}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{streaks.current === 1 ? 'day streak' : 'days streak'}</p>
          </div>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Streak for">
            {scopeOptions.map(o => (
              <button
                key={o.id} type="button" role="tab" aria-selected={scope === o.id} onClick={() => setScope(o.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${scope === o.id ? 'border-[#233B63] bg-[#233B63] text-white' : 'border-[#E3EAF0] bg-white text-muted-foreground hover:border-[#233B63]/40'}`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Best streak', value: `${streaks.best}`, unit: streaks.best === 1 ? 'day' : 'days', icon: Trophy, ink: '#B8860B', bg: '#FDF8EB' },
              { label: 'Active days', value: `${streaks.activeDays}`, unit: 'logged', icon: Sparkles, ink: '#7C6CFF', bg: '#F2F0FF' },
              { label: 'Perfect days', value: `${streaks.fullDays}`, unit: 'all done', icon: Check, ink: '#176B73', bg: '#DDF4F7' },
              { label: 'Perfect streak', value: `${streaks.currentFull}`, unit: streaks.currentFull === 1 ? 'day' : 'days', icon: Flame, ink: '#D95757', bg: '#FBEEEE' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-[#E3EAF0] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: s.bg, color: s.ink }}><s.icon className="h-3.5 w-3.5" /></span>
                </div>
                <p className="mt-1 font-heading text-xl font-bold text-[#17243D]">{s.value}<span className="ml-1 text-[11px] font-medium text-muted-foreground">{s.unit}</span></p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {flameDays.map(day => (
              <button key={day.key} type="button" onClick={() => setSelectedDate(day.key)} className="flex flex-col items-center gap-1.5" aria-label={`Open ${day.key}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors ${day.active ? 'bg-[#FDF8EB] text-[#B8860B]' : 'bg-[#F1F5F9] text-[#AAB6C2]'} ${day.key === selectedDate ? 'ring-2 ring-[#233B63]' : ''}`}>
                  <Flame className={`h-4 w-4 ${day.active ? 'fill-current' : ''}`} />
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">{day.label}</span>
              </button>
            ))}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[#7C6CFF]" />
              Activity heatmap
              <span className="ml-auto font-medium normal-case tracking-normal">{streaks.activeDays} active days</span>
            </div>
            {isLoading ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
            ) : (
              <HabitHeatmap stats={stats} total={scopeKeys.length} selectedDate={selectedDate} onSelect={setSelectedDate} />
            )}
          </div>
        </div>
      </section>

      {/* reasons */}
      <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5" data-testid="missed-reasons">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBEEEE] text-[#D95757]"><MessageSquareText className="h-4 w-4" /></span>
          <div>
            <h3 className="font-heading text-base font-bold text-[#17243D]">Why I missed</h3>
            <p className="text-xs text-muted-foreground">Your most recent reasons. Spot the pattern, then plan around it.</p>
          </div>
        </div>
        {recentReasons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#D9E3E9] py-6 text-center text-sm text-muted-foreground">No reasons written yet. When you mark something as missed, the reason shows up here.</p>
        ) : (
          <ul className="divide-y divide-[#EEF2F6]">
            {recentReasons.map(l => (
              <li key={`${l.date}|${l.habitKey}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 text-sm">
                <button type="button" onClick={() => setSelectedDate(l.date)} className="w-28 shrink-0 text-left text-xs font-semibold text-[#176B73] hover:underline">
                  {parseDate(l.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                </button>
                <span className="rounded-md bg-[#FBEEEE] px-1.5 py-0.5 text-[10px] font-bold text-[#D95757]">{nameFor(l.habitKey)}</span>
                <span className="min-w-0 flex-1 break-words text-[#475569]">{l.note}</span>
              </li>
            ))}
          </ul>
        )}
        {missedNoReason > 0 && <p className="mt-2 text-[11px] text-muted-foreground">{missedNoReason} missed without a reason. Open the day and add one.</p>}
      </section>
    </div>
  );
}
""",
}


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def edit(rel, steps):
    """steps: list of (label, marker, finder) - marker = text that means 'already done';
    finder(s) -> new text, or None if the anchor was not found exactly once."""
    path = rel if os.path.isabs(rel) else os.path.join(ROOT, rel)
    if not os.path.exists(path):
        problems.append(rel + ": file not found"); print("MISSING:", rel); return
    s = read(path)
    for label, marker, finder in steps:
        if marker in s:
            print("already:", label); continue
        out = finder(s)
        if out is None:
            problems.append(label + ": anchor not found exactly once"); print("MISSING:", label); continue
        s = out; print("ok     :", label)
    write(path, s)


def after_line(prefix_regex, add):
    """Insert `add` as new line(s) right after the single line matching prefix_regex."""
    def f(s):
        ms = list(re.finditer(r"^" + prefix_regex + r"[^\n]*\n", s, re.M))
        if len(ms) != 1:
            return None
        e = ms[0].end()
        return s[:e] + add + s[e:]
    return f


def before_line(prefix_regex, add):
    def f(s):
        ms = list(re.finditer(r"^" + prefix_regex + r"[^\n]*\n", s, re.M))
        if len(ms) != 1:
            return None
        b = ms[0].start()
        return s[:b] + add + s[b:]
    return f


# 0. sanity
if not os.path.exists(os.path.join(ROOT, "lib/db/src/schema/index.ts")) or not os.path.exists(os.path.join(APP, "src/App.tsx")):
    sys.exit("Run this from the project root:  python3 add_good_habits.py artifacts/ielts-tracker")

# 1. new files
for rel, body in FILES.items():
    rel = rel.replace("@APP", os.path.relpath(APP, ROOT).replace(os.sep, "/"))
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and read(path) == body:
        print("already:", rel)
    else:
        write(path, body); print("ok     :", rel)

# 2. database schema export
edit("lib/db/src/schema/index.ts", [
    ("db schema export", 'export * from "./good-habits";',
     after_line(r'export \* from "\./planning-notes";', 'export * from "./good-habits";\n')),
])

# 3. api route
edit("artifacts/api-server/src/routes/index.ts", [
    ("api route import", 'import goodHabitsRouter from',
     after_line(r'import planningNotesRouter from', 'import goodHabitsRouter from "./good-habits";\n')),
    ("api route use", 'router.use(goodHabitsRouter);',
     after_line(r'router\.use\(planningNotesRouter\);', 'router.use(goodHabitsRouter);\n')),
])

# 4. front-end api client
edit(os.path.join(APP, "src/lib/api.ts"), [
    ("api client", "getGoodHabits:", after_line(r'  deletePlanningNote:',
        "  getGoodHabits: () => getList('/api/good-habits/habits'),\n"
        "  addGoodHabit: (body: Record<string, unknown>) => post('/api/good-habits/habits', body),\n"
        "  updateGoodHabit: (id: number, body: Record<string, unknown>) => put(`/api/good-habits/habits/${id}`, body),\n"
        "  deleteGoodHabit: (id: number) => del(`/api/good-habits/habits/${id}`),\n"
        "  getHabitLogs: () => getList('/api/good-habits/logs'),\n"
        "  setHabitLog: (body: Record<string, unknown>) => put('/api/good-habits/logs', body),\n")),
])


# 5. sidebar tab + route
def add_tab_type(s):
    m = re.search(r"(type FlyTab\s*=\s*)([^;]+);", s)
    if not m or s.count("type FlyTab") != 1:
        return None
    return s[:m.end(2)] + " | 'habits'" + s[m.end(2):]


edit(os.path.join(APP, "src/App.tsx"), [
    ("tab type", "| 'habits'", add_tab_type),
    ("sidebar item", "id: 'habits'",
     before_line(r"  \{ id: 'notepad'", "  { id: 'habits',       label: 'Good Habits',   icon: Leaf },\n")),
])

# 6. render the tab
edit(os.path.join(APP, "src/pages/HigherStudyPrep.tsx"), [
    ("page import", "import { GoodHabitsTab }",
     after_line(r"import React", "import { GoodHabitsTab } from '@/pages/GoodHabits';\n")),
    ("page render", "<GoodHabitsTab />",
     before_line(r"      \{tab === 'templates'", "      {tab === 'habits'       && <GoodHabitsTab />}\n")),
])

print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your files differ from what I expected):")
    for x in problems:
        print("  -", x)
    sys.exit(1)
print("All edits applied.")
