/* know-myself-v2 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Brain, Dumbbell, Target, RotateCcw, TriangleAlert, CircleHelp, Plus, Pencil, Trash2, Check, ChevronDown, ChevronUp, Send,
  CalendarDays, Lightbulb, Sparkles, List, FileText, CircleCheckBig,
} from 'lucide-react';

/* ─── Types & constants ─────────────────────────────────────────────────── */
// Built-in kinds are plain words. Your own categories are stored as "custom:<name>".
type Kind = string;
// none = just a memory / no action planned. Regrets you are not working on live here.
type Status = 'none' | 'open' | 'working' | 'resolved';
interface Note {
  id: number; kind: Kind; title: string; details: string | null; insight: string | null; action: string | null;
  status: Status; dueDate: string | null; createdAt: string; updatedAt: string;
}
const NOTES_KEY = ['self-notes'];
const CATEGORY = '__category'; // hidden note that remembers one of your own categories (title = name, details = colour number)

interface KindMeta {
  plural: string; single: string; bg: string; ink: string; icon: React.ComponentType<{ className?: string }>;
  details: string; insight: string; action: string; hint: string; hasStatus: boolean; defaultStatus: Status;
}
const BUILTIN: Record<string, KindMeta> = {
  strength: { plural: 'Strengths', single: 'Strength', bg: '#E1FAF3', ink: '#0F8F72', icon: Dumbbell, details: 'What is it?', insight: 'Evidence: when did I show it?', action: 'How will I use it more?', hint: 'e.g. I stay calm under pressure', hasStatus: false, defaultStatus: 'open' },
  weakness: { plural: 'Weaknesses', single: 'Weakness', bg: '#FDF8EB', ink: '#B8860B', icon: Target, details: 'What is it?', insight: 'Why does it happen?', action: 'How will I improve it?', hint: 'e.g. I delay starting hard tasks', hasStatus: true, defaultStatus: 'open' },
  regret: { plural: 'Regrets', single: 'Regret', bg: '#F2F0FF', ink: '#6A5CE0', icon: RotateCcw, details: 'What happened?', insight: 'What did I learn?', action: 'What will I do differently?', hint: 'e.g. I did not study enough last year', hasStatus: true, defaultStatus: 'none' },
  failure: { plural: 'Failures', single: 'Failure', bg: '#FBEEEE', ink: '#D95757', icon: TriangleAlert, details: 'What happened?', insight: 'What did I learn?', action: 'What will I do differently?', hint: 'e.g. I missed a scholarship deadline', hasStatus: true, defaultStatus: 'none' },
  confusion: { plural: 'Confusions', single: 'Confusion', bg: '#E8EEF6', ink: '#233B63', icon: CircleHelp, details: 'What am I confused about?', insight: 'What do I know so far?', action: 'How will I find out?', hint: 'e.g. Am I better suited to a Masters or a job first?', hasStatus: true, defaultStatus: 'open' },
};
const BUILTIN_ORDER = ['strength', 'weakness', 'regret', 'failure', 'confusion'];
const PALETTE = [
  { bg: '#E3F2FB', ink: '#1B6FA8' }, { bg: '#FFF1E6', ink: '#C2570C' }, { bg: '#EAF7E3', ink: '#3F8A1F' },
  { bg: '#FCE9F3', ink: '#B5307A' }, { bg: '#EDEBFF', ink: '#5B4BD6' }, { bg: '#EEF1F5', ink: '#475569' },
];
const STATUS_ORDER: Status[] = ['none', 'open', 'working', 'resolved'];
const STATUS_LABEL: Record<Status, string> = { none: 'No action', open: 'To work on', working: 'In progress', resolved: 'Worked on' };
const STATUS_TONE: Record<Status, string> = { none: 'bg-[#EEF1F5] text-[#64748B]', open: 'bg-[#FDF8EB] text-[#B8860B]', working: 'bg-[#F2F0FF] text-[#6A5CE0]', resolved: 'bg-[#DDF4F7] text-[#176B73]' };

