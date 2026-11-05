#!/usr/bin/env python3
"""Fly: add "Night Journal" and "Know Myself" (strengths, weaknesses, regrets, failures, confusions).

NIGHT JOURNAL  (Fly > Night Journal)
  * A big free-writing page for each day, plus an optional mood and "one word for today".
  * Tick "I wrote this day in my paper notebook" if you wrote it on paper.
  * Missed days show in red (last 7 days strip + month calendar). Tap a missed day and write it
    later; it is marked "Written late". Your streak stays honest.
  * Night streak, best streak, nights this month, total entries.
  * Search all your entries; "Looking back" shows what you wrote a week / month / year ago.
  * HOMEPAGE: a banner tells you when days are missing, or (after 6 pm) that tonight is still empty.

KNOW MYSELF  (Fly > Know Myself)
  * Five kinds of notes: Strengths, Weaknesses, Regrets, Failures, Confusions.
  * Each has the right questions (what happened / what I learned / what I will do) and an optional
    "do it by" date. Regrets, failures, weaknesses and confusions have a status you can move
    (To work on > In progress > Worked on; Confusions: Unsure > Testing > Understood).
  * A "Time to revisit" card brings back items you have not touched for a week.

Two small database tables are created automatically on first use.
Safe to run twice.   Usage (project root):  python3 add_journal_and_self.py artifacts/ielts-tracker
"""
import os, re, sys
APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
ROOT = os.path.abspath(os.path.join(APP, "..", ".."))
problems = []
FILES = {
    "lib/db/src/schema/journal.ts": r"""import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// One row per day you wrote (or wrote in your paper notebook).
export const journalEntriesTable = pgTable(
  "journal_entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    content: text("content").notNull().default(""),
    mood: integer("mood"), // 1 (rough) .. 5 (great)
    word: text("word"), // one word for the day
    inNotebook: boolean("in_notebook").notNull().default(false),
    lateEntry: boolean("late_entry").notNull().default(false), // written on a later day
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("journal_entries_user_date_idx").on(t.userId, t.date)],
);

export type JournalEntry = typeof journalEntriesTable.$inferSelect;
""",
    "lib/db/src/schema/self-notes.ts": r"""import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

// Strengths, weaknesses, regrets, failures and confusions you want to understand and work on.
export const selfNotesTable = pgTable("self_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  kind: text("kind").notNull(), // "strength" | "weakness" | "regret" | "failure" | "confusion"
  title: text("title").notNull(),
  details: text("details"), // what it is / what happened
  insight: text("insight"), // evidence / what I learned / what I am unsure about
  action: text("action"), // what I will do about it
  status: text("status").notNull().default("open"), // "open" | "working" | "resolved"
  dueDate: text("due_date"), // YYYY-MM-DD, optional
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SelfNote = typeof selfNotesTable.$inferSelect;
""",
    "artifacts/api-server/src/routes/journal.ts": r"""import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, journalEntriesTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The table is created on first use, so no separate "db push" step is needed.
// It matches lib/db/src/schema/journal.ts exactly.
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (tableReady) return tableReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        date text NOT NULL,
        content text NOT NULL DEFAULT '',
        mood integer,
        word text,
        in_notebook boolean NOT NULL DEFAULT false,
        late_entry boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_user_date_idx
      ON journal_entries (user_id, date)
    `);
  })().catch((err: unknown) => {
    tableReady = null;
    throw err;
  });
  tableReady = created;
  return created;
}

router.use("/journal", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTable();
    next();
  } catch (err: any) {
    console.error("journal table error:", err?.message);
    res.status(500).json({ error: "Journal is not available right now." });
  }
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const entrySchema = z.object({
  content: z.string().max(50000).optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
  word: z.string().trim().max(40).nullable().optional(),
  inNotebook: z.boolean().optional(),
  lateEntry: z.boolean().optional(),
});

router.get("/journal/entries", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(journalEntriesTable)
    .where(eq(journalEntriesTable.userId, req.userId!))
    .orderBy(asc(journalEntriesTable.date));
  res.json(rows);
});

// Saves one day. A day with no text, no mood, no word and no notebook tick is removed.
router.put("/journal/entries/:date", async (req, res): Promise<void> => {
  const date = String(req.params.date);
  if (!DATE.test(date)) { res.status(400).json({ error: "Invalid date" }); return; }
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = req.userId!;
  const content = parsed.data.content ?? "";
  const mood = parsed.data.mood ?? null;
  const word = parsed.data.word?.trim() || null;
  const inNotebook = parsed.data.inNotebook ?? false;
  if (!content.trim() && mood === null && !word && !inNotebook) {
    await db.delete(journalEntriesTable).where(and(eq(journalEntriesTable.userId, userId), eq(journalEntriesTable.date, date)));
    res.json({ ok: true, cleared: true });
    return;
  }
  const [row] = await db
    .insert(journalEntriesTable)
    .values({ userId, date, content, mood, word, inNotebook, lateEntry: parsed.data.lateEntry ?? false })
    .onConflictDoUpdate({
      target: [journalEntriesTable.userId, journalEntriesTable.date],
      // keep "written late" once it was set
      set: { content, mood, word, inNotebook, lateEntry: sql`${journalEntriesTable.lateEntry} OR ${parsed.data.lateEntry ?? false}`, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

router.delete("/journal/entries/:date", async (req, res): Promise<void> => {
  const date = String(req.params.date);
  if (!DATE.test(date)) { res.status(400).json({ error: "Invalid date" }); return; }
  await db.delete(journalEntriesTable).where(and(eq(journalEntriesTable.userId, req.userId!), eq(journalEntriesTable.date, date)));
  res.sendStatus(204);
});

export default router;
""",
    "artifacts/api-server/src/routes/self-notes.ts": r"""import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, selfNotesTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The table is created on first use. It matches lib/db/src/schema/self-notes.ts exactly.
let tableReady: Promise<void> | null = null;
function ensureTable(): Promise<void> {
  if (tableReady) return tableReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS self_notes (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        kind text NOT NULL,
        title text NOT NULL,
        details text,
        insight text,
        action text,
        status text NOT NULL DEFAULT 'open',
        due_date text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  })().catch((err: unknown) => {
    tableReady = null;
    throw err;
  });
  tableReady = created;
  return created;
}

router.use("/myself", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTable();
    next();
  } catch (err: any) {
    console.error("self notes table error:", err?.message);
    res.status(500).json({ error: "Know Myself is not available right now." });
  }
});

const long = z.string().trim().max(3000).nullable().optional();
const noteSchema = z.object({
  kind: z.enum(["strength", "weakness", "regret", "failure", "confusion"]),
  title: z.string().trim().min(1).max(160),
  details: long,
  insight: long,
  action: long,
  status: z.enum(["open", "working", "resolved"]).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const clean = <T extends Record<string, unknown>>(o: T): T => {
  const out: Record<string, unknown> = { ...o };
  for (const k of ["details", "insight", "action"]) {
    if (typeof out[k] === "string" && !(out[k] as string).trim()) out[k] = null;
  }
  return out as T;
};

router.get("/myself/notes", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(selfNotesTable)
    .where(eq(selfNotesTable.userId, req.userId!))
    .orderBy(asc(selfNotesTable.id));
  res.json(rows);
});

router.post("/myself/notes", async (req, res): Promise<void> => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(selfNotesTable)
    .values({ ...clean(parsed.data), userId: req.userId! })
    .returning();
  res.status(201).json(row);
});

router.put("/myself/notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = noteSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(selfNotesTable)
    .set({ ...clean(parsed.data), updatedAt: new Date() })
    .where(and(eq(selfNotesTable.id, id), eq(selfNotesTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/myself/notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(selfNotesTable)
    .where(and(eq(selfNotesTable.id, id), eq(selfNotesTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

export default router;
""",
    "@APP/src/pages/NightJournal.tsx": r"""import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Moon, Flame, CalendarDays, ChevronLeft, ChevronRight, Check, Trash2, BookOpen, Sparkles, Clock, PenLine, Search, Save,
} from 'lucide-react';

/* ─── Types & helpers ───────────────────────────────────────────────────── */
interface Entry { id: number; date: string; content: string; mood: number | null; word: string | null; inNotebook: boolean; lateEntry: boolean; updatedAt?: string }
export const JOURNAL_KEY = ['journal-entries'];

const MOODS = [
  { v: 1, e: '😞', label: 'Rough' }, { v: 2, e: '😕', label: 'Low' }, { v: 3, e: '😐', label: 'Okay' },
  { v: 4, e: '🙂', label: 'Good' }, { v: 5, e: '😄', label: 'Great' },
];
const moodEmoji = (m: number | null) => MOODS.find(x => x.v === m)?.e ?? '';

const pad = (n: number) => String(n).padStart(2, '0');
const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return dstr(d); };
const longDate = (s: string) => parse(s).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDay = (s: string) => parse(s).toLocaleDateString(undefined, { weekday: 'short' });
const midDate = (s: string) => parse(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** A day counts as written if there is text, or you ticked "written in my notebook". */
export const isWritten = (e?: Entry) => !!e && (e.content.trim().length > 0 || e.inNotebook);

/** Streak ending today (or yesterday, if today is not written yet), and the longest streak ever. */
export function journalStreaks(written: Set<string>, today: string) {
  let cur = 0;
  let d = written.has(today) ? today : addDays(today, -1);
  while (written.has(d)) { cur++; d = addDays(d, -1); }
  const days = Array.from(written).sort();
  let best = 0, run = 0, prev = '';
  for (const x of days) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    if (run > best) best = run;
    prev = x;
  }
  return { current: cur, best };
}

/** Days in the last `n` days (not counting today) that have no entry, from your first entry onwards. */
export function missedDays(written: Set<string>, firstDate: string | null, today: string, n = 7) {
  if (!firstDate) return [] as string[];
  const out: string[] = [];
  for (let i = n; i >= 1; i--) {
    const d = addDays(today, -i);
    if (d >= firstDate && !written.has(d)) out.push(d);
  }
  return out;
}

/* ─── Editor for one day ────────────────────────────────────────────────── */
function DayEditor({ date, today, existing, onSave, onDelete, saving }: {
  date: string; today: string; existing?: Entry; saving: boolean;
  onSave: (b: { content: string; mood: number | null; word: string | null; inNotebook: boolean; lateEntry: boolean }) => void;
  onDelete: () => void;
}) {
  const [content, setContent] = useState(existing?.content ?? '');
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [word, setWord] = useState(existing?.word ?? '');
  const [inNotebook, setInNotebook] = useState(existing?.inNotebook ?? false);
  const dirty = content !== (existing?.content ?? '') || mood !== (existing?.mood ?? null) || word.trim() !== (existing?.word ?? '') || inNotebook !== (existing?.inNotebook ?? false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const isPast = date < today;
  const isFuture = date > today;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const empty = !content.trim() && mood === null && !word.trim() && !inNotebook;

  return (
    <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-6" data-testid="journal-editor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">{date === today ? 'Tonight' : isFuture ? 'Upcoming day' : 'Catching up'}</p>
          <h3 className="mt-1 font-heading text-xl font-bold text-[#17243D]" data-testid="journal-date">{longDate(date)}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {existing?.lateEntry && <span className="rounded-full bg-[#FDF8EB] px-2.5 py-1 text-[11px] font-semibold text-[#B8860B]">Written late</span>}
          {existing && isWritten(existing) && !dirty && <span className="inline-flex items-center gap-1 rounded-full bg-[#E1FAF3] px-2.5 py-1 text-[11px] font-semibold text-[#0F8F72]"><Check className="h-3 w-3" /> Saved</span>}
          {dirty && <span className="rounded-full bg-[#FBEEEE] px-2.5 py-1 text-[11px] font-semibold text-[#D95757]">Not saved yet</span>}
        </div>
      </div>

      <Textarea
        aria-label="Write about your day" value={content} onChange={e => setContent(e.target.value)} maxLength={50000}
        placeholder={isPast ? 'Write what you remember about this day…' : 'Write down all your thoughts from today…'}
        rows={12} style={{ minHeight: '16rem' }}
        className="mt-4 resize-y rounded-xl border-[#E3EAF0] bg-[#FBFDFE] p-4 text-[15px] leading-7 text-[#17243D]"
      />
      <p className="mt-1.5 text-right text-[11px] text-muted-foreground">{words} {words === 1 ? 'word' : 'words'}</p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">How was the day?</Label>
          <div className="mt-1.5 flex gap-1.5" role="radiogroup" aria-label="Mood">
            {MOODS.map(m => (
              <button key={m.v} type="button" role="radio" aria-checked={mood === m.v} aria-label={m.label} title={m.label}
                onClick={() => setMood(mood === m.v ? null : m.v)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-colors ${mood === m.v ? 'border-[#176B73] bg-[#DDF4F7]' : 'border-[#E3EAF0] bg-white hover:bg-[#F8FAFC]'}`}>
                {m.e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="journal-word" className="text-xs">One word for today</Label>
          <Input id="journal-word" className="mt-1.5" value={word} maxLength={40} autoComplete="off" placeholder="e.g. Grateful" onChange={e => setWord(e.target.value)} />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#E3EAF0] bg-[#F8FAFC] px-3.5 py-2.5 text-sm font-medium text-[#17243D]">
        <input type="checkbox" className="h-4 w-4 accent-[#176B73]" checked={inNotebook} onChange={e => setInNotebook(e.target.checked)} />
        <BookOpen className="h-4 w-4 text-[#176B73]" />
        I wrote this day in my paper notebook
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={saving || (empty && !existing)} onClick={() => onSave({ content, mood, word: word.trim() || null, inNotebook, lateEntry: !existing && isPast })}
          className="h-10 px-5 text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }}>
          <Save className="mr-1.5 h-4 w-4" /> {saving ? 'Saving…' : 'Save entry'}
        </Button>
        {existing && (
          <button type="button" onClick={() => { if (window.confirm(`Delete the entry for ${midDate(date)}?`)) onDelete(); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D95757] hover:underline">
            <Trash2 className="h-3.5 w-3.5" /> Delete this day
          </button>
        )}
      </div>
    </section>
  );
}

/* ─── Main tab ──────────────────────────────────────────────────────────── */
export function NightJournalTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = dstr(new Date());

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: JOURNAL_KEY,
    queryFn: () => api.getJournalEntries() as Promise<Entry[]>,
  });

  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);

  const byDate = useMemo(() => new Map(entries.map(e => [e.date, e])), [entries]);
  const written = useMemo(() => new Set(entries.filter(isWritten).map(e => e.date)), [entries]);
  const firstDate = useMemo(() => (entries.filter(isWritten).map(e => e.date).sort()[0] ?? null), [entries]);
  const streaks = useMemo(() => journalStreaks(written, today), [written, today]);
  const missed = useMemo(() => missedDays(written, firstDate, today, 7), [written, firstDate, today]);

  const monthKey = `${month.getFullYear()}-${pad(month.getMonth() + 1)}`;
  const writtenThisMonth = Array.from(written).filter(d => d.startsWith(monthKey)).length;

  async function check<T>(p: Promise<T>): Promise<T> {
    const r: any = await p;
    if (r && typeof r === 'object' && !Array.isArray(r) && 'error' in r) throw new Error(String(r.error));
    return r;
  }
  const save = useMutation({
    mutationFn: ({ date, body }: { date: string; body: Record<string, unknown> }) => check(api.saveJournalEntry(date, body)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: JOURNAL_KEY }); toast({ title: 'Saved to your journal' }); },
    onError: (err: unknown) => toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' }),
  });
  const remove = useMutation({
    mutationFn: (date: string) => api.deleteJournalEntry(date),
    onSuccess: () => qc.invalidateQueries({ queryKey: JOURNAL_KEY }),
  });

  /* calendar cells */
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${monthKey}-${pad(i + 1)}`)];

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -(6 - i)));

  const q = search.trim().toLowerCase();
  const list = useMemo(() => entries
    .filter(e => isWritten(e) && (!q || e.content.toLowerCase().includes(q) || (e.word ?? '').toLowerCase().includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date)), [entries, q]);

  const echoes = [
    { label: 'A week ago', date: addDays(today, -7) },
    { label: 'A month ago', date: addDays(today, -30) },
    { label: 'A year ago', date: addDays(today, -365) },
  ].map(x => ({ ...x, entry: byDate.get(x.date) })).filter(x => isWritten(x.entry));

  const statCards = [
    { label: 'Night streak', value: `${streaks.current}`, unit: streaks.current === 1 ? 'day' : 'days', icon: Flame, bg: '#FDF8EB', ink: '#B8860B' },
    { label: 'Best streak', value: `${streaks.best}`, unit: streaks.best === 1 ? 'day' : 'days', icon: Sparkles, bg: '#F2F0FF', ink: '#7C6CFF' },
    { label: 'This month', value: `${writtenThisMonth}`, unit: writtenThisMonth === 1 ? 'night' : 'nights', icon: CalendarDays, bg: '#DDF4F7', ink: '#176B73' },
    { label: 'Total entries', value: `${written.size}`, unit: '', icon: PenLine, bg: '#E1FAF3', ink: '#0F8F72' },
  ];

  return (
    <div className="space-y-5" data-testid="night-journal">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#E8EEF6] text-[#233B63] sm:h-20 sm:w-20"><Moon className="h-8 w-8 fill-[#A9DCE8]/50 sm:h-10 sm:w-10" /></span>
        <div>
          <h2 className="font-heading text-3xl font-bold leading-tight text-[#17243D]">Night Journal</h2>
          <p className="mt-1 text-sm text-[#475569]">Write down your thoughts before you sleep, and never lose a day.</p>
        </div>
      </div>

      {/* missed days alert */}
      {(missed.length > 0 || (!written.has(today) && firstDate !== null)) && (
        <div className="rounded-2xl border border-[#F2C75C]/60 bg-[#FDF8EB] p-4" data-testid="journal-missed">
          <p className="text-sm font-semibold text-[#17243D]">
            {missed.length > 0
              ? `${missed.length} ${missed.length === 1 ? 'day is' : 'days are'} missing from your journal.`
              : 'Tonight is still empty.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missed.map(d => (
              <button key={d} type="button" onClick={() => setSelected(d)} className="rounded-full border border-[#D95757]/30 bg-white px-3 py-1 text-xs font-semibold text-[#D95757] hover:bg-[#FBEEEE]">
                {shortDay(d)} {parse(d).getDate()} · write it
              </button>
            ))}
            {!written.has(today) && (
              <button type="button" onClick={() => setSelected(today)} className="rounded-full bg-[#233B63] px-3 py-1 text-xs font-semibold text-white hover:bg-[#17243D]">Write tonight</button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(s => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-2xl border border-[#E3EAF0] bg-white p-3 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:gap-4 sm:p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14" style={{ backgroundColor: s.bg, color: s.ink }}><s.icon className="h-4 w-4 sm:h-6 sm:w-6" /></span>
            <div className="min-w-0">
              <p className="whitespace-nowrap font-heading text-xl font-bold leading-none text-[#17243D] sm:text-[1.7rem]">{s.value}{s.unit && <span className="ml-1.5 text-sm font-semibold text-[#64748B]">{s.unit}</span>}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {isLoading
            ? <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            : <DayEditor key={selected} date={selected} today={today} existing={byDate.get(selected)} saving={save.isPending}
                onSave={body => save.mutate({ date: selected, body })} onDelete={() => remove.mutate(selected)} />}

          <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-6" data-testid="journal-list">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-heading text-base font-bold text-[#17243D]">Past entries</h3>
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search entries" value={search} onChange={e => { setSearch(e.target.value); setLimit(10); }} placeholder="Search your thoughts…" className="h-9 w-56 pl-9 text-sm" />
              </label>
            </div>
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{q ? 'Nothing matches that search.' : 'Your written days will appear here.'}</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#EEF2F6]">
                {list.slice(0, limit).map(e => (
                  <li key={e.date}>
                    <button type="button" onClick={() => { setSelected(e.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex w-full items-start gap-3 py-3 text-left hover:bg-[#F8FAFC]">
                      <span className="mt-0.5 w-6 shrink-0 text-center text-lg">{moodEmoji(e.mood) || '📓'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#17243D]">
                          {midDate(e.date)}
                          {e.word && <span className="rounded-md bg-[#DDF4F7] px-1.5 py-0.5 text-[10px] font-bold text-[#176B73]">{e.word}</span>}
                          {e.inNotebook && <span className="rounded-md bg-[#F2F0FF] px-1.5 py-0.5 text-[10px] font-bold text-[#6A5CE0]">Paper notebook</span>}
                          {e.lateEntry && <span className="rounded-md bg-[#FDF8EB] px-1.5 py-0.5 text-[10px] font-bold text-[#B8860B]">Late</span>}
                        </span>
                        {e.content.trim() && <span className="mt-0.5 line-clamp-2 block break-words text-xs leading-5 text-[#475569]">{e.content}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {list.length > limit && <button type="button" onClick={() => setLimit(l => l + 10)} className="mt-2 text-xs font-semibold text-[#176B73] hover:underline">Show more</button>}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-2">
          <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)]" data-testid="journal-week">
            <h3 className="mb-3 font-heading text-sm font-bold text-[#17243D]">Last 7 days</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {last7.map(d => {
                const w = written.has(d); const isToday = d === today;
                const miss = !w && !isToday && firstDate !== null && d >= firstDate;
                return (
                  <button key={d} type="button" onClick={() => setSelected(d)} aria-label={`${longDate(d)}${w ? ', written' : miss ? ', missing' : ''}`}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-semibold transition-colors ${selected === d ? 'ring-2 ring-[#176B73]/40' : ''} ${w ? 'border-[#19C7B7]/40 bg-[#E1FAF3] text-[#0F8F72]' : miss ? 'border-[#D95757]/30 bg-[#FBEEEE] text-[#D95757]' : 'border-[#E3EAF0] bg-white text-[#64748B]'}`}>
                    {shortDay(d).slice(0, 3)}
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]">{w ? <Check className="h-3.5 w-3.5" /> : parse(d).getDate()}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)]" data-testid="journal-calendar">
            <div className="mb-3 flex items-center justify-between">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-1.5 hover:bg-[#F1F5F9]"><ChevronLeft className="h-4 w-4" /></button>
              <h3 className="font-heading text-sm font-bold text-[#17243D]">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
              <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-1.5 hover:bg-[#F1F5F9]"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const w = written.has(d); const entry = byDate.get(d);
                const future = d > today;
                const miss = !w && d < today && firstDate !== null && d >= firstDate;
                return (
                  <button key={d} type="button" disabled={future} onClick={() => setSelected(d)} aria-label={longDate(d)}
                    className={`relative flex aspect-square items-center justify-center rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-35 ${selected === d ? 'ring-2 ring-[#176B73]/50' : ''} ${d === today ? 'border border-[#176B73]' : ''} ${w ? 'bg-[#19C7B7] text-white' : miss ? 'bg-[#FBEEEE] text-[#D95757]' : 'bg-[#F4F7FA] text-[#475569]'}`}>
                    {parse(d).getDate()}
                    {entry?.lateEntry && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[#F2C75C]" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#19C7B7]" />Written</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-[#FBEEEE] ring-1 ring-[#D95757]/30" />Missing</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F2C75C]" />Written late</span>
            </p>
          </section>

          {echoes.length > 0 && (
            <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)]" data-testid="journal-echoes">
              <h3 className="mb-2 flex items-center gap-2 font-heading text-sm font-bold text-[#17243D]"><Clock className="h-4 w-4 text-[#176B73]" /> Looking back</h3>
              <ul className="space-y-2">
                {echoes.map(x => (
                  <li key={x.label}>
                    <button type="button" onClick={() => setSelected(x.date)} className="w-full rounded-xl bg-[#F8FAFC] p-3 text-left hover:bg-[#EEF3FA]">
                      <p className="text-[11px] font-bold text-[#176B73]">{x.label}</p>
                      <p className="mt-0.5 line-clamp-3 break-words text-xs leading-5 text-[#475569]">{x.entry!.content.trim() || 'Written in your paper notebook.'}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
""",
    "@APP/src/pages/KnowMyself.tsx": r"""import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Brain, Dumbbell, Target, RotateCcw, TriangleAlert, CircleHelp, Plus, Pencil, Trash2, Check, ChevronDown, ChevronUp, Send, CalendarDays, Lightbulb,
} from 'lucide-react';

/* ─── Types & constants ─────────────────────────────────────────────────── */
type Kind = 'strength' | 'weakness' | 'regret' | 'failure' | 'confusion';
type Status = 'open' | 'working' | 'resolved';
interface Note {
  id: number; kind: Kind; title: string; details: string | null; insight: string | null; action: string | null;
  status: Status; dueDate: string | null; createdAt: string; updatedAt: string;
}
const NOTES_KEY = ['self-notes'];

const KINDS: Record<Kind, {
  plural: string; single: string; bg: string; ink: string; icon: React.ComponentType<{ className?: string }>;
  details: string; insight: string; action: string; hint: string;
  statuses: [string, string, string] | null;
}> = {
  strength: { plural: 'Strengths', single: 'Strength', bg: '#E1FAF3', ink: '#0F8F72', icon: Dumbbell, details: 'What is it?', insight: 'Evidence: when did I show it?', action: 'How will I use it more?', hint: 'e.g. I stay calm under pressure', statuses: null },
  weakness: { plural: 'Weaknesses', single: 'Weakness', bg: '#FDF8EB', ink: '#B8860B', icon: Target, details: 'What is it?', insight: 'Why does it happen?', action: 'How will I improve it?', hint: 'e.g. I delay starting hard tasks', statuses: ['To work on', 'In progress', 'Worked on'] },
  regret: { plural: 'Regrets', single: 'Regret', bg: '#F2F0FF', ink: '#6A5CE0', icon: RotateCcw, details: 'What happened?', insight: 'What did I learn?', action: 'What will I do differently?', hint: 'e.g. I did not study enough last term', statuses: ['To work on', 'In progress', 'Worked on'] },
  failure: { plural: 'Failures', single: 'Failure', bg: '#FBEEEE', ink: '#D95757', icon: TriangleAlert, details: 'What happened?', insight: 'What did I learn?', action: 'What will I do differently?', hint: 'e.g. I missed a scholarship deadline', statuses: ['To work on', 'In progress', 'Worked on'] },
  confusion: { plural: 'Confusions', single: 'Confusion', bg: '#E8EEF6', ink: '#233B63', icon: CircleHelp, details: 'What am I confused about?', insight: 'What do I know so far?', action: 'How will I find out?', hint: 'e.g. Am I better at research or coding?', statuses: ['Unsure', 'Testing', 'Understood'] },
};
const KIND_ORDER: Kind[] = ['strength', 'weakness', 'regret', 'failure', 'confusion'];
const STATUS_ORDER: Status[] = ['open', 'working', 'resolved'];

const pad = (n: number) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const niceDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
const REVIEW_AFTER_DAYS = 7;

/** Counts for the stat cards. */
export function selfStats(notes: Note[]) {
  const work = notes.filter(n => n.kind !== 'strength');
  return {
    strengths: notes.filter(n => n.kind === 'strength').length,
    open: work.filter(n => n.status === 'open').length,
    working: work.filter(n => n.status === 'working').length,
    resolved: work.filter(n => n.status === 'resolved').length,
  };
}

/** The oldest unresolved item that has not been touched for a week, for the "still true?" review. */
export function pickReview(notes: Note[], now = Date.now()): Note | null {
  const cutoff = now - REVIEW_AFTER_DAYS * 86400000;
  const due = notes
    .filter(n => n.kind !== 'strength' && n.status !== 'resolved' && new Date(n.updatedAt).getTime() < cutoff)
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  return due[0] ?? null;
}

type FormState = { kind: Kind; title: string; details: string; insight: string; action: string; dueDate: string; status: Status };
const BLANK: FormState = { kind: 'strength', title: '', details: '', insight: '', action: '', dueDate: '', status: 'open' };

function NoteForm({ initial, submitLabel, saving, onSubmit, idPrefix }: {
  initial: FormState; submitLabel: string; saving: boolean; onSubmit: (f: FormState) => void; idPrefix: string;
}) {
  const [f, setF] = useState<FormState>(initial);
  useEffect(() => { setF(initial); }, [initial]);
  const set = (p: Partial<FormState>) => setF(prev => ({ ...prev, ...p }));
  const k = KINDS[f.kind];
  return (
    <form className="space-y-3.5" onSubmit={e => { e.preventDefault(); if (f.title.trim()) onSubmit(f); }}>
      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
          {KIND_ORDER.map(key => {
            const c = KINDS[key]; const on = f.kind === key;
            return (
              <button key={key} type="button" role="radio" aria-checked={on} onClick={() => set({ kind: key })}
                className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={on ? { backgroundColor: c.bg, color: c.ink, borderColor: c.ink } : { backgroundColor: '#fff', color: '#64748B', borderColor: '#E3EAF0' }}>
                {c.single}
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`} className="text-xs">Title *</Label>
        <Input id={`${idPrefix}-title`} value={f.title} maxLength={160} autoComplete="off" placeholder={k.hint} onChange={e => set({ title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-details`} className="text-xs">{k.details}</Label>
        <Textarea id={`${idPrefix}-details`} rows={3} value={f.details} maxLength={3000} onChange={e => set({ details: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-insight`} className="text-xs">{k.insight}</Label>
        <Textarea id={`${idPrefix}-insight`} rows={3} value={f.insight} maxLength={3000} onChange={e => set({ insight: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-action`} className="text-xs">{k.action}</Label>
        <Textarea id={`${idPrefix}-action`} rows={2} value={f.action} maxLength={3000} onChange={e => set({ action: e.target.value })} />
      </div>
      {f.action.trim() && (
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-due`} className="text-xs">Do it by (optional)</Label>
          <Input id={`${idPrefix}-due`} type="date" value={f.dueDate} onChange={e => set({ dueDate: e.target.value })} />
        </div>
      )}
      <Button type="submit" disabled={!f.title.trim() || saving} className="h-10 w-full text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }}>
        <Send className="mr-1.5 h-4 w-4" /> {saving ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

/* ─── Main tab ──────────────────────────────────────────────────────────── */
export function KnowMyselfTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: NOTES_KEY,
    queryFn: () => api.getSelfNotes() as Promise<Note[]>,
  });

  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Note | null>(null);
  const [seed, setSeed] = useState<{ n: number; form: FormState }>({ n: 0, form: BLANK });

  async function check<T>(p: Promise<T>): Promise<T> {
    const r: any = await p;
    if (r && typeof r === 'object' && !Array.isArray(r) && 'error' in r) throw new Error(String(r.error));
    return r;
  }
  const fail = (err: unknown) => toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });

  const addNote = useMutation({
    mutationFn: (b: Record<string, unknown>) => check(api.addSelfNote(b)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: NOTES_KEY }); toast({ title: 'Saved' }); },
    onError: fail,
  });
  const updateNote = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => check(api.updateSelfNote(id, body)),
    onMutate: async ({ id, body }: { id: number; body: Record<string, unknown> }) => {
      await qc.cancelQueries({ queryKey: NOTES_KEY });
      const prev = qc.getQueryData<Note[]>(NOTES_KEY);
      qc.setQueryData<Note[]>(NOTES_KEY, (old = []) => old.map(n => (n.id === id ? ({ ...n, ...body, updatedAt: new Date().toISOString() } as Note) : n)));
      return { prev };
    },
    onError: (err, _v, ctx) => { if (ctx?.prev) qc.setQueryData(NOTES_KEY, ctx.prev); fail(err); },
    onSettled: () => { qc.invalidateQueries({ queryKey: NOTES_KEY }); },
  });
  const removeNote = useMutation({
    mutationFn: (id: number) => api.deleteSelfNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTES_KEY }),
    onError: fail,
  });

  const stats = useMemo(() => selfStats(notes), [notes]);
  const review = useMemo(() => pickReview(notes), [notes]);
  const today = todayStr();

  const shown = useMemo(() => notes
    .filter(n => filter === 'all' || n.kind === filter)
    .sort((a, b) => {
      const ra = a.status === 'resolved' ? 1 : 0, rb = b.status === 'resolved' ? 1 : 0;
      if (ra !== rb) return ra - rb;
      const da = a.dueDate && a.status !== 'resolved' ? a.dueDate : '9999', db = b.dueDate && b.status !== 'resolved' ? b.dueDate : '9999';
      if (da !== db) return da.localeCompare(db);
      return b.id - a.id;
    }), [notes, filter]);

  function payload(f: FormState) {
    return { kind: f.kind, title: f.title.trim(), details: f.details.trim() || null, insight: f.insight.trim() || null, action: f.action.trim() || null, dueDate: f.action.trim() && f.dueDate ? f.dueDate : null };
  }
  function submitNew(f: FormState) {
    addNote.mutate({ ...payload(f), status: 'open' }, { onSuccess: () => setSeed(s => ({ n: s.n + 1, form: { ...BLANK, kind: f.kind } })) });
  }
  function submitEdit(f: FormState) {
    if (!editing) return;
    updateNote.mutate({ id: editing.id, body: payload(f) }, { onSuccess: () => setEditing(null) });
  }
  function startEntry(kind: Kind) {
    setSeed(s => ({ n: s.n + 1, form: { ...BLANK, kind } }));
    const el = document.getElementById('self-new-title');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLInputElement).focus(); }
  }
  const toggleOpen = (id: number) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const statCards = [
    { label: 'Strengths', value: stats.strengths, icon: Dumbbell, bg: '#E1FAF3', ink: '#0F8F72' },
    { label: 'To work on', value: stats.open, icon: Target, bg: '#FDF8EB', ink: '#B8860B' },
    { label: 'In progress', value: stats.working, icon: RotateCcw, bg: '#F2F0FF', ink: '#7C6CFF' },
    { label: 'Worked on', value: stats.resolved, icon: Check, bg: '#DDF4F7', ink: '#176B73' },
  ];

  return (
    <div className="space-y-5" data-testid="know-myself">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#F2F0FF] text-[#7C6CFF] sm:h-20 sm:w-20"><Brain className="h-8 w-8 sm:h-10 sm:w-10" /></span>
        <div>
          <h2 className="font-heading text-3xl font-bold leading-tight text-[#17243D]">Know Myself</h2>
          <p className="mt-1 text-sm text-[#475569]">Notice your strengths, learn from regrets and failures, and clear your confusions.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(s => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-2xl border border-[#E3EAF0] bg-white p-3 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:gap-4 sm:p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14" style={{ backgroundColor: s.bg, color: s.ink }}><s.icon className="h-4 w-4 sm:h-6 sm:w-6" /></span>
            <div className="min-w-0">
              <p className="whitespace-nowrap font-heading text-xl font-bold leading-none text-[#17243D] sm:text-[1.7rem]">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {review && (
        <div className="rounded-2xl border border-[#A9DCE8] bg-[#DDF4F7] p-4" data-testid="self-review">
          <p className="flex items-center gap-2 text-sm font-bold text-[#17243D]"><Lightbulb className="h-4 w-4 text-[#B8860B]" /> Time to revisit: is this still true?</p>
          <p className="mt-2 text-sm font-semibold text-[#176B73]">{KINDS[review.kind].single}: {review.title}</p>
          {review.action && <p className="mt-1 text-xs text-[#475569]">Plan: {review.action}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="bg-[#233B63] text-white hover:bg-[#17243D]" onClick={() => updateNote.mutate({ id: review.id, body: { status: review.status } })}>Still true</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => updateNote.mutate({ id: review.id, body: { status: 'resolved' } })}>Mark as {KINDS[review.kind].statuses?.[2].toLowerCase()}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(review)}>Edit</Button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19.5rem]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter">
            {(['all', ...KIND_ORDER] as const).map(key => {
              const on = filter === key;
              const count = key === 'all' ? notes.length : notes.filter(n => n.kind === key).length;
              return (
                <button key={key} type="button" role="tab" aria-selected={on} onClick={() => setFilter(key)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${on ? 'border-[#233B63] bg-[#233B63] text-white' : 'border-[#E3EAF0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}>
                  {key === 'all' ? 'All' : KINDS[key].plural} <span className={on ? 'text-white/70' : 'text-muted-foreground'}>{count}</span>
                </button>
              );
            })}
          </div>

          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && shown.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#D9E3E9] bg-white px-6 py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F0FF] text-[#7C6CFF]"><Brain className="h-6 w-6" /></span>
              <p className="mt-3 font-heading text-base font-bold text-[#17243D]">{notes.length === 0 ? 'Start with one honest line' : 'Nothing here yet'}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Write a strength you trust, a regret you carry, a failure you learned from, or something you are unsure about.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {KIND_ORDER.map(k => <Button key={k} type="button" size="sm" variant="outline" onClick={() => startEntry(k)}><Plus className="mr-1 h-3.5 w-3.5" /> {KINDS[k].single}</Button>)}
              </div>
            </div>
          )}

          <ul className="space-y-3" data-testid="self-list">
            {shown.map(n => {
              const k = KINDS[n.kind]; const Icon = k.icon; const isOpen = open.has(n.id);
              const overdue = !!n.dueDate && n.status !== 'resolved' && n.dueDate < today;
              return (
                <li key={n.id} data-testid={`self-note-${n.title}`} className={`rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] ${n.status === 'resolved' ? 'opacity-80' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: k.bg, color: k.ink }}><Icon className="h-5 w-5" /></span>
                    <button type="button" onClick={() => toggleOpen(n.id)} aria-expanded={isOpen} className="min-w-0 flex-1 text-left">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: k.bg, color: k.ink }}>{k.single}</span>
                        {n.dueDate && n.action && <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${overdue ? 'text-[#D95757]' : 'text-[#64748B]'}`}><CalendarDays className="h-3 w-3" /> {overdue ? 'Overdue · ' : ''}{niceDate(n.dueDate)}</span>}
                      </span>
                      <span className={`mt-1 block text-[15px] font-semibold leading-snug text-[#17243D] ${n.status === 'resolved' ? 'line-through decoration-[#94A3B8]' : ''}`}>{n.title}</span>
                    </button>
                    <button type="button" onClick={() => toggleOpen(n.id)} aria-label={isOpen ? 'Hide details' : 'Show details'} className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-[#F1F5F9]">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {k.statuses && (
                    <div className="mt-3 flex gap-1 rounded-lg bg-[#F1F5F9] p-0.5" role="radiogroup" aria-label="Status">
                      {STATUS_ORDER.map((s, i) => (
                        <button key={s} type="button" role="radio" aria-checked={n.status === s} onClick={() => n.status !== s && updateNote.mutate({ id: n.id, body: { status: s } })}
                          className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${n.status === s ? 'bg-white text-[#176B73] shadow-sm' : 'text-muted-foreground hover:text-[#17243D]'}`}>
                          {k.statuses![i]}
                        </button>
                      ))}
                    </div>
                  )}

                  {isOpen && (
                    <div className="mt-3 space-y-3 rounded-xl bg-[#F8FAFC] p-3.5 text-sm" data-testid="self-details">
                      {n.details && <div><p className="text-xs font-bold text-[#17243D]">{k.details}</p><p className="mt-0.5 whitespace-pre-wrap break-words text-[#475569]">{n.details}</p></div>}
                      {n.insight && <div><p className="text-xs font-bold text-[#17243D]">{k.insight}</p><p className="mt-0.5 whitespace-pre-wrap break-words text-[#475569]">{n.insight}</p></div>}
                      {n.action && <div><p className="text-xs font-bold text-[#17243D]">{k.action}</p><p className="mt-0.5 whitespace-pre-wrap break-words text-[#475569]">{n.action}</p></div>}
                      {!n.details && !n.insight && !n.action && <p className="text-xs text-muted-foreground">No details yet. Use Edit to add them.</p>}
                      <div className="flex gap-4 border-t border-[#E3EAF0] pt-2.5 text-xs font-semibold">
                        <button type="button" onClick={() => setEditing(n)} className="inline-flex items-center gap-1 text-[#176B73] hover:underline"><Pencil className="h-3 w-3" /> Edit</button>
                        <button type="button" onClick={() => { if (window.confirm(`Delete "${n.title}"?`)) removeNote.mutate(n.id); }} className="inline-flex items-center gap-1 text-[#D95757] hover:underline"><Trash2 className="h-3 w-3" /> Delete</button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <aside className="lg:sticky lg:top-2" data-testid="self-add-card">
          <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-[#17243D]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#233B63] text-white"><Plus className="h-4 w-4" /></span> Add a note
            </h3>
            <NoteForm key={seed.n} initial={seed.form} submitLabel="Save note" saving={addNote.isPending} onSubmit={submitNew} idPrefix="self-new" />
          </section>
        </aside>
      </div>

      <Dialog open={editing !== null} onOpenChange={o => { if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Edit note</DialogTitle></DialogHeader>
          {editing && (
            <NoteForm
              initial={{ kind: editing.kind, title: editing.title, details: editing.details ?? '', insight: editing.insight ?? '', action: editing.action ?? '', dueDate: editing.dueDate ?? '', status: editing.status }}
              submitLabel="Save changes" saving={updateNote.isPending} onSubmit={submitEdit} idPrefix="self-edit"
            />
          )}
        </DialogContent>
      </Dialog>
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
    sys.exit("Run this from the project root:  python3 add_journal_and_self.py artifacts/ielts-tracker")

# 1. new files
for rel, body in FILES.items():
    rel = rel.replace("@APP", os.path.relpath(APP, ROOT).replace(os.sep, "/"))
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and read(path) == body:
        print("already:", rel)
    else:
        write(path, body); print("ok     :", rel)

# 2. database schema exports
edit("lib/db/src/schema/index.ts", [
    ("db schema export (journal)", 'export * from "./journal";',
     after_line(r'export \* from "\./planning-notes";', 'export * from "./journal";\n')),
    ("db schema export (self notes)", 'export * from "./self-notes";',
     after_line(r'export \* from "\./planning-notes";', 'export * from "./self-notes";\n')),
])

# 3. api routes
edit("artifacts/api-server/src/routes/index.ts", [
    ("api import (journal)", 'import journalRouter from',
     after_line(r'import planningNotesRouter from', 'import journalRouter from "./journal";\n')),
    ("api import (self notes)", 'import selfNotesRouter from',
     after_line(r'import planningNotesRouter from', 'import selfNotesRouter from "./self-notes";\n')),
    ("api use (journal)", 'router.use(journalRouter);',
     after_line(r'router\.use\(planningNotesRouter\);', 'router.use(journalRouter);\n')),
    ("api use (self notes)", 'router.use(selfNotesRouter);',
     after_line(r'router\.use\(planningNotesRouter\);', 'router.use(selfNotesRouter);\n')),
])

# 4. front-end api client
edit(os.path.join(APP, "src/lib/api.ts"), [
    ("api client (journal)", "getJournalEntries:", after_line(r'  deletePlanningNote:',
        "  getJournalEntries: () => getList('/api/journal/entries'),\n"
        "  saveJournalEntry: (date: string, body: Record<string, unknown>) => put(`/api/journal/entries/${date}`, body),\n"
        "  deleteJournalEntry: (date: string) => del(`/api/journal/entries/${date}`),\n")),
    ("api client (self notes)", "getSelfNotes:", after_line(r'  deletePlanningNote:',
        "  getSelfNotes: () => getList('/api/myself/notes'),\n"
        "  addSelfNote: (body: Record<string, unknown>) => post('/api/myself/notes', body),\n"
        "  updateSelfNote: (id: number, body: Record<string, unknown>) => put(`/api/myself/notes/${id}`, body),\n"
        "  deleteSelfNote: (id: number) => del(`/api/myself/notes/${id}`),\n")),
])

# 5. sidebar tabs + icons
def add_tab_type(s):
    m = re.search(r"(type FlyTab\s*=\s*)([^;]+);", s)
    if not m or s.count("type FlyTab") != 1:
        return None
    return s[:m.end(2)] + " | 'journal' | 'myself'" + s[m.end(2):]
edit(os.path.join(APP, "src/App.tsx"), [
    ("icons", "JournalMoon",
     after_line(r"\} from 'lucide-react';", "import { Moon as JournalMoon, Brain as SelfBrain } from 'lucide-react';\n")),
    ("tab type", "| 'journal'", add_tab_type),
    ("sidebar item (journal)", "id: 'journal'",
     before_line(r"  \{ id: 'notepad'", "  { id: 'journal',      label: 'Night Journal', icon: JournalMoon },\n")),
    ("sidebar item (know myself)", "id: 'myself'",
     before_line(r"  \{ id: 'notepad'", "  { id: 'myself',       label: 'Know Myself',   icon: SelfBrain },\n")),
])

# 6. render the tabs
edit(os.path.join(APP, "src/pages/HigherStudyPrep.tsx"), [
    ("page import (journal)", "import { NightJournalTab }",
     after_line(r"import React", "import { NightJournalTab } from '@/pages/NightJournal';\n")),
    ("page import (self)", "import { KnowMyselfTab }",
     after_line(r"import React", "import { KnowMyselfTab } from '@/pages/KnowMyself';\n")),
    ("page render (journal)", "<NightJournalTab />",
     before_line(r"      \{tab === 'templates'", "      {tab === 'journal'      && <NightJournalTab />}\n")),
    ("page render (self)", "<KnowMyselfTab />",
     before_line(r"      \{tab === 'templates'", "      {tab === 'myself'       && <KnowMyselfTab />}\n")),
])

# 7. homepage banner
BANNER_QUERIES = """  const { data: homeJournal = [], isSuccess: homeJournalReady } = useQuery({ queryKey: ['journal-entries'], queryFn: api.getJournalEntries });
  const homeJournalDays = new Set((homeJournal as any[]).filter(e => (e.content || '').trim() || e.inNotebook).map(e => e.date as string));
  const homeJournalFirst = Array.from(homeJournalDays).sort()[0] ?? null;
  const homeJournalToday = localDateStr(new Date());
  const homeJournalMissed: string[] = [];
  if (homeJournalFirst) {
    for (let i = 7; i >= 1; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = localDateStr(d);
      if (ds >= homeJournalFirst && !homeJournalDays.has(ds)) homeJournalMissed.push(ds);
    }
  }
  const homeJournalTonight = new Date().getHours() >= 18 && !homeJournalDays.has(homeJournalToday);
  const showJournalBanner = homeJournalReady && (homeJournalMissed.length > 0 || homeJournalTonight);
"""
BANNER_JSX = """          {showJournalBanner && (
            <button onClick={() => setLocation('/fly/journal')} className="land-card land-link mb-4 flex w-full items-center gap-3 rounded-[22px] border border-[#F2C75C]/60 bg-[#FDF8EB] px-4 py-3 text-left sm:px-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#233B63]"><JournalMoon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-[#17243D]">{homeJournalMissed.length > 0 ? `Your journal is missing ${homeJournalMissed.length} ${homeJournalMissed.length === 1 ? 'day' : 'days'}` : 'Tonight is still empty'}</span>
                <span className="block text-[11px] text-[#64748B]">{homeJournalMissed.length > 0 ? 'Open the Night Journal and write them while you remember.' : 'Write your thoughts before you sleep.'}</span>
              </span>
              <span className="shrink-0 rounded-full bg-[#233B63] px-3.5 py-1.5 text-[11px] font-semibold text-white">Write now</span>
            </button>
          )}
"""
edit(os.path.join(APP, "src/App.tsx"), [
    ("home journal data", "homeJournalReady",
     after_line(r"  const \{ data: practiceLogs = \[\] \}", BANNER_QUERIES)),
    ("home journal banner", "showJournalBanner && (",
     before_line(r'          <div className="grid grid-cols-1 lg:grid-cols-\[1fr_1fr_\.82fr\] gap-4 sm:gap-5">', BANNER_JSX)),
])

print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your files differ from what I expected):")
    for x in problems:
        print("  -", x)
    sys.exit(1)
print("All edits applied.")
