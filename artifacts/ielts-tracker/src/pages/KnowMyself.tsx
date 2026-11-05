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
