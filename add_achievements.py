#!/usr/bin/env python3
"""Fly: add the "Achievements & Goals" section.
A timeline of years (past = achievements, current = in progress, next = wishlist). Each entry has a
title, category, description, why it matters and major purpose, and can be ticked as achieved.
Each year also has its own title and a "Why it matters / Major purpose" reflection.
Stat cards, filters (year / category), Insights (growth, best year), copy-a-year-as-text.
Two new database tables are created automatically on first use.
Safe to run twice.   Usage (project root):  python3 add_achievements.py artifacts/ielts-tracker
"""
import os, re, sys

APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
ROOT = os.path.abspath(os.path.join(APP, "..", ".."))
problems = []

FILES = {
    "lib/db/src/schema/achievements.ts": r"""import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// One row per achievement or goal ("wishlist") on your timeline.
export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  year: integer("year").notNull(),
  kind: text("kind").notNull().default("achievement"), // "achievement" | "goal"
  title: text("title").notNull(),
  description: text("description"),
  why: text("why"), // why it matters / why you achieved it
  purpose: text("purpose"), // the major purpose behind it
  category: text("category"),
  done: boolean("done").notNull().default(false),
  doneDate: text("done_date"), // YYYY-MM-DD, set when a goal is ticked as achieved
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Optional note for a whole year: a title, a subtitle and your reflection.
export const achievementYearsTable = pgTable(
  "achievement_years",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    year: integer("year").notNull(),
    title: text("title"),
    subtitle: text("subtitle"),
    why: text("why"),
    purpose: text("purpose"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("achievement_years_user_year_idx").on(t.userId, t.year)],
);

export type Achievement = typeof achievementsTable.$inferSelect;
export type AchievementYear = typeof achievementYearsTable.$inferSelect;
""",
    "artifacts/api-server/src/routes/achievements.ts": r"""import { Router, type IRouter } from "express";
import { eq, and, asc, sql } from "drizzle-orm";
import { db, achievementsTable, achievementYearsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// The tables are created on first use, so no separate "db push" step is needed.
// They match lib/db/src/schema/achievements.ts exactly.
let tablesReady: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (tablesReady) return tablesReady;
  const created: Promise<void> = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        year integer NOT NULL,
        kind text NOT NULL DEFAULT 'achievement',
        title text NOT NULL,
        description text,
        why text,
        purpose text,
        category text,
        done boolean NOT NULL DEFAULT false,
        done_date text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS achievement_years (
        id serial PRIMARY KEY,
        user_id integer NOT NULL,
        year integer NOT NULL,
        title text,
        subtitle text,
        why text,
        purpose text,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS achievement_years_user_year_idx
      ON achievement_years (user_id, year)
    `);
  })().catch((err: unknown) => {
    tablesReady = null;
    throw err;
  });
  tablesReady = created;
  return created;
}

router.use("/achievements", requireAuth, async (_req, res, next): Promise<void> => {
  try {
    await ensureTables();
    next();
  } catch (err: any) {
    console.error("achievements table error:", err?.message);
    res.status(500).json({ error: "Achievements is not available right now." });
  }
});

/* ── items ───────────────────────────────────────────────────────────────── */
const text1000 = z.string().trim().max(1000).nullable().optional();
const itemSchema = z.object({
  year: z.number().int().min(1990).max(2100),
  kind: z.enum(["achievement", "goal"]),
  title: z.string().trim().min(1).max(160),
  description: text1000,
  why: text1000,
  purpose: text1000,
  category: z.string().trim().max(30).nullable().optional(),
  done: z.boolean().optional(),
  doneDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// empty strings are stored as null
const clean = <T extends Record<string, unknown>>(o: T): T => {
  const out: Record<string, unknown> = { ...o };
  for (const k of ["description", "why", "purpose", "category"]) {
    if (typeof out[k] === "string" && !(out[k] as string).trim()) out[k] = null;
  }
  return out as T;
};

router.get("/achievements/items", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(achievementsTable)
    .where(eq(achievementsTable.userId, req.userId!))
    .orderBy(asc(achievementsTable.year), asc(achievementsTable.id));
  res.json(rows);
});

router.post("/achievements/items", async (req, res): Promise<void> => {
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = clean(parsed.data);
  const [row] = await db
    .insert(achievementsTable)
    .values({ ...data, done: data.done ?? data.kind === "achievement", userId: req.userId! })
    .returning();
  res.status(201).json(row);
});

router.put("/achievements/items/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(achievementsTable)
    .set(clean(parsed.data))
    .where(and(eq(achievementsTable.id, id), eq(achievementsTable.userId, req.userId!)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

router.delete("/achievements/items/:id", async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deleted] = await db
    .delete(achievementsTable)
    .where(and(eq(achievementsTable.id, id), eq(achievementsTable.userId, req.userId!)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

/* ── year notes ──────────────────────────────────────────────────────────── */
const yearSchema = z.object({
  title: z.string().trim().max(80).nullable().optional(),
  subtitle: z.string().trim().max(120).nullable().optional(),
  why: text1000,
  purpose: text1000,
});

router.get("/achievements/years", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(achievementYearsTable)
    .where(eq(achievementYearsTable.userId, req.userId!))
    .orderBy(asc(achievementYearsTable.year));
  res.json(rows);
});

// Saves the note for one year. If every field is empty the note is removed.
router.put("/achievements/years/:year", async (req, res): Promise<void> => {
  const year = parseInt(String(req.params.year), 10);
  if (isNaN(year) || year < 1990 || year > 2100) { res.status(400).json({ error: "Invalid year" }); return; }
  const parsed = yearSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const v = {
    title: parsed.data.title?.trim() || null,
    subtitle: parsed.data.subtitle?.trim() || null,
    why: parsed.data.why?.trim() || null,
    purpose: parsed.data.purpose?.trim() || null,
  };
  const userId = req.userId!;
  if (!v.title && !v.subtitle && !v.why && !v.purpose) {
    await db
      .delete(achievementYearsTable)
      .where(and(eq(achievementYearsTable.userId, userId), eq(achievementYearsTable.year, year)));
    res.json({ ok: true, cleared: true });
    return;
  }
  const [row] = await db
    .insert(achievementYearsTable)
    .values({ userId, year, ...v })
    .onConflictDoUpdate({
      target: [achievementYearsTable.userId, achievementYearsTable.year],
      set: { ...v, updatedAt: new Date() },
    })
    .returning();
  res.json(row);
});

export default router;
""",
    "@APP/src/pages/Achievements.tsx": r"""import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Trophy, Star, Target, Check, Plus, Pencil, Trash2, CalendarDays, ChevronDown, ChevronUp, Clock,
  Lightbulb, TrendingUp, ArrowRight, Send, Copy, BarChart3, Rocket, Quote, GraduationCap, Sparkles, Mountain,
} from 'lucide-react';

/* ─── Types & constants ─────────────────────────────────────────────────── */
type Kind = 'achievement' | 'goal';
interface Item {
  id: number; year: number; kind: Kind; title: string;
  description: string | null; why: string | null; purpose: string | null;
  category: string | null; done: boolean; doneDate: string | null;
}
interface YearMeta { id: number; year: number; title: string | null; subtitle: string | null; why: string | null; purpose: string | null }
type Phase = 'upcoming' | 'current' | 'past';

const ITEMS_KEY = ['achievement-items'];
const YEARS_KEY = ['achievement-years'];
const VISIBLE = 3;

const CATEGORIES: { name: string; bg: string; ink: string }[] = [
  { name: 'Education', bg: '#DDF4F7', ink: '#176B73' },
  { name: 'Skills',    bg: '#F2F0FF', ink: '#6A5CE0' },
  { name: 'Career',    bg: '#FDF8EB', ink: '#B8860B' },
  { name: 'Research',  bg: '#E8EEF6', ink: '#233B63' },
  { name: 'Health',    bg: '#E1FAF3', ink: '#0F8F72' },
  { name: 'Personal',  bg: '#FBEEEE', ink: '#D95757' },
  { name: 'Community', bg: '#FDEFF6', ink: '#B83A7A' },
];
const catTone = (name: string | null) => CATEGORIES.find(c => c.name === name) ?? null;

const QUOTES = ['Aim high, keep going!', 'Small steps, every day.', 'Dream big, start small.', 'Your future self is watching.'];

/* ─── Pure helpers ──────────────────────────────────────────────────────── */
function phaseOf(year: number, current: number): Phase {
  return year > current ? 'upcoming' : year === current ? 'current' : 'past';
}
function defaultTitle(year: number, phase: Phase) {
  return phase === 'upcoming' ? `${year} Wishlist` : `${year} Achievements`;
}
function defaultSubtitle(phase: Phase) {
  return phase === 'upcoming' ? 'Dreams for the coming year' : phase === 'current' ? 'A year of growth and progress' : 'Looking back with pride';
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function monthYear(s: string | null) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m) return '';
  return new Date(y, m - 1, d || 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** Counts used by the stat cards and Insights. */
function computeStats(items: Item[], currentYear: number) {
  const years = Array.from(new Set(items.map(i => i.year))).sort((a, b) => a - b);
  const done = items.filter(i => i.done);
  const open = items.filter(i => !i.done);
  const goals = items.filter(i => i.kind === 'goal');
  const goalsDone = goals.filter(i => i.done).length;
  const perYear = new Map<number, number>();
  done.forEach(i => perYear.set(i.year, (perYear.get(i.year) ?? 0) + 1));
  let best: { year: number; count: number } | null = null;
  perYear.forEach((count, year) => { if (!best || count > best.count || (count === best.count && year > best.year)) best = { year, count }; });
  const cur = perYear.get(currentYear) ?? 0;
  const prev = perYear.get(currentYear - 1) ?? 0;
  return {
    yearsTracked: years.length,
    achievements: done.length,
    inProgress: open.length,
    goalCompletion: goals.length > 0 ? Math.round((goalsDone / goals.length) * 100) : null,
    best: best as { year: number; count: number } | null,
    cur, prev,
    growthPct: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null,
    perYear,
  };
}

/* ─── Small pieces ──────────────────────────────────────────────────────── */
function MountainFlag({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true">
      <path d="M0 90 L52 34 L72 56 L100 14 L160 90 Z" fill="#A9DCE8" opacity=".75" />
      <path d="M40 90 L84 40 L104 62 L124 38 L160 90 Z" fill="#19C7B7" opacity=".55" />
      <path d="M100 14 L93 28 L100 25 L107 28 Z" fill="#fff" opacity=".9" />
      <path d="M100 14 V2" stroke="#176B73" strokeWidth="2" strokeLinecap="round" />
      <path d="M100 2 L114 6 L100 10 Z" fill="#F2C75C" />
    </svg>
  );
}

function CategoryChip({ name }: { name: string | null }) {
  const t = catTone(name);
  if (!name) return null;
  return <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: t?.bg ?? '#EEF2F6', color: t?.ink ?? '#475569' }}>{name}</span>;
}

type FormState = { year: number; kind: Kind; title: string; category: string; description: string; why: string; purpose: string; done: boolean };

/** The add / edit form. In the sidebar it adds; in a dialog it edits. */
function EntryForm({ initial, years, submitLabel, showDone, saving, onSubmit, idPrefix }: {
  initial: FormState; years: number[]; submitLabel: string; showDone: boolean; saving: boolean;
  onSubmit: (f: FormState) => void; idPrefix: string;
}) {
  const [f, setF] = useState<FormState>(initial);
  useEffect(() => { setF(initial); }, [initial]);
  const set = (patch: Partial<FormState>) => setF(prev => ({ ...prev, ...patch }));
  return (
    <form className="space-y-3.5" onSubmit={e => { e.preventDefault(); if (f.title.trim()) onSubmit(f); }}>
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-year`} className="text-xs">Year</Label>
          <select id={`${idPrefix}-year`} value={f.year} onChange={e => set({ year: Number(e.target.value) })}
            className="h-9 w-full rounded-md border border-input bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#176B73]/30">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <div className="flex h-9 gap-1 rounded-md bg-[#F1F5F9] p-0.5" role="radiogroup" aria-label="Type">
            {([['achievement', 'Achievement'], ['goal', 'Goal']] as [Kind, string][]).map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={f.kind === k}
                onClick={() => set({ kind: k, done: k === 'achievement' })}
                className={`flex-1 whitespace-nowrap rounded-[5px] px-1 text-[11px] font-semibold transition-colors ${f.kind === k ? 'bg-white text-[#176B73] shadow-sm' : 'text-muted-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`} className="text-xs">Title *</Label>
        <Input id={`${idPrefix}-title`} value={f.title} maxLength={160} autoComplete="off" placeholder="e.g. Get KAUST admission" onChange={e => set({ title: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button key={c.name} type="button" aria-pressed={f.category === c.name} onClick={() => set({ category: f.category === c.name ? '' : c.name })}
              className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={f.category === c.name ? { backgroundColor: c.bg, color: c.ink, borderColor: c.ink } : { backgroundColor: '#fff', color: '#64748B', borderColor: '#E3EAF0' }}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-desc`} className="text-xs">Description (optional)</Label>
        <Textarea id={`${idPrefix}-desc`} rows={2} value={f.description} maxLength={1000} placeholder="Add more details…" onChange={e => set({ description: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-why`} className="text-xs">Why it matters?</Label>
        <Input id={`${idPrefix}-why`} value={f.why} maxLength={1000} placeholder="e.g. Helps me achieve my dream…" onChange={e => set({ why: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-purpose`} className="text-xs">Major purpose</Label>
        <Input id={`${idPrefix}-purpose`} value={f.purpose} maxLength={1000} placeholder="e.g. To prepare for higher studies abroad" onChange={e => set({ purpose: e.target.value })} />
      </div>
      {showDone && (
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#E3EAF0] bg-[#F8FAFC] px-3 py-2 text-sm font-medium text-[#17243D]">
          <input type="checkbox" className="h-4 w-4 accent-[#176B73]" checked={f.done} onChange={e => set({ done: e.target.checked })} />
          Achieved
        </label>
      )}
      <Button type="submit" disabled={!f.title.trim() || saving} className="h-10 w-full text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }}>
        <Send className="mr-1.5 h-4 w-4" /> {saving ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

/* ─── Main tab ──────────────────────────────────────────────────────────── */
export function AchievementsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ITEMS_KEY,
    queryFn: () => api.getAchievements() as Promise<Item[]>,
  });
  const { data: metas = [] } = useQuery<YearMeta[]>({
    queryKey: YEARS_KEY,
    queryFn: () => api.getAchievementYears() as Promise<YearMeta[]>,
  });

  const [yearFilter, setYearFilter] = useState<'all' | number>('all');
  const [catFilter, setCatFilter] = useState<'all' | string>('all');
  const [showAll, setShowAll] = useState<Set<number>>(new Set());
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Item | null>(null);
  const [yearDialog, setYearDialog] = useState<number | null>(null);
  const [yearForm, setYearForm] = useState({ title: '', subtitle: '', why: '', purpose: '' });
  const [showDetails, setShowDetails] = useState(false);
  const [seed, setSeed] = useState<{ n: number; form: FormState }>({
    n: 0, form: { year: currentYear, kind: 'achievement', title: '', category: '', description: '', why: '', purpose: '', done: true },
  });

  async function check<T>(p: Promise<T>): Promise<T> {
    const r: any = await p;
    if (r && typeof r === 'object' && !Array.isArray(r) && 'error' in r) throw new Error(String(r.error));
    return r;
  }
  function fail(err: unknown) {
    toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
  }

  const addItem = useMutation({
    mutationFn: (b: Record<string, unknown>) => check(api.addAchievement(b)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ITEMS_KEY }); toast({ title: '✅ Saved to your timeline' }); },
    onError: fail,
  });
  const updateItem = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => check(api.updateAchievement(id, body)),
    onMutate: async ({ id, body }: { id: number; body: Record<string, unknown> }) => {
      await qc.cancelQueries({ queryKey: ITEMS_KEY });
      const prev = qc.getQueryData<Item[]>(ITEMS_KEY);
      qc.setQueryData<Item[]>(ITEMS_KEY, (old = []) => old.map(i => (i.id === id ? ({ ...i, ...body } as Item) : i)));
      return { prev };
    },
    onError: (err, _v, ctx) => { if (ctx?.prev) qc.setQueryData(ITEMS_KEY, ctx.prev); fail(err); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ITEMS_KEY }); },
  });
  const removeItem = useMutation({
    mutationFn: (id: number) => api.deleteAchievement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ITEMS_KEY }),
    onError: fail,
  });
  const saveYear = useMutation({
    mutationFn: ({ year, body }: { year: number; body: Record<string, unknown> }) => check(api.saveAchievementYear(year, body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
    onError: fail,
  });

  /* ── derived ── */
  const stats = useMemo(() => computeStats(items, currentYear), [items, currentYear]);
  const metaByYear = useMemo(() => new Map(metas.map(m => [m.year, m])), [metas]);

  const timelineYears = useMemo(() => {
    const set = new Set<number>([currentYear, currentYear + 1]);
    items.forEach(i => set.add(i.year));
    metas.forEach(m => set.add(m.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [items, metas, currentYear]);
  const formYears = useMemo(() => {
    const set = new Set<number>(timelineYears);
    for (let y = currentYear - 6; y <= currentYear + 8; y++) set.add(y);
    return Array.from(set).sort((a, b) => b - a);
  }, [timelineYears, currentYear]);

  const visibleYears = yearFilter === 'all' ? timelineYears : timelineYears.filter(y => y === yearFilter);
  const itemsFor = (year: number) => items
    .filter(i => i.year === year && (catFilter === 'all' || i.category === catFilter))
    .sort((a, b) => Number(b.done) - Number(a.done) || a.id - b.id);

  const quote = QUOTES[currentYear % QUOTES.length];

  /* ── actions ── */
  function toggleDone(i: Item) {
    const done = !i.done;
    updateItem.mutate({ id: i.id, body: { done, doneDate: done ? todayStr() : null } });
  }
  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) {
    setter(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function payload(f: FormState) {
    return {
      year: f.year, kind: f.kind, title: f.title.trim(), category: f.category || null,
      description: f.description.trim() || null, why: f.why.trim() || null, purpose: f.purpose.trim() || null,
      done: f.done, doneDate: f.done ? todayStr() : null,
    };
  }
  function submitNew(f: FormState) {
    addItem.mutate(payload(f), {
      onSuccess: () => { setShowAll(prev => new Set(prev).add(f.year)); setSeed(s => ({ n: s.n + 1, form: { ...s.form, year: f.year, kind: f.kind, done: f.kind === 'achievement', title: '', category: '', description: '', why: '', purpose: '' } })); },
    });
  }
  function submitEdit(f: FormState) {
    if (!editing) return;
    const body: Record<string, unknown> = payload(f);
    if (editing.done && f.done) body.doneDate = editing.doneDate; // keep the original date
    updateItem.mutate({ id: editing.id, body }, { onSuccess: () => setEditing(null) });
  }
  function startEntry(year: number, kind: Kind) {
    setSeed(s => ({ n: s.n + 1, form: { ...s.form, year, kind, done: kind === 'achievement', title: '' } }));
    const el = document.getElementById('ach-new-title');
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el as HTMLInputElement).focus(); }
  }
  function openYear(year: number) {
    const m = metaByYear.get(year);
    setYearForm({ title: m?.title ?? '', subtitle: m?.subtitle ?? '', why: m?.why ?? '', purpose: m?.purpose ?? '' });
    setYearDialog(year);
  }
  function submitYear() {
    if (yearDialog === null) return;
    saveYear.mutate({ year: yearDialog, body: { ...yearForm } }, { onSuccess: () => setYearDialog(null) });
  }
  async function copyYear(year: number) {
    const phase = phaseOf(year, currentYear);
    const m = metaByYear.get(year);
    const lines = [m?.title || defaultTitle(year, phase), ''];
    items.filter(i => i.year === year).sort((a, b) => Number(b.done) - Number(a.done) || a.id - b.id)
      .forEach(i => lines.push(`${i.done ? '✓' : '○'} ${i.title}${i.why ? ` (why: ${i.why})` : ''}`));
    if (m?.why) lines.push('', `Why it matters: ${m.why}`);
    if (m?.purpose) lines.push(`Major purpose: ${m.purpose}`);
    try { await navigator.clipboard.writeText(lines.join('\n')); toast({ title: 'Copied to clipboard' }); }
    catch { toast({ title: 'Could not copy', variant: 'destructive' }); }
  }

  const statCards = [
    { label: 'Tracked', value: `${stats.yearsTracked}`, unit: stats.yearsTracked === 1 ? 'Year' : 'Years', icon: Star, bg: '#DDF4F7', ink: '#176B73' },
    { label: 'Achievements', value: `${stats.achievements}`, unit: '', icon: Check, bg: '#E1FAF3', ink: '#0F8F72' },
    { label: 'Goals in Progress', value: `${stats.inProgress}`, unit: '', icon: BarChart3, bg: '#E8EEF6', ink: '#233B63' },
    { label: 'Goal Completion', value: stats.goalCompletion === null ? '—' : `${stats.goalCompletion}%`, unit: '', icon: Target, bg: '#F2F0FF', ink: '#7C6CFF' },
  ];

  const growthText = stats.growthPct !== null
    ? `Your achievements are ${stats.growthPct >= 0 ? 'up' : 'down'} by ${Math.abs(stats.growthPct)}% compared to last year.`
    : stats.cur > 0 ? `You have achieved ${stats.cur} so far in ${currentYear}.` : 'Add what you achieved to see your growth.';
  const hasAnything = items.length > 0;

  return (
    <div className="space-y-5" data-testid="achievements">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#FDF8EB] text-[#B8860B] sm:h-20 sm:w-20">
            <Trophy className="h-8 w-8 fill-[#F2C75C]/40 sm:h-10 sm:w-10" />
          </span>
          <div>
            <h2 className="font-heading text-3xl font-bold leading-tight text-[#17243D]">Achievements &amp; Goals</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#475569]">Look back at your journey and plan for an even greater future. <Rocket className="h-4 w-4 shrink-0 text-[#176B73]" /></p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative inline-flex items-center gap-2 rounded-full border border-[#E3EAF0] bg-white px-3.5 py-2 text-sm font-semibold text-[#17243D] shadow-sm">
            <CalendarDays className="h-4 w-4 text-[#176B73]" />
            <select aria-label="Filter by year" value={yearFilter} onChange={e => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="appearance-none bg-transparent pr-5 focus:outline-none">
              <option value="all">All Years</option>
              {timelineYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
          </label>
          <label className="relative inline-flex items-center gap-2 rounded-full border border-[#E3EAF0] bg-white px-3.5 py-2 text-sm font-semibold text-[#17243D] shadow-sm">
            <Sparkles className="h-4 w-4 text-[#7C6CFF]" />
            <select aria-label="Filter by category" value={catFilter} onChange={e => setCatFilter(e.target.value)} className="appearance-none bg-transparent pr-5 focus:outline-none">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
          </label>
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(s => (
          <div key={s.label} data-testid={`ach-stat-${s.label}`} className="flex items-center gap-2.5 rounded-2xl border border-[#E3EAF0] bg-white p-3 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:gap-4 sm:p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14" style={{ backgroundColor: s.bg, color: s.ink }}><s.icon className="h-4 w-4 sm:h-6 sm:w-6" /></span>
            <div className="min-w-0">
              <p className="whitespace-nowrap font-heading text-xl font-bold leading-none text-[#17243D] sm:text-[1.7rem]">{s.value}{s.unit && <span className="ml-1.5">{s.unit}</span>}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        {/* timeline */}
        <div className="space-y-4" data-testid="ach-timeline">
          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && !hasAnything && yearFilter === 'all' && (
            <div className="rounded-2xl border border-dashed border-[#D9E3E9] bg-white px-6 py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF8EB] text-[#B8860B]"><Mountain className="h-6 w-6" /></span>
              <p className="mt-3 font-heading text-base font-bold text-[#17243D]">Start your timeline</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add what you achieved in past years, what you are working on now, and what you wish for next year. Add the reason behind each one.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button type="button" size="sm" onClick={() => startEntry(currentYear - 1, 'achievement')} className="bg-[#233B63] text-white hover:bg-[#17243D]"><Plus className="mr-1 h-3.5 w-3.5" /> {currentYear - 1} achievement</Button>
                <Button type="button" size="sm" onClick={() => startEntry(currentYear, 'achievement')} variant="outline">{currentYear} achievement</Button>
                <Button type="button" size="sm" onClick={() => startEntry(currentYear + 1, 'goal')} variant="outline">{currentYear + 1} wishlist</Button>
              </div>
            </div>
          )}

          {visibleYears.map((year, idx) => {
            const phase = phaseOf(year, currentYear);
            const meta = metaByYear.get(year);
            const all = items.filter(i => i.year === year);
            const list = itemsFor(year);
            const expanded = showAll.has(year);
            const shown = expanded ? list : list.slice(0, VISIBLE);
            const doneCount = all.filter(i => i.done).length;
            const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
            const hasNote = !!(meta?.why || meta?.purpose);
            const ring = phase === 'upcoming' ? '#19C7B7' : phase === 'current' ? '#F2C75C' : '#A99BFF';
            const bubbleBg = phase === 'upcoming' ? '#DDF4F7' : phase === 'current' ? '#FDF8EB' : '#F2F0FF';
            const chip = phase === 'upcoming'
              ? { label: 'Planned', cls: 'bg-[#DDF4F7] text-[#176B73]', icon: <Clock className="h-3.5 w-3.5" /> }
              : phase === 'current'
                ? { label: 'In progress', cls: 'bg-[#FDF8EB] text-[#B8860B]', icon: <TrendingUp className="h-3.5 w-3.5" /> }
                : { label: 'Completed', cls: 'bg-[#E1FAF3] text-[#0F8F72]', icon: <Check className="h-3.5 w-3.5" /> };
            const YearIcon = phase === 'upcoming' ? Target : phase === 'current' ? Trophy : Star;

            return (
              <div key={year} className="grid gap-3 sm:grid-cols-[5.25rem_minmax(0,1fr)] sm:gap-4" data-testid={`year-${year}`}>
                <div className="relative hidden sm:block">
                  <span className="relative z-10 flex h-[5.25rem] w-[5.25rem] flex-col items-center justify-center rounded-full border-2 text-center" style={{ backgroundColor: bubbleBg, borderColor: ring }}>
                    <span className="font-heading text-xl font-bold leading-none text-[#17243D]">{year}</span>
                    <span className="mt-1 text-[10px] font-medium text-[#475569]">({phase === 'upcoming' ? 'Upcoming' : phase === 'current' ? 'Current' : 'Completed'})</span>
                  </span>
                  {idx < visibleYears.length - 1 && <span className="absolute left-1/2 top-[5.25rem] -bottom-4 w-0.5 -translate-x-1/2" style={{ backgroundColor: ring, opacity: 0.35 }} />}
                </div>

                <section className="@container rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5">
                  <header className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: phase === 'upcoming' ? '#FDF8EB' : bubbleBg, color: phase === 'upcoming' ? '#B8860B' : phase === 'current' ? '#B8860B' : '#7C6CFF' }}>
                      <YearIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading text-lg font-bold leading-tight text-[#17243D]">{meta?.title || defaultTitle(year, phase)}</h3>
                      <p className="text-xs text-[#475569]">{meta?.subtitle || defaultSubtitle(phase)}</p>
                    </div>
                    <span className={`hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold @sm:inline-flex ${chip.cls}`}>{chip.label} {chip.icon}</span>
                  </header>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-[#17243D]">{year}</span>
                    <span className="sm:hidden">· {chip.label}</span>
                    {all.length > 0 && (<>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E3EAF0]"><div className="h-full rounded-full bg-[#19C7B7]" style={{ width: `${pct}%` }} /></div>
                      <span className="font-semibold text-[#176B73]">{doneCount}/{all.length} done</span>
                    </>)}
                    <span className="ml-auto flex items-center gap-1">
                      <button type="button" onClick={() => copyYear(year)} aria-label={`Copy ${year} as text`} title="Copy as text" className="rounded-lg p-1.5 hover:bg-[#F1F5F9] hover:text-[#17243D]"><Copy className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => openYear(year)} aria-label={`Edit ${year} title and reflection`} title="Edit title and reflection" className="rounded-lg p-1.5 hover:bg-[#F1F5F9] hover:text-[#17243D]"><Pencil className="h-3.5 w-3.5" /></button>
                    </span>
                  </div>

                  <div className="mt-3 grid gap-4 @[30rem]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @[30rem]:items-start">
                    <div>
                      {list.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#D9E3E9] px-3 py-5 text-center text-xs text-muted-foreground">
                          {all.length > 0 ? 'Nothing in this category.' : phase === 'upcoming' ? 'Nothing on the wishlist yet.' : 'Nothing added yet.'}
                          {all.length === 0 && (
                            <div className="mt-2"><button type="button" onClick={() => startEntry(year, phase === 'upcoming' ? 'goal' : 'achievement')} className="font-semibold text-[#176B73] hover:underline">+ Add {phase === 'upcoming' ? 'a goal' : 'an achievement'}</button></div>
                          )}
                        </div>
                      ) : (
                        <ul className="space-y-1.5">
                          {shown.map(i => {
                            const open = openItems.has(i.id);
                            return (
                              <li key={i.id} data-testid={`ach-item-${i.title}`}>
                                <div className="flex items-start gap-2.5">
                                  <button type="button" onClick={() => toggleDone(i)} aria-pressed={i.done} aria-label={i.done ? `Mark "${i.title}" as not achieved` : `Mark "${i.title}" as achieved`}
                                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${i.done ? 'border-[#0F8F72] bg-[#0F8F72] text-white' : 'border-[#A9DCE8] text-[#A9DCE8] hover:border-[#176B73] hover:text-[#176B73]'}`}>
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button type="button" onClick={() => toggleSet(setOpenItems, i.id)} aria-expanded={open} className="min-w-0 flex-1 text-left">
                                    <span className={`block text-sm font-medium leading-snug ${i.done ? 'text-[#17243D]' : 'text-[#475569]'}`}>{i.title}</span>
                                    {i.category && <span className="mt-0.5 inline-block"><CategoryChip name={i.category} /></span>}
                                  </button>
                                  <button type="button" onClick={() => toggleSet(setOpenItems, i.id)} aria-label={open ? 'Hide details' : 'Show details'} className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground hover:bg-[#F1F5F9]">
                                    {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                                {open && (
                                  <div className="ml-[2.1rem] mt-1.5 space-y-2 rounded-xl bg-[#F8FAFC] p-3 text-xs" data-testid="ach-details">
                                    {i.description && <div><p className="font-semibold text-[#17243D]">Description</p><p className="mt-0.5 break-words text-[#475569]">{i.description}</p></div>}
                                    {i.why && <div><p className="font-semibold text-[#17243D]">Why it matters</p><p className="mt-0.5 break-words text-[#475569]">{i.why}</p></div>}
                                    {i.purpose && <div><p className="font-semibold text-[#17243D]">Major purpose</p><p className="mt-0.5 break-words text-[#475569]">{i.purpose}</p></div>}
                                    {!i.description && !i.why && !i.purpose && <p className="text-muted-foreground">No details yet. Use Edit to add the reason behind this one.</p>}
                                    {i.done && i.doneDate && <p className="text-[11px] text-muted-foreground">Achieved {monthYear(i.doneDate)}</p>}
                                    <div className="flex gap-3 border-t border-[#E3EAF0] pt-2 font-semibold">
                                      <button type="button" onClick={() => setEditing(i)} className="inline-flex items-center gap-1 text-[#176B73] hover:underline"><Pencil className="h-3 w-3" /> Edit</button>
                                      <button type="button" onClick={() => { if (window.confirm(`Delete "${i.title}"?`)) removeItem.mutate(i.id); }} className="inline-flex items-center gap-1 text-[#D95757] hover:underline"><Trash2 className="h-3 w-3" /> Delete</button>
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {list.length > VISIBLE && (
                        <button type="button" onClick={() => toggleSet(setShowAll, year)} className="mt-2.5 ml-[2.1rem] text-xs font-semibold text-[#176B73] hover:underline">
                          {expanded ? 'Show less' : `+ ${list.length - VISIBLE} more…`}
                        </button>
                      )}
                    </div>

                    {/* reflection panel */}
                    {hasNote ? (
                      <div className="rounded-2xl bg-[#E8EEF6]/70 p-3.5" data-testid={`year-note-${year}`}>
                        {meta?.why && (<><p className="text-sm font-bold text-[#17243D]">Why it matters?</p><p className="mt-1 break-words text-xs leading-5 text-[#475569]">{meta.why}</p></>)}
                        {meta?.purpose && (<><p className={`text-sm font-bold text-[#17243D] ${meta?.why ? 'mt-3' : ''}`}>Major purpose</p><p className="mt-1 break-words text-xs leading-5 text-[#475569]">{meta.purpose}</p></>)}
                        <button type="button" onClick={() => openYear(year)} className="mt-2 text-[11px] font-semibold text-[#176B73] hover:underline">Edit</button>
                      </div>
                    ) : phase === 'upcoming' ? (
                      <div className="relative min-h-[8.5rem] overflow-hidden rounded-2xl p-3.5" style={{ background: 'linear-gradient(135deg, #DDF4F7, #E4F5F7)' }}>
                        <Quote className="h-5 w-5 text-[#19C7B7]" />
                        <p className="relative mt-1 max-w-[11rem] text-sm font-medium text-[#17243D]">{quote}</p>
                        <button type="button" onClick={() => openYear(year)} className="relative z-10 mt-2 block max-w-[10rem] text-[11px] font-semibold leading-4 text-[#176B73] hover:underline">Add why this year matters</button>
                        <MountainFlag className="pointer-events-none absolute -bottom-1 -right-1 h-16 w-28" />
                      </div>
                    ) : (
                      <button type="button" onClick={() => openYear(year)} className="flex w-full flex-col items-start rounded-2xl border border-dashed border-[#C9D6E2] bg-[#F8FAFC] p-3.5 text-left hover:bg-[#EEF3FA]">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-[#17243D]"><Lightbulb className="h-4 w-4 text-[#B8860B]" /> Why it matters?</span>
                        <span className="mt-1 text-xs text-muted-foreground">Write what {year} meant to you and the major purpose behind it.</span>
                      </button>
                    )}
                  </div>
                </section>
              </div>
            );
          })}
        </div>

        {/* sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-2" data-testid="ach-sidebar">
          <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5" data-testid="ach-add-card">
            <h3 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-[#17243D]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#233B63] text-white"><Plus className="h-4 w-4" /></span> Add New Achievement
            </h3>
            <EntryForm key={seed.n} initial={seed.form} years={formYears} submitLabel="Save Entry" showDone={false} saving={addItem.isPending} onSubmit={submitNew} idPrefix="ach-new" />
          </section>

          <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5" data-testid="ach-insights">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-heading text-base font-bold text-[#17243D]"><Lightbulb className="h-5 w-5 text-[#B8860B]" /> Insights</h3>
              <button type="button" onClick={() => setShowDetails(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B73] hover:underline">View Details <ArrowRight className="h-3.5 w-3.5" /></button>
            </div>
            <ul className="divide-y divide-[#EEF2F6]">
              <li className="flex items-center gap-3 pb-3">
                <TrendingUp className="h-7 w-7 shrink-0 text-[#0F8F72]" />
                <p className="text-sm text-[#17243D]">{growthText}</p>
              </li>
              <li className="flex items-center gap-3 pt-3">
                <Trophy className="h-8 w-8 shrink-0 fill-[#F2C75C]/50 text-[#B8860B]" />
                <div>
                  <p className="text-xs text-muted-foreground">Best Year</p>
                  <p className="font-heading text-lg font-bold leading-tight text-[#17243D]">{stats.best ? stats.best.year : '—'}</p>
                  <p className="text-xs text-muted-foreground">{stats.best ? `${stats.best.count} achievement${stats.best.count === 1 ? '' : 's'}` : 'Your best year shows up here'}</p>
                </div>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      {/* edit item */}
      <Dialog open={editing !== null} onOpenChange={open => { if (!open) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Edit entry</DialogTitle></DialogHeader>
          {editing && (
            <EntryForm
              initial={{ year: editing.year, kind: editing.kind, title: editing.title, category: editing.category ?? '', description: editing.description ?? '', why: editing.why ?? '', purpose: editing.purpose ?? '', done: editing.done }}
              years={formYears} submitLabel="Save changes" showDone saving={updateItem.isPending} onSubmit={submitEdit} idPrefix="ach-edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* edit year */}
      <Dialog open={yearDialog !== null} onOpenChange={open => { if (!open) setYearDialog(null); }}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{yearDialog} · title and reflection</DialogTitle></DialogHeader>
          <form className="space-y-3.5" onSubmit={e => { e.preventDefault(); submitYear(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="ach-y-title" className="text-xs">Title</Label>
              <Input id="ach-y-title" value={yearForm.title} maxLength={80} placeholder={yearDialog !== null ? defaultTitle(yearDialog, phaseOf(yearDialog, currentYear)) : ''} onChange={e => setYearForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ach-y-sub" className="text-xs">Subtitle</Label>
              <Input id="ach-y-sub" value={yearForm.subtitle} maxLength={120} placeholder={yearDialog !== null ? defaultSubtitle(phaseOf(yearDialog, currentYear)) : ''} onChange={e => setYearForm(f => ({ ...f, subtitle: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ach-y-why" className="text-xs">Why it matters?</Label>
              <Textarea id="ach-y-why" rows={3} value={yearForm.why} maxLength={1000} placeholder="What did this year mean to you?" onChange={e => setYearForm(f => ({ ...f, why: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ach-y-purpose" className="text-xs">Major purpose</Label>
              <Textarea id="ach-y-purpose" rows={3} value={yearForm.purpose} maxLength={1000} placeholder="e.g. To prepare myself for higher studies and a career in AI." onChange={e => setYearForm(f => ({ ...f, purpose: e.target.value }))} />
            </div>
            <p className="text-[11px] text-muted-foreground">Leave everything empty to go back to the default title.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setYearDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={saveYear.isPending} className="bg-[#233B63] text-white hover:bg-[#17243D]">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* insights details */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Your achievements by year</DialogTitle></DialogHeader>
          {items.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet. Add an entry to see this.</p> : (
            <div className="space-y-5">
              <ul className="space-y-2.5">
                {Array.from(new Set(items.map(i => i.year))).sort((a, b) => b - a).map(y => {
                  const all = items.filter(i => i.year === y); const d = all.filter(i => i.done).length;
                  const max = Math.max(...Array.from(new Set(items.map(i => i.year))).map(yy => items.filter(i => i.year === yy).length));
                  return (
                    <li key={y} className="flex items-center gap-3 text-sm">
                      <span className="w-10 font-semibold text-[#17243D]">{y}</span>
                      <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-[#E3EAF0]">
                        <div className="h-full bg-[#0F8F72]" style={{ width: `${(d / max) * 100}%` }} />
                        <div className="h-full bg-[#A9DCE8]" style={{ width: `${((all.length - d) / max) * 100}%` }} />
                      </div>
                      <span className="w-16 text-right text-xs text-muted-foreground">{d}/{all.length} done</span>
                    </li>
                  );
                })}
              </ul>
              <p className="flex items-center gap-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#0F8F72]" />Achieved</span><span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-[#A9DCE8]" />Still open</span></p>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">By category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => ({ c, n: items.filter(i => i.category === c.name && i.done).length })).filter(x => x.n > 0).map(({ c, n }) => (
                    <span key={c.name} className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: c.bg, color: c.ink }}>{c.name} · {n}</span>
                  ))}
                  {items.every(i => !i.category) && <span className="text-xs text-muted-foreground">Add a category to an entry to see a breakdown.</span>}
                </div>
              </div>
            </div>
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
    sys.exit("Run this from the project root:  python3 add_achievements.py artifacts/ielts-tracker")

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
    ("db schema export", 'export * from "./achievements";',
     after_line(r'export \* from "\./planning-notes";', 'export * from "./achievements";\n')),
])

# 3. api route
edit("artifacts/api-server/src/routes/index.ts", [
    ("api route import", 'import achievementsRouter from',
     after_line(r'import planningNotesRouter from', 'import achievementsRouter from "./achievements";\n')),
    ("api route use", 'router.use(achievementsRouter);',
     after_line(r'router\.use\(planningNotesRouter\);', 'router.use(achievementsRouter);\n')),
])

# 4. front-end api client
edit(os.path.join(APP, "src/lib/api.ts"), [
    ("api client", "getAchievements:", after_line(r'  deletePlanningNote:',
        "  getAchievements: () => getList('/api/achievements/items'),\n"
        "  addAchievement: (body: Record<string, unknown>) => post('/api/achievements/items', body),\n"
        "  updateAchievement: (id: number, body: Record<string, unknown>) => put(`/api/achievements/items/${id}`, body),\n"
        "  deleteAchievement: (id: number) => del(`/api/achievements/items/${id}`),\n"
        "  getAchievementYears: () => getList('/api/achievements/years'),\n"
        "  saveAchievementYear: (year: number, body: Record<string, unknown>) => put(`/api/achievements/years/${year}`, body),\n")),
])
# 5. sidebar tab + route
def add_tab_type(s):
    m = re.search(r"(type FlyTab\s*=\s*)([^;]+);", s)
    if not m or s.count("type FlyTab") != 1:
        return None
    return s[:m.end(2)] + " | 'achievements'" + s[m.end(2):]


edit(os.path.join(APP, "src/App.tsx"), [
    ("tab type", "| 'achievements'", add_tab_type),
    ("sidebar item", "id: 'achievements'",
     before_line(r"  \{ id: 'notepad'", "  { id: 'achievements', label: 'Achievements',  icon: Mountain },\n")),
])

# 6. render the tab
edit(os.path.join(APP, "src/pages/HigherStudyPrep.tsx"), [
    ("page import", "import { AchievementsTab }",
     after_line(r"import React", "import { AchievementsTab } from '@/pages/Achievements';\n")),
    ("page render", "<AchievementsTab />",
     before_line(r"      \{tab === 'templates'", "      {tab === 'achievements' && <AchievementsTab />}\n")),
])

print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your files differ from what I expected):")
    for x in problems:
        print("  -", x)
    sys.exit(1)
print("All edits applied.")