const isCustom = (kind: string) => kind.startsWith('custom:');
const customName = (kind: string) => kind.replace(/^custom:/, '');
function metaFor(kind: Kind, colors: Record<string, number>): KindMeta {
  if (BUILTIN[kind]) return BUILTIN[kind];
  const name = customName(kind);
  const c = PALETTE[(colors[kind] ?? 0) % PALETTE.length];
  return {
    plural: name, single: name, bg: c.bg, ink: c.ink, icon: Sparkles,
    details: 'What is it?', insight: 'What do I think about it?', action: 'What will I do about it?', hint: `Add to ${name}`, hasStatus: true, defaultStatus: 'none',
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const niceDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };
const REVIEW_AFTER_DAYS = 7;

/** Turn a pasted list into clean one-line items: drops bullets, numbers and blanks, removes repeats. */
export function parseList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•–—·▪●]+|\d+[.)])\s*/, '').trim().slice(0, 160);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key); out.push(line);
  }
  return out.slice(0, 60);
}

/** Counts for the stat cards. "No action" items are only remembered, so they are not counted as work. */
export function selfStats(notes: Note[]) {
  const work = notes.filter(n => n.kind !== 'strength');
  return {
    strengths: notes.filter(n => n.kind === 'strength').length,
    open: work.filter(n => n.status === 'open').length,
    working: work.filter(n => n.status === 'working').length,
    resolved: work.filter(n => n.status === 'resolved').length,
  };
}

/** The oldest item you said you would work on that has not been touched for a week. */
export function pickReview(notes: Note[], now = Date.now()): Note | null {
  const cutoff = now - REVIEW_AFTER_DAYS * 86400000;
  const due = notes
    .filter(n => n.kind !== 'strength' && (n.status === 'open' || n.status === 'working') && new Date(n.updatedAt).getTime() < cutoff)
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  return due[0] ?? null;
}

type FormState = { kind: Kind; title: string; details: string; insight: string; action: string; dueDate: string; status: Status };
const blankFor = (kind: Kind, colors: Record<string, number>): FormState => ({ kind, title: '', details: '', insight: '', action: '', dueDate: '', status: metaFor(kind, colors).defaultStatus });

/* ─── Quick list: type many lines, add them all ────────────────────────── */
function QuickList({ kind, meta, busy, onAdd, idPrefix }: { kind: Kind; meta: KindMeta; busy: boolean; onAdd: (lines: string[]) => Promise<void>; idPrefix: string }) {
  const [text, setText] = useState('');
  const lines = parseList(text);
  return (
    <form className="space-y-2.5" data-testid={`${idPrefix}-quick`} onSubmit={e => { e.preventDefault(); if (lines.length && !busy) onAdd(lines).then(() => setText('')).catch(() => {}); }}>
      <Label htmlFor={`${idPrefix}-lines`} className="text-xs">One {kind.startsWith('custom:') ? 'item' : meta.single.toLowerCase()} per line. Paste a whole list if you like.</Label>
      <Textarea id={`${idPrefix}-lines`} rows={5} value={text} onChange={e => setText(e.target.value)} placeholder={`${meta.hint}\nAnother one\nAnd another…`} style={{ minHeight: '7.5rem' }} />
      <Button type="submit" disabled={!lines.length || busy} className="h-10 w-full text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }} data-testid={`${idPrefix}-quick-submit`}>
        <Plus className="mr-1.5 h-4 w-4" /> {busy ? 'Adding…' : lines.length ? `Add ${lines.length} ${lines.length === 1 ? 'item' : 'items'}` : 'Add to list'}
      </Button>
    </form>
  );
}

