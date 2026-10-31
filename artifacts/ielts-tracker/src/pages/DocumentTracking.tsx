import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { daysUntil } from '@/lib/utils/date';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardCheck, Plus, Pencil, Trash2, CheckCircle2, Circle, AlertTriangle,
  Clock, UserRound, Search, CalendarClock, FileText,
} from 'lucide-react';

/* ─── Types & helpers ───────────────────────────────────────────────────── */
interface DocRow {
  id: number;
  universityName: string;
  country: string | null;
  document: string;
  completeIn: string | null;
  submissionDeadline: string | null;
  dependencies: string | null;
  complete: boolean;
  createdAt: string;
}

type Kind = 'SOP' | 'LOM' | 'LOR' | 'Other';

/** Works out the document type from whatever you typed ("Motivation Letter" -> LOM). */
function docKind(name: string): Kind {
  const n = (name || '').toLowerCase();
  if (/\blor\b|recommend|referee|reference/.test(n)) return 'LOR';
  if (/\bsop\b|statement of purpose|personal statement/.test(n)) return 'SOP';
  if (/\blom\b|motivation|letter of intent/.test(n)) return 'LOM';
  return 'Other';
}

const KIND_META: Record<Kind, { label: string; hint: string; bg: string; ink: string }> = {
  SOP:   { label: 'SOP',   hint: 'Statement of Purpose',  bg: '#DDF4F7', ink: '#176B73' },
  LOM:   { label: 'LOM',   hint: 'Letter of Motivation',  bg: '#F2F0FF', ink: '#6A5CE0' },
  LOR:   { label: 'LOR',   hint: 'Letter of Recommendation', bg: '#FDF8EB', ink: '#B8860B' },
  Other: { label: 'Other', hint: 'CV, transcripts, forms…', bg: '#EEF2F6', ink: '#475569' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2027-01-10 -> "10 Jan" (adds the year when it is not the current year). */
function shortDate(d: string | null | undefined): string {
  if (!d) return '–';
  const p = d.split('-').map(Number);
  if (p.length < 3 || !p[0] || !p[1] || !p[2]) return d;
  const year = p[0] === new Date().getFullYear() ? '' : ` ${p[0]}`;
  return `${p[2]} ${MONTHS[p[1] - 1]}${year}`;
}

function norm(s: string) { return s.trim().toLowerCase(); }

const DOC_SUGGESTIONS = ['SOP', 'LOM', 'LOR', 'Motivation Letter', 'CV', 'Transcript', 'Passport', 'IELTS score', 'Certificates', 'Application form'];

type FormState = {
  universityName: string; country: string; document: string;
  completeIn: string; submissionDeadline: string; dependencies: string; complete: boolean;
};
const EMPTY_FORM: FormState = {
  universityName: '', country: '', document: '', completeIn: '', submissionDeadline: '', dependencies: '', complete: false,
};

type Filter = 'all' | 'todo' | 'done';

/* ─── Main tab ──────────────────────────────────────────────────────────── */
export function DocumentTrackingTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery<DocRow[]>({
    queryKey: ['document-tracking'],
    queryFn: () => api.getDocumentTracking() as Promise<DocRow[]>,
  });
  // Used only to suggest university names / countries you already track.
  const { data: applications = [] } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  function refresh() { qc.invalidateQueries({ queryKey: ['document-tracking'] }); }
  function fail(err: unknown) {
    toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
  }
  async function check<T>(p: Promise<T>): Promise<T> {
    const r: any = await p;
    if (r && typeof r === 'object' && 'error' in r) throw new Error(String(r.error));
    return r;
  }

  const addMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => check(api.addDocumentTracking(body)),
    onSuccess: () => { refresh(); toast({ title: '✅ Document added' }); },
    onError: fail,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => check(api.updateDocumentTracking(id, body)),
    onSuccess: () => refresh(),
    onError: fail,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteDocumentTracking(id),
    onSuccess: () => refresh(),
    onError: fail,
  });

  /* ── numbers for the overall card ── */
  const stats = useMemo(() => {
    const kinds: Record<Kind, { total: number; done: number }> = {
      SOP: { total: 0, done: 0 }, LOM: { total: 0, done: 0 }, LOR: { total: 0, done: 0 }, Other: { total: 0, done: 0 },
    };
    let done = 0, overdue = 0, dueSoon = 0, waiting = 0;
    let next: DocRow | null = null;
    rows.forEach(r => {
      const k = docKind(r.document);
      kinds[k].total++;
      if (r.complete) { done++; kinds[k].done++; return; }
      const d = daysUntil(r.completeIn);
      if (d !== null && d < 0) overdue++;
      else if (d !== null && d <= 7) dueSoon++;
      if (r.dependencies && r.dependencies.trim()) waiting++;
      const key = r.completeIn || r.submissionDeadline || '9999-12-31';
      const nextKey = next ? (next.completeIn || next.submissionDeadline || '9999-12-31') : '';
      if (!next || key < nextKey) next = r;
    });
    const total = rows.length;
    return { total, done, left: total - done, pct: total ? Math.round((done / total) * 100) : 0, kinds, overdue, dueSoon, waiting, next: next as DocRow | null };
  }, [rows]);

  /* ── grouped list ── */
  const groups = useMemo(() => {
    const q = norm(search);
    const visible = rows.filter(r => {
      if (filter === 'todo' && r.complete) return false;
      if (filter === 'done' && !r.complete) return false;
      if (!q) return true;
      return [r.universityName, r.country, r.document, r.dependencies].some(v => (v || '').toLowerCase().includes(q));
    });
    type Grp = { name: string; country: string | null; items: DocRow[] };
    const map = new Map<string, Grp>();
    visible.forEach(r => {
      const key = norm(r.universityName);
      const g: Grp = map.get(key) ?? { name: r.universityName, country: r.country, items: [] };
      if (!g.country && r.country) g.country = r.country;
      g.items.push(r);
      map.set(key, g);
    });
    const sortKey = (r: DocRow) => r.completeIn || r.submissionDeadline || '9999-12-31';
    const list = Array.from(map.values()).map(g => {
      g.items.sort((a, b) => Number(a.complete) - Number(b.complete) || sortKey(a).localeCompare(sortKey(b)) || a.id - b.id);
      const totalInUni = rows.filter(r => norm(r.universityName) === norm(g.name));
      const doneInUni = totalInUni.filter(r => r.complete).length;
      const nextOpen = g.items.find(i => !i.complete);
      return { ...g, total: totalInUni.length, done: doneInUni, order: nextOpen ? sortKey(nextOpen) : '~done' };
    });
    list.sort((a, b) => a.order.localeCompare(b.order) || a.name.localeCompare(b.name));
    return list;
  }, [rows, filter, search]);

  /* ── suggestions for the form ── */
  const universitySuggestions = useMemo(() => {
    const m = new Map<string, string>();
    (applications as any[]).forEach(a => a?.universityName && m.set(norm(a.universityName), a.universityName));
    rows.forEach(r => m.set(norm(r.universityName), r.universityName));
    return Array.from(m.values()).sort();
  }, [applications, rows]);
  const countrySuggestions = useMemo(() => {
    const m = new Set<string>();
    (applications as any[]).forEach(a => a?.country && m.add(a.country));
    rows.forEach(r => r.country && m.add(r.country));
    return Array.from(m).sort();
  }, [applications, rows]);

  function countryFor(uni: string): string {
    const key = norm(uni);
    const fromRow = rows.find(r => norm(r.universityName) === key && r.country);
    if (fromRow?.country) return fromRow.country;
    const fromApp = (applications as any[]).find(a => norm(a?.universityName || '') === key && a?.country);
    return fromApp?.country || '';
  }

  /* ── form actions ── */
  function openAdd(prefill?: Partial<FormState>) {
    setEditId(null);
    setForm({ ...EMPTY_FORM, ...prefill });
    setShowForm(true);
  }
  function openEdit(r: DocRow) {
    setEditId(r.id);
    setForm({
      universityName: r.universityName, country: r.country || '', document: r.document,
      completeIn: r.completeIn || '', submissionDeadline: r.submissionDeadline || '',
      dependencies: r.dependencies || '', complete: r.complete,
    });
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }

  const canSave = form.universityName.trim() !== '' && form.document.trim() !== '';
  function payload(f: FormState) {
    return {
      universityName: f.universityName.trim(),
      country: f.country.trim() || null,
      document: f.document.trim(),
      completeIn: f.completeIn || null,
      submissionDeadline: f.submissionDeadline || null,
      dependencies: f.dependencies.trim() || null,
      complete: f.complete,
    };
  }
  function save(addAnother: boolean) {
    if (!canSave) return;
    const body = payload(form);
    if (editId !== null) {
      updateMutation.mutate({ id: editId, body }, { onSuccess: () => { toast({ title: '✅ Updated' }); closeForm(); } });
      return;
    }
    addMutation.mutate(body, {
      onSuccess: () => {
        if (addAnother) {
          // keep the university-level fields so several documents can be entered quickly
          setForm(f => ({ ...EMPTY_FORM, universityName: f.universityName, country: f.country, completeIn: f.completeIn, submissionDeadline: f.submissionDeadline }));
        } else closeForm();
      },
    });
  }
  function toggle(r: DocRow) { updateMutation.mutate({ id: r.id, body: { complete: !r.complete } }); }
  function remove(r: DocRow) {
    if (window.confirm(`Delete "${r.document}" for ${r.universityName}?`)) deleteMutation.mutate(r.id);
  }

  const saving = addMutation.isPending || updateMutation.isPending;
  const kindOrder: Kind[] = ['SOP', 'LOM', 'LOR', 'Other'];

  return (
    <div className="space-y-6" data-testid="document-tracking">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">Fly · Document Tracking</p>
          <h2 className="mt-1 flex items-center gap-2 font-heading text-xl font-bold text-[#17243D]">
            <ClipboardCheck className="h-5 w-5 text-[#176B73]" /> Document Tracking
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Every document you need to write, edit or collect, per university.</p>
        </div>
        <Button onClick={() => openAdd()} data-testid="button-add-document" className="shrink-0 bg-[#233B63] text-white hover:bg-[#17243D]">
          <Plus className="mr-1.5 h-4 w-4" /> Add document
        </Button>
      </div>

      {/* overall card */}
      <div data-testid="document-overall-card" className="rounded-3xl p-5 text-white shadow-[0_12px_28px_rgba(23,36,61,.14)] sm:p-6" style={{ background: 'linear-gradient(120deg, #17243D, #233B63, #176B73)' }}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#A9DCE8]">Overall progress</p>
            <div className="mt-2 flex items-end gap-3">
              <span data-testid="text-docs-left" className="font-heading text-5xl font-bold leading-none">{stats.left}</span>
              <span className="pb-1 text-sm text-white/75">document{stats.left === 1 ? '' : 's'} left</span>
            </div>
            <p className="mt-2 text-sm text-white/80">
              <span data-testid="text-docs-done" className="font-semibold text-white">{stats.done}</span> of <span data-testid="text-docs-total" className="font-semibold text-white">{stats.total}</span> complete · {stats.pct}%
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={stats.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Documents completed">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stats.pct}%`, background: 'linear-gradient(90deg, #19C7B7, #42E6B8)' }} />
            </div>
            {stats.next && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-white/75">
                <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A9DCE8]" />
                <span>Next up: <span className="font-semibold text-white">{stats.next.document}</span> · {stats.next.universityName}{stats.next.completeIn ? ` · by ${shortDate(stats.next.completeIn)}` : ''}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {kindOrder.map(k => {
              const s = stats.kinds[k];
              const left = s.total - s.done;
              const m = KIND_META[k];
              return (
                <div key={k} data-testid={`doc-kind-${k}`} className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-sm" title={m.hint}>
                  <span className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide" style={{ backgroundColor: m.bg, color: m.ink }}>{m.label}</span>
                  <p className="mt-2 font-heading text-2xl font-bold leading-none">{left}<span className="ml-1 text-xs font-medium text-white/70">left</span></p>
                  <p className="mt-1 text-[11px] text-white/65">{s.done} of {s.total} done</p>
                </div>
              );
            })}
          </div>
        </div>

        {(stats.overdue > 0 || stats.dueSoon > 0 || stats.waiting > 0) && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3.5 text-xs font-medium">
            {stats.overdue > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D95757] px-3 py-1 text-white"><AlertTriangle className="h-3.5 w-3.5" />{stats.overdue} overdue</span>}
            {stats.dueSoon > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2C75C] px-3 py-1 text-[#17243D]"><Clock className="h-3.5 w-3.5" />{stats.dueSoon} due within 7 days</span>}
            {stats.waiting > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-white"><UserRound className="h-3.5 w-3.5" />{stats.waiting} waiting on someone</span>}
          </div>
        )}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        {([['all', `All (${rows.length})`], ['todo', `To do (${stats.left})`], ['done', `Complete (${stats.done})`]] as [Filter, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === id ? 'border-[#233B63] bg-[#233B63] text-white' : 'border-[#E3EAF0] bg-white text-muted-foreground hover:border-[#233B63]/40'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search university, document…" className="h-9 pl-8 text-sm" aria-label="Search documents" />
        </div>
      </div>

      {/* list */}
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D9E3E9] bg-white px-6 py-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DDF4F7] text-[#176B73]"><FileText className="h-6 w-6" /></span>
          <p className="mt-3 font-heading text-base font-bold text-[#17243D]">No documents yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Add each SOP, LOM, LOR or other document you need for a university, with the date you want it finished and its submission deadline.</p>
          <Button onClick={() => openAdd()} className="mt-4 bg-[#233B63] text-white hover:bg-[#17243D]"><Plus className="mr-1.5 h-4 w-4" /> Add your first document</Button>
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#D9E3E9] bg-white py-10 text-center text-sm text-muted-foreground">Nothing matches this filter.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(g => {
            const gPct = g.total ? Math.round((g.done / g.total) * 100) : 0;
            return (
              <section key={norm(g.name)} data-testid={`doc-group-${norm(g.name)}`} className="overflow-hidden rounded-2xl border border-[#E3EAF0] bg-white shadow-[0_8px_30px_rgba(23,36,61,.045)]">
                <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#E3EAF0] bg-[#F8FAFC] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-heading text-sm font-bold text-[#17243D]">{g.name}</h3>
                    {g.country && <p className="text-xs text-muted-foreground">{g.country}</p>}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#E3EAF0]"><div className="h-full rounded-full bg-[#19C7B7]" style={{ width: `${gPct}%` }} /></div>
                    <span className="text-xs font-semibold text-[#176B73]">{g.done}/{g.total} done</span>
                    <button
                      type="button"
                      onClick={() => openAdd({ universityName: g.name, country: g.country || '' })}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#176B73] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </header>

                <div className="hidden grid-cols-[2rem_minmax(0,1.5fr)_minmax(0,.9fr)_minmax(0,1fr)_minmax(0,1fr)_4.5rem] items-center gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
                  <span /><span>Document</span><span>Complete in</span><span>Submission deadline</span><span>Dependencies</span><span />
                </div>

                <ul className="divide-y divide-[#EEF2F6]">
                  {g.items.map(r => {
                    const kind = docKind(r.document);
                    const km = KIND_META[kind];
                    const cd = daysUntil(r.completeIn);
                    const sd = daysUntil(r.submissionDeadline);
                    const overdue = !r.complete && cd !== null && cd < 0;
                    const soon = !r.complete && cd !== null && cd >= 0 && cd <= 7;
                    const missed = !r.complete && sd !== null && sd < 0;
                    return (
                      <li key={r.id} data-testid={`doc-row-${r.id}`} className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[2rem_minmax(0,1.5fr)_minmax(0,.9fr)_minmax(0,1fr)_minmax(0,1fr)_4.5rem] md:items-center ${r.complete ? 'bg-[#FBFDFD]' : ''}`}>
                        <button
                          type="button"
                          onClick={() => toggle(r)}
                          aria-label={r.complete ? 'Mark as not complete' : 'Mark as complete'}
                          aria-pressed={r.complete}
                          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-[#AAB6C2] transition-colors hover:text-[#176B73] md:mt-0"
                        >
                          {r.complete ? <CheckCircle2 className="h-5 w-5 text-[#19C7B7]" /> : <Circle className="h-5 w-5" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-semibold ${r.complete ? 'text-muted-foreground line-through' : 'text-[#17243D]'}`}>{r.document}</span>
                            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: km.bg, color: km.ink }}>{km.label}</span>
                          </div>
                        </div>

                        <div className="col-start-3 row-start-1 flex items-center gap-1 justify-self-end md:hidden">
                          <button type="button" onClick={() => openEdit(r)} aria-label="Edit" className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#F1F5F7] hover:text-[#17243D]"><Pencil className="h-3.5 w-3.5" /></button>
                          <button type="button" onClick={() => remove(r)} aria-label="Delete" className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#FBEEEE] hover:text-[#D95757]"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>

                        <div className="col-span-3 col-start-1 grid grid-cols-2 gap-x-3 gap-y-1.5 pl-11 text-xs md:contents">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Complete in</p>
                            <p className="flex flex-wrap items-center gap-1.5 text-[#17243D]">
                              {shortDate(r.completeIn)}
                              {overdue && <span className="rounded-full bg-[#FBEEEE] px-2 py-0.5 text-[10px] font-semibold text-[#D95757]">Overdue</span>}
                              {soon && <span className="rounded-full bg-[#FDF8EB] px-2 py-0.5 text-[10px] font-semibold text-[#B8860B]">{cd === 0 ? 'Today' : `${cd}d left`}</span>}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Submission deadline</p>
                            <p className="flex flex-wrap items-center gap-1.5 text-[#17243D]">
                              {shortDate(r.submissionDeadline)}
                              {missed && <span className="rounded-full bg-[#FBEEEE] px-2 py-0.5 text-[10px] font-semibold text-[#D95757]">Passed</span>}
                            </p>
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Dependencies</p>
                            {r.dependencies
                              ? <p className="inline-flex items-center gap-1 text-[#475569]"><UserRound className="h-3 w-3 shrink-0 text-[#7C6CFF]" /><span className="break-words">{r.dependencies}</span></p>
                              : <p className="text-muted-foreground">–</p>}
                          </div>
                          <div className="hidden items-center justify-end gap-1 md:flex">
                            <button type="button" onClick={() => openEdit(r)} aria-label="Edit" className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#F1F5F7] hover:text-[#17243D]"><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => remove(r)} aria-label="Delete" className="rounded-lg p-1.5 text-muted-foreground hover:bg-[#FBEEEE] hover:text-[#D95757]"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* add / edit dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) closeForm(); }}>
        <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editId !== null ? 'Edit document' : 'Add document'}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => { e.preventDefault(); save(false); }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dt-uni">University name *</Label>
                <Input
                  id="dt-uni" list="dt-universities" value={form.universityName} autoComplete="off"
                  placeholder="e.g. University of Helsinki"
                  onChange={e => {
                    const v = e.target.value;
                    setForm(f => ({ ...f, universityName: v, country: f.country || countryFor(v) }));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dt-country">Country</Label>
                <Input id="dt-country" list="dt-countries" value={form.country} autoComplete="off" placeholder="e.g. Finland" onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dt-doc">Document *</Label>
              <Input id="dt-doc" list="dt-documents" value={form.document} autoComplete="off" placeholder="SOP, LOM, LOR, CV…" onChange={e => setForm(f => ({ ...f, document: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground">Pick a suggestion or type your own. SOP, LOM and LOR are counted separately on the overall card.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dt-complete-in">Complete in</Label>
                <Input id="dt-complete-in" type="date" value={form.completeIn} onChange={e => setForm(f => ({ ...f, completeIn: e.target.value }))} />
                <p className="text-[11px] text-muted-foreground">Your own target to finish it.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dt-deadline">Submission deadline</Label>
                <Input id="dt-deadline" type="date" value={form.submissionDeadline} onChange={e => setForm(f => ({ ...f, submissionDeadline: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dt-deps">Dependencies</Label>
              <Input id="dt-deps" value={form.dependencies} autoComplete="off" placeholder="Who or what you are waiting on, e.g. Asad Sir" onChange={e => setForm(f => ({ ...f, dependencies: e.target.value }))} />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#E3EAF0] bg-[#F8FAFC] px-3 py-2.5 text-sm font-medium text-[#17243D]">
              <input type="checkbox" className="h-4 w-4 accent-[#176B73]" checked={form.complete} onChange={e => setForm(f => ({ ...f, complete: e.target.checked }))} />
              Complete
            </label>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
              {editId === null && (
                <Button type="button" variant="outline" disabled={!canSave || saving} onClick={() => save(true)}>Save &amp; add another</Button>
              )}
              <Button type="submit" disabled={!canSave || saving} className="bg-[#233B63] text-white hover:bg-[#17243D]">
                {saving ? 'Saving…' : editId !== null ? 'Save changes' : 'Save'}
              </Button>
            </div>
          </form>

          <datalist id="dt-universities">{universitySuggestions.map(u => <option key={u} value={u} />)}</datalist>
          <datalist id="dt-countries">{countrySuggestions.map(c => <option key={c} value={c} />)}</datalist>
          <datalist id="dt-documents">{DOC_SUGGESTIONS.map(d => <option key={d} value={d} />)}</datalist>
        </DialogContent>
      </Dialog>
    </div>
  );
}