/* ─── Full form: one note with details ─────────────────────────────────── */
function NoteForm({ initial, submitLabel, saving, onSubmit, idPrefix, kinds, colors }: {
  initial: FormState; submitLabel: string; saving: boolean; onSubmit: (f: FormState) => void; idPrefix: string;
  kinds: Kind[]; colors: Record<string, number>;
}) {
  const [f, setF] = useState<FormState>(initial);
  const [statusTouched, setStatusTouched] = useState(false);
  useEffect(() => { setF(initial); setStatusTouched(false); }, [initial]);
  const set = (p: Partial<FormState>) => setF(prev => ({ ...prev, ...p }));
  const k = metaFor(f.kind, colors);
  return (
    <form className="space-y-3.5" onSubmit={e => { e.preventDefault(); if (f.title.trim()) onSubmit(f); }}>
      <div className="space-y-1.5">
        <Label className="text-xs">Type</Label>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
          {kinds.map(key => {
            const c = metaFor(key, colors); const on = f.kind === key;
            return (
              <button key={key} type="button" role="radio" aria-checked={on} onClick={() => set({ kind: key, ...(statusTouched ? {} : { status: c.defaultStatus }) })}
                className="min-h-[32px] rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors"
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
      {k.hasStatus && (
        <div className="space-y-1.5">
          <Label className="text-xs">Where is it?</Label>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F1F5F9] p-0.5 sm:grid-cols-4" role="radiogroup" aria-label="Status">
            {STATUS_ORDER.map(s => (
              <button key={s} type="button" role="radio" aria-checked={f.status === s} onClick={() => { setStatusTouched(true); set({ status: s }); }}
                className={`min-h-[34px] rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-colors ${f.status === s ? 'bg-white text-[#176B73] shadow-sm' : 'text-muted-foreground hover:text-[#17243D]'}`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {f.status === 'none' && <p className="text-[11px] text-muted-foreground">Just keeping it written down. It will not ask you to work on it.</p>}
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

  const { data: raw = [], isLoading } = useQuery<Note[]>({
    queryKey: NOTES_KEY,
    queryFn: () => api.getSelfNotes() as Promise<Note[]>,
  });
  const notes = useMemo(() => raw.filter(n => n.kind !== CATEGORY), [raw]);
  const cats = useMemo(() => raw.filter(n => n.kind === CATEGORY), [raw]);
  const colors = useMemo(() => {
    const m: Record<string, number> = {};
    cats.forEach(c => { m[`custom:${c.title}`] = Number(c.details) || 0; });
    return m;
  }, [cats]);
  // Your own categories: the ones you created, plus any that still have notes.
  const customKinds = useMemo(() => {
    const set = new Set<string>(cats.map(c => `custom:${c.title}`));
    notes.forEach(n => { if (isCustom(n.kind)) set.add(n.kind); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [cats, notes]);
  const kinds: Kind[] = useMemo(() => [...BUILTIN_ORDER, ...customKinds], [customKinds]);

  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [view, setView] = useState<'list' | 'detailed'>('list');
  const [addMode, setAddMode] = useState<'quick' | 'detailed'>('quick');
  const [addKind, setAddKind] = useState<Kind>('strength');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<Note | null>(null);
  const [seed, setSeed] = useState(0);
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);

  async function check<T>(p: Promise<T>): Promise<T> {
    const r: any = await p;
    if (r && typeof r === 'object' && !Array.isArray(r) && 'error' in r) throw new Error(String(r.error));
    return r;
  }
  const fail = (err: unknown) => toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
  const refresh = () => qc.invalidateQueries({ queryKey: NOTES_KEY });

  const addNote = useMutation({
    mutationFn: (b: Record<string, unknown>) => check(api.addSelfNote(b)),
    onSuccess: () => { refresh(); toast({ title: 'Saved' }); },
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
    onSettled: () => { refresh(); },
  });
  const removeNote = useMutation({
    mutationFn: (id: number) => api.deleteSelfNote(id),
    onSuccess: refresh,
    onError: fail,
  });

  const stats = useMemo(() => selfStats(notes), [notes]);
  const review = useMemo(() => pickReview(notes), [notes]);
  const today = todayStr();
  const filterMeta = filter === 'all' ? null : metaFor(filter, colors);

  const shown = useMemo(() => notes
    .filter(n => filter === 'all' || n.kind === filter)
    .sort((a, b) => {
      const ra = a.status === 'resolved' ? 1 : 0, rb = b.status === 'resolved' ? 1 : 0;
      if (ra !== rb) return ra - rb;
      const da = a.dueDate && a.status !== 'resolved' ? a.dueDate : '9999', db = b.dueDate && b.status !== 'resolved' ? b.dueDate : '9999';
      if (da !== db) return da.localeCompare(db);
      return b.id - a.id;
    }), [notes, filter]);

  function pickFilter(key: 'all' | Kind) {
    const next = filter === key ? 'all' : key;
    setFilter(next);
    if (next !== 'all') { setAddKind(next); setView(next === 'strength' || next === 'weakness' || isCustom(next) ? 'list' : 'detailed'); }
  }

  function payload(f: FormState) {
    const m = metaFor(f.kind, colors);
    return { kind: f.kind, title: f.title.trim(), details: f.details.trim() || null, insight: f.insight.trim() || null, action: f.action.trim() || null, dueDate: f.action.trim() && f.dueDate ? f.dueDate : null, status: m.hasStatus ? f.status : 'open' };
  }
  function submitNew(f: FormState) {
    addNote.mutate(payload(f), { onSuccess: () => { setAddKind(f.kind); setSeed(n => n + 1); } });
  }
  function submitEdit(f: FormState) {
    if (!editing) return;
    updateNote.mutate({ id: editing.id, body: payload(f) }, { onSuccess: () => setEditing(null) });
  }
  async function addMany(kind: Kind, lines: string[]) {
    const m = metaFor(kind, colors);
    setBulkBusy(true);
    try {
      for (const title of lines) await check(api.addSelfNote({ kind, title, status: m.hasStatus ? m.defaultStatus : 'open' }));
      toast({ title: lines.length === 1 ? 'Added 1 item' : `Added ${lines.length} items` });
    } catch (err) { fail(err); throw err; }
    finally { setBulkBusy(false); refresh(); }
  }
  async function createCategory() {
    const name = catName.trim();
    if (!name) return;
    const exists = kinds.some(k => metaFor(k, colors).single.toLowerCase() === name.toLowerCase());
    if (exists) { toast({ title: 'That name is already used', description: 'Pick a different name.', variant: 'destructive' }); return; }
    try {
      await check(api.addSelfNote({ kind: CATEGORY, title: name, details: String(catColor), status: 'none' }));
      await refresh();
      setCatOpen(false); setCatName(''); setCatColor(0);
      setFilter(`custom:${name}`); setAddKind(`custom:${name}`); setView('list');
      toast({ title: `"${name}" created`, description: 'Add your first items below.' });
    } catch (err) { fail(err); }
  }
  async function deleteCategory(kind: Kind) {
    const name = customName(kind);
    const mine = notes.filter(n => n.kind === kind);
    if (!window.confirm(`Delete "${name}"${mine.length ? ` and its ${mine.length} item${mine.length === 1 ? '' : 's'}` : ''}?`)) return;
    try {
      for (const n of mine) await api.deleteSelfNote(n.id);
      for (const c of cats.filter(c => c.title === name)) await api.deleteSelfNote(c.id);
      setFilter('all'); setAddKind('strength');
    } finally { refresh(); }
  }
  const toggleOpen = (id: number) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const nextStatus = (s: Status): Status => STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length];

  const statCards = [
    { label: 'Strengths', value: stats.strengths, icon: Dumbbell, bg: '#E1FAF3', ink: '#0F8F72' },
    { label: 'To work on', value: stats.open, icon: Target, bg: '#FDF8EB', ink: '#B8860B' },
    { label: 'In progress', value: stats.working, icon: RotateCcw, bg: '#F2F0FF', ink: '#7C6CFF' },
    { label: 'Worked on', value: stats.resolved, icon: Check, bg: '#DDF4F7', ink: '#176B73' },
  ];

  function renderDetailed(n: Note) {
    const k = metaFor(n.kind, colors); const Icon = k.icon; const isOpen = open.has(n.id);
    const overdue = !!n.dueDate && n.status !== 'resolved' && n.dueDate < today;
    return (
      <li key={n.id} data-testid={`self-note-${n.title}`} className={`rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] ${n.status === 'resolved' ? 'opacity-80' : ''}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: k.bg, color: k.ink }}><Icon className="h-5 w-5" /></span>
          <button type="button" onClick={() => toggleOpen(n.id)} aria-expanded={isOpen} className="min-w-0 flex-1 text-left">
            <span className="flex flex-wrap items-center gap-2">
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: k.bg, color: k.ink }}>{k.single}</span>
              {n.dueDate && n.action && <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${overdue ? 'text-[#D95757]' : 'text-[#64748B]'}`}><CalendarDays className="h-3 w-3" /> {overdue ? 'Overdue · ' : 'By '}{niceDate(n.dueDate)}</span>}
            </span>
            <span className={`mt-1 block break-words text-[15px] font-semibold leading-snug text-[#17243D] ${n.status === 'resolved' ? 'line-through decoration-[#94A3B8]' : ''}`}>{n.title}</span>
          </button>
          <button type="button" onClick={() => toggleOpen(n.id)} aria-label={isOpen ? 'Hide details' : 'Show details'} className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-[#F1F5F9]">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {k.hasStatus && (
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-[#F1F5F9] p-0.5" role="radiogroup" aria-label="Status">
            {STATUS_ORDER.map(s => (
              <button key={s} type="button" role="radio" aria-checked={n.status === s} onClick={() => n.status !== s && updateNote.mutate({ id: n.id, body: { status: s } })}
                className={`min-h-[34px] rounded-md px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors sm:text-[11px] ${n.status === s ? 'bg-white text-[#176B73] shadow-sm' : 'text-muted-foreground hover:text-[#17243D]'}`}>
                {STATUS_LABEL[s]}
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
              <button type="button" onClick={() => setEditing(n)} className="inline-flex min-h-[32px] items-center gap-1 text-[#176B73] hover:underline"><Pencil className="h-3 w-3" /> Edit</button>
              <button type="button" onClick={() => { if (window.confirm(`Delete "${n.title}"?`)) removeNote.mutate(n.id); }} className="inline-flex min-h-[32px] items-center gap-1 text-[#D95757] hover:underline"><Trash2 className="h-3 w-3" /> Delete</button>
            </div>
          </div>
        )}
      </li>
    );
  }

  function renderRow(n: Note) {
    const k = metaFor(n.kind, colors);
    return (
      <li key={n.id} data-testid={`self-row-${n.title}`} className="flex min-w-0 items-center gap-2.5 border-b border-[#EEF2F6] py-2 last:border-b-0">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: k.bg, color: k.ink }}>
          {n.kind === 'strength' ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: k.ink }} />}
        </span>
        <button type="button" onClick={() => setEditing(n)} className="min-w-0 flex-1 text-left" title="Tap to edit">
          <span className={`block break-words text-sm text-[#17243D] ${n.status === 'resolved' ? 'line-through decoration-[#94A3B8]' : ''}`}>{n.title}</span>
          {(n.details || n.insight || n.action) && <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"><FileText className="h-3 w-3" /> has notes</span>}
        </button>
        {k.hasStatus && n.status !== 'none' && (
          <button type="button" onClick={() => updateNote.mutate({ id: n.id, body: { status: nextStatus(n.status) } })} title="Tap to change" className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_TONE[n.status]}`}>{STATUS_LABEL[n.status]}</button>
        )}
        <button type="button" aria-label={`Edit ${n.title}`} onClick={() => setEditing(n)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F1F5F9]"><Pencil className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label={`Delete ${n.title}`} onClick={() => { if (window.confirm(`Delete "${n.title}"?`)) removeNote.mutate(n.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#D95757] hover:bg-[#FBEEEE]"><Trash2 className="h-3.5 w-3.5" /></button>
      </li>
    );
  }

  const addMeta = metaFor(addKind, colors);

  return (
    <div className="space-y-5" data-testid="know-myself">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#F2F0FF] text-[#7C6CFF] sm:h-20 sm:w-20"><Brain className="h-8 w-8 sm:h-10 sm:w-10" /></span>
        <div className="min-w-0">
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
          <p className="mt-2 text-sm font-semibold text-[#176B73]">{metaFor(review.kind, colors).single}: {review.title}</p>
          {review.action && <p className="mt-1 text-xs text-[#475569]">Plan: {review.action}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" className="bg-[#233B63] text-white hover:bg-[#17243D]" onClick={() => updateNote.mutate({ id: review.id, body: { status: review.status } })}>Still true</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => updateNote.mutate({ id: review.id, body: { status: 'resolved' } })}>Mark as worked on</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => updateNote.mutate({ id: review.id, body: { status: 'none' } })}>Not working on it</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(review)}>Edit</Button>
          </div>
        </div>
      )}

      {/* Categories: tap one to focus on it. The dashed card makes your own. */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6" data-testid="self-categories" role="tablist" aria-label="Filter">
        {kinds.map(key => {
          const m = metaFor(key, colors); const Icon = m.icon; const on = filter === key;
          const count = notes.filter(n => n.kind === key).length;
          return (
            <button key={key} type="button" role="tab" aria-selected={on} data-testid={`self-cat-${m.single}`} onClick={() => pickFilter(key)}
              className="flex min-h-[56px] min-w-0 items-center gap-2.5 rounded-2xl border bg-white p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderColor: on ? m.ink : '#E3EAF0', backgroundColor: on ? m.bg : '#fff', boxShadow: on ? `0 0 0 1px ${m.ink}` : undefined }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: m.bg, color: m.ink }}><Icon className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block truncate text-sm font-bold text-[#17243D]">{m.single}</span><span className="block text-[11px] text-muted-foreground">{count} {count === 1 ? 'item' : 'items'}</span></span>
            </button>
          );
        })}
        <button type="button" data-testid="self-new-category" onClick={() => setCatOpen(true)} className="flex min-h-[56px] min-w-0 items-center gap-2.5 rounded-2xl border-2 border-dashed border-[#B9C7E6] bg-[#F5F8FF] p-2.5 text-left transition-colors hover:bg-[#EAF0FF]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#233B63]"><Plus className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block truncate text-sm font-bold text-[#233B63]">Add a Note</span><span className="block text-[11px] text-muted-foreground">Create your own</span></span>
        </button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19.5rem]">
        <div className="min-w-0 space-y-4">
          {filterMeta && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E3EAF0] bg-white p-3" data-testid="self-focus">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: filterMeta.bg, color: filterMeta.ink }}><filterMeta.icon className="h-4 w-4" /></span>
                <div className="min-w-0"><p className="truncate font-heading text-base font-bold text-[#17243D]">{filterMeta.plural}</p><p className="text-[11px] text-muted-foreground">{shown.length} {shown.length === 1 ? 'item' : 'items'}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-[#E3EAF0] p-0.5" role="radiogroup" aria-label="View">
                  <button type="button" role="radio" aria-checked={view === 'list'} data-testid="self-view-list" onClick={() => setView('list')} className={`inline-flex min-h-[32px] items-center gap-1 rounded-md px-2.5 text-xs font-semibold ${view === 'list' ? 'bg-[#233B63] text-white' : 'text-muted-foreground'}`}><List className="h-3.5 w-3.5" />List</button>
                  <button type="button" role="radio" aria-checked={view === 'detailed'} data-testid="self-view-detailed" onClick={() => setView('detailed')} className={`inline-flex min-h-[32px] items-center gap-1 rounded-md px-2.5 text-xs font-semibold ${view === 'detailed' ? 'bg-[#233B63] text-white' : 'text-muted-foreground'}`}><FileText className="h-3.5 w-3.5" />Detailed</button>
                </div>
                {isCustom(filter) && <button type="button" data-testid="self-delete-category" onClick={() => deleteCategory(filter)} aria-label={`Delete ${filterMeta.single}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#D95757] hover:bg-[#FBEEEE]"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          )}

          {filterMeta && view === 'list' && (
            <div className="rounded-2xl border border-[#E3EAF0] bg-white p-4" data-testid="self-inline-wrap">
              <QuickList key={filter} kind={filter} meta={filterMeta} busy={bulkBusy} onAdd={lines => addMany(filter, lines)} idPrefix="self-inline" />
            </div>
          )}

          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && shown.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#D9E3E9] bg-white px-6 py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2F0FF] text-[#7C6CFF]"><Brain className="h-6 w-6" /></span>
              <p className="mt-3 font-heading text-base font-bold text-[#17243D]">{notes.length === 0 ? 'Start with one honest line' : 'Nothing here yet'}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Write a strength you trust, a regret you carry, a failure you learned from, or something you are unsure about.</p>
            </div>
          )}

          {shown.length > 0 && filterMeta && view === 'list' ? (
            <ul className="grid gap-x-8 rounded-2xl border border-[#E3EAF0] bg-white px-4 py-1 sm:grid-cols-2" data-testid="self-list">{shown.map(renderRow)}</ul>
          ) : (
            <ul className="space-y-3" data-testid="self-list">{shown.map(renderDetailed)}</ul>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-2" data-testid="self-add-card">
          <section className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-5">
            <h3 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-[#17243D]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#233B63] text-white"><Plus className="h-4 w-4" /></span> Add to my list
            </h3>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-[#F1F5F9] p-0.5" role="radiogroup" aria-label="Add style">
              <button type="button" role="radio" aria-checked={addMode === 'quick'} data-testid="self-mode-quick" onClick={() => setAddMode('quick')} className={`min-h-[34px] rounded-md px-2 text-xs font-semibold ${addMode === 'quick' ? 'bg-white text-[#176B73] shadow-sm' : 'text-muted-foreground'}`}>Quick list</button>
              <button type="button" role="radio" aria-checked={addMode === 'detailed'} data-testid="self-mode-detailed" onClick={() => setAddMode('detailed')} className={`min-h-[34px] rounded-md px-2 text-xs font-semibold ${addMode === 'detailed' ? 'bg-white text-[#176B73] shadow-sm' : 'text-muted-foreground'}`}>One with details</button>
            </div>
            {addMode === 'quick' ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Type">
                  {kinds.map(key => {
                    const c = metaFor(key, colors); const on = addKind === key;
                    return (
                      <button key={key} type="button" role="radio" aria-checked={on} onClick={() => setAddKind(key)} className="min-h-[32px] rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                        style={on ? { backgroundColor: c.bg, color: c.ink, borderColor: c.ink } : { backgroundColor: '#fff', color: '#64748B', borderColor: '#E3EAF0' }}>{c.single}</button>
                    );
                  })}
                </div>
                <QuickList key={`${addKind}-${seed}`} kind={addKind} meta={addMeta} busy={bulkBusy} onAdd={lines => addMany(addKind, lines)} idPrefix="self-new" />
              </div>
            ) : (
              <NoteForm key={seed} initial={blankFor(addKind, colors)} submitLabel="Save note" saving={addNote.isPending} onSubmit={submitNew} idPrefix="self-new" kinds={kinds} colors={colors} />
            )}
          </section>
        </aside>
      </div>

      <Dialog open={editing !== null} onOpenChange={o => { if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">Edit note</DialogTitle></DialogHeader>
          {editing && (
            <NoteForm
              initial={{ kind: editing.kind, title: editing.title, details: editing.details ?? '', insight: editing.insight ?? '', action: editing.action ?? '', dueDate: editing.dueDate ?? '', status: editing.status }}
              submitLabel="Save changes" saving={updateNote.isPending} onSubmit={submitEdit} idPrefix="self-edit" kinds={kinds} colors={colors}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm" data-testid="dialog-new-category">
          <DialogHeader><DialogTitle className="text-base">Create your own</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); createCategory(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="self-cat-name" className="text-xs">Name *</Label>
              <Input id="self-cat-name" value={catName} maxLength={40} autoComplete="off" placeholder="e.g. Fears, Dreams, Lessons, Habits to quit" onChange={e => setCatName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Colour</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
                {PALETTE.map((c, i) => (
                  <button key={i} type="button" role="radio" aria-checked={catColor === i} aria-label={`Colour ${i + 1}`} onClick={() => setCatColor(i)} className="flex h-9 w-9 items-center justify-center rounded-full border-2" style={{ backgroundColor: c.bg, borderColor: catColor === i ? c.ink : 'transparent' }}>
                    {catColor === i && <CircleCheckBig className="h-4 w-4" style={{ color: c.ink }} />}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={!catName.trim()} data-testid="self-create-category" className="h-10 w-full text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }}><Plus className="mr-1.5 h-4 w-4" /> Create</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
