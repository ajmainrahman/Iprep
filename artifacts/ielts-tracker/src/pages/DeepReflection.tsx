/* deep-reflection-v1 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  User, Gem, Star, Heart, History, Trophy, Users, Zap, Briefcase, Flower2, Sparkles, BookOpen, Compass, Moon, Target, Lightbulb,
  Plus, Pencil, Trash2, Check, ChevronLeft, ChevronRight, Flame, Shuffle, X, Search, CalendarDays,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Category { id: number; title: string; subtitle: string | null; intro: string | null; icon: string; color: number; position: number }
interface Question { id: number; categoryId: number; text: string; position: number }
interface Answer { id: number; questionId: number; date: string; body: string; tags: string; updatedAt: string }
interface Data { categories: Category[]; questions: Question[]; answers: Answer[] }
const KEY = ['reflection'];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User, gem: Gem, star: Star, heart: Heart, history: History, trophy: Trophy, users: Users, zap: Zap, briefcase: Briefcase,
  flower: Flower2, sparkles: Sparkles, book: BookOpen, compass: Compass, moon: Moon, target: Target, lightbulb: Lightbulb,
};
const ICON_KEYS = Object.keys(ICONS);
const PALETTE = [
  { bg: '#E1FAF3', ink: '#0F8F72' }, { bg: '#FDF8EB', ink: '#B8860B' }, { bg: '#E3F2FB', ink: '#1B6FA8' },
  { bg: '#FBEEEE', ink: '#D95757' }, { bg: '#F2F0FF', ink: '#6A5CE0' }, { bg: '#FCE9F3', ink: '#B5307A' },
];
const tone = (c: Category) => PALETTE[(c.color ?? 0) % PALETTE.length];

/* ─── Dates (local time) ────────────────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const niceDate = (s: string) => parseYmd(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const shortDate = (s: string) => parseYmd(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const splitTags = (t: string) => (t ? t.split(',').map(x => x.trim()).filter(Boolean) : []);
const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** One question per line. Drops bullets and numbers (also Bengali digits), blanks and repeats. */
export function parseLines(text: string): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•–—·▪●]+|[0-9০-৯]+[.)])\s*/, '').trim().slice(0, 500);
    if (!line) continue;
    const k = line.toLowerCase(); if (seen.has(k)) continue;
    seen.add(k); out.push(line);
  }
  return out.slice(0, 100);
}

/** Streak = days in a row with at least one answer, counting back from today (or yesterday if you have not answered yet today). */
export function computeStreak(dates: Set<string>, today: string): number {
  let d = dates.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (dates.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

/* ─── One question with its answer box ─────────────────────────────────── */
function QuestionCard({ q, index, saved, past, draft, saving, highlighted, onDraft, onSave, onEdit, onDelete, onOpenHistory }: {
  q: Question; index: number; saved: Answer | undefined; past: Answer[]; draft: { body?: string; tags?: string[] } | undefined; saving: boolean; highlighted: boolean;
  onDraft: (p: { body?: string; tags?: string[] }) => void; onSave: () => void; onEdit: () => void; onDelete: () => void; onOpenHistory: () => void;
}) {
  const [tagText, setTagText] = useState('');
  const [showPast, setShowPast] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (highlighted) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [highlighted]);
  const body = draft?.body ?? saved?.body ?? '';
  const tags = draft?.tags ?? splitTags(saved?.tags ?? '');
  const dirty = (draft?.body !== undefined && draft.body !== (saved?.body ?? '')) || (draft?.tags !== undefined && draft.tags.join(',') !== (saved?.tags ?? ''));
  const rows = Math.max(3, Math.min(12, body.split('\n').length + Math.floor(body.length / 90)));
  function addTag() {
    const t = tagText.replace(/,/g, ' ').trim().slice(0, 30);
    if (t && !tags.includes(t) && tags.length < 12) onDraft({ tags: [...tags, t] });
    setTagText('');
  }
  return (
    <li ref={ref} data-testid={`rq-${q.id}`} className={`rounded-2xl border bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.04)] transition-shadow ${highlighted ? 'border-[#176B73] ring-2 ring-[#A9DCE8]' : 'border-[#E3EAF0]'}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-xs font-bold text-[#233B63]">Q{index + 1}</span>
        <p className="min-w-0 flex-1 break-words pt-1.5 text-[15px] font-semibold leading-snug text-[#17243D]">{q.text}</p>
        <div className="flex shrink-0 items-center">
          <button type="button" aria-label="Edit question" onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F1F5F9]"><Pencil className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Delete question" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#D95757] hover:bg-[#FBEEEE]"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <Textarea
        aria-label={`Answer to: ${q.text}`} data-testid={`rq-${q.id}-body`} value={body} rows={rows} maxLength={20000}
        placeholder="Write honestly. No one is judging you here."
        className="mt-3 resize-y text-[15px] leading-relaxed" style={{ minHeight: '5.5rem' }}
        onChange={e => onDraft({ body: e.target.value })}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && dirty) { e.preventDefault(); onSave(); } }}
      />

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-semibold text-[#233B63]">{t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onDraft({ tags: tags.filter(x => x !== t) })} className="text-[#64748B] hover:text-[#D95757]"><X className="h-3 w-3" /></button>
          </span>
        ))}
        <input value={tagText} onChange={e => setTagText(e.target.value)} placeholder="+ tag" aria-label="Add a tag" maxLength={30}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} onBlur={addTag}
          className="h-7 w-20 rounded-full border border-dashed border-[#CBD5E1] bg-transparent px-2.5 text-[11px] outline-none focus:border-[#176B73]" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground" data-testid={`rq-${q.id}-state`}>
          {dirty ? 'Unsaved changes' : saved ? `Saved · ${words(saved.body)} words` : 'Not answered yet'}
          {!dirty && saved && <Check className="ml-1 inline h-3 w-3 text-[#0F8F72]" />}
        </span>
        <div className="flex items-center gap-2">
          {past.length > 0 && <button type="button" onClick={() => setShowPast(v => !v)} aria-expanded={showPast} className="min-h-[36px] px-1 text-xs font-semibold text-[#176B73] hover:underline">{showPast ? 'Hide' : 'Earlier'} answers ({past.length})</button>}
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={onSave} data-testid={`rq-${q.id}-save`} className="h-9 text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }}>
            <Check className="mr-1 h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {showPast && (
        <ul className="mt-3 space-y-2 border-t border-[#EEF2F6] pt-3" data-testid={`rq-${q.id}-past`}>
          {past.slice(0, 4).map(a => (
            <li key={a.id} className="rounded-xl bg-[#F8FAFC] p-3 text-xs">
              <p className="mb-1 flex items-center gap-1 font-semibold text-[#64748B]"><CalendarDays className="h-3 w-3" /> {niceDate(a.date)}</p>
              <p className="whitespace-pre-wrap break-words text-[#475569]">{a.body}</p>
            </li>
          ))}
          {past.length > 4 && <li><button type="button" onClick={onOpenHistory} className="text-xs font-semibold text-[#176B73] hover:underline">See all {past.length} in History</button></li>}
        </ul>
      )}
    </li>
  );
}

/* ─── Main tab ──────────────────────────────────────────────────────────── */
export function DeepReflectionTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = ymd(new Date());

  const { data, isLoading, isError } = useQuery<Data>({
    queryKey: KEY,
    queryFn: async () => {
      const r: any = await api.getReflection();
      if (!r || !Array.isArray(r.categories)) throw new Error(r?.error || 'Could not load');
      return r as Data;
    },
  });
  const categories = data?.categories ?? [];
  const questions = data?.questions ?? [];
  const answers = data?.answers ?? [];

  const [view, setView] = useState<'today' | 'history' | 'insights'>('today');
  const [catId, setCatId] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [drafts, setDrafts] = useState<Record<number, { body?: string; tags?: string[] }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [wantCat, setWantCat] = useState<number | null>(null); // a category you just created, selected as soon as it arrives
  const [catDlg, setCatDlg] = useState<{ edit: Category | null } | null>(null);
  const [qDlg, setQDlg] = useState<{ edit: Question | null } | null>(null);
  const [histCat, setHistCat] = useState<'all' | number>('all');
  const [histSearch, setHistSearch] = useState('');
  const [histLimit, setHistLimit] = useState(20);

  useEffect(() => {
    if (wantCat !== null) { if (categories.some(c => c.id === wantCat)) { setCatId(wantCat); setWantCat(null); } return; }
    if (categories.length && (catId === null || !categories.some(c => c.id === catId))) setCatId(categories[0].id);
  }, [categories, catId, wantCat]);
  useEffect(() => { setDrafts({}); }, [date]);
  useEffect(() => { if (catId !== null) document.querySelector(`[data-cat-id="${catId}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [catId]);
  useEffect(() => { if (highlight !== null) { const t = setTimeout(() => setHighlight(null), 2500); return () => clearTimeout(t); } }, [highlight]);

  const fail = (err: unknown) => toast({ title: 'Could not save', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  async function check<T>(p: Promise<T>): Promise<T> {
    const r: any = await p;
    if (r && typeof r === 'object' && !Array.isArray(r) && 'error' in r) throw new Error(String(r.error));
    return r;
  }

  const cat = categories.find(c => c.id === catId) ?? null;
  const qById = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);
  const catQuestions = useMemo(() => questions.filter(q => q.categoryId === catId), [questions, catId]);
  const answerKey = (qid: number, d: string) => `${qid}|${d}`;
  const answerMap = useMemo(() => new Map(answers.map(a => [answerKey(a.questionId, a.date), a])), [answers]);
  const pastFor = (qid: number) => answers.filter(a => a.questionId === qid && a.date < date && a.body.trim()).sort((a, b) => b.date.localeCompare(a.date));

  const answeredOn = (d: string, qs: Question[]) => qs.filter(q => (answerMap.get(answerKey(q.id, d))?.body ?? '').trim()).length;
  const dateSet = useMemo(() => new Set(answers.filter(a => a.body.trim()).map(a => a.date)), [answers]);
  const streak = useMemo(() => computeStreak(dateSet, today), [dateSet, today]);
  const monthPrefix = today.slice(0, 7);
  const thisMonth = answers.filter(a => a.date.startsWith(monthPrefix) && a.body.trim()).length;
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(today, -(29 - i)));
  const activeDays30 = last30.filter(d => dateSet.has(d)).length;
  const rate = Math.round((activeDays30 / 30) * 100);
  const totalAnswers = answers.filter(a => a.body.trim()).length;
  const todayCount = answers.filter(a => a.date === today && a.body.trim()).length;

  const saveAnswer = useMutation({
    mutationFn: (v: { questionId: number; date: string; body: string; tags: string[] }) => check(api.saveReflectionAnswer(v)),
    onSuccess: (_r, v) => { setDrafts(d => { const n = { ...d }; delete n[v.questionId]; return n; }); refresh(); },
    onError: fail,
    onSettled: () => setSavingId(null),
  });
  function save(q: Question) {
    const saved = answerMap.get(answerKey(q.id, date));
    const dr = drafts[q.id]; if (!dr) return;
    setSavingId(q.id);
    saveAnswer.mutate({ questionId: q.id, date, body: dr.body ?? saved?.body ?? '', tags: dr.tags ?? splitTags(saved?.tags ?? '') });
  }
  function setDraft(qid: number, p: { body?: string; tags?: string[] }) { setDrafts(d => ({ ...d, [qid]: { ...d[qid], ...p } })); }

  const catMut = useMutation({
    mutationFn: (v: { id?: number; body: Record<string, unknown> }) => check(v.id ? api.updateReflectionCategory(v.id, v.body) : api.addReflectionCategory(v.body)),
    onSuccess: (r: any, v) => { if (!v.id && r?.id) { setWantCat(r.id); setView('today'); } refresh(); setCatDlg(null); toast({ title: v.id ? 'Category updated' : 'Category added' }); },
    onError: fail,
  });
  const questionMut = useMutation({
    mutationFn: (v: { id?: number; categoryId: number; texts: string[] }) =>
      v.id ? check(api.updateReflectionQuestion(v.id, { text: v.texts[0], categoryId: v.categoryId }))
      : v.texts.length > 1 ? check(api.bulkReflectionQuestions({ categoryId: v.categoryId, texts: v.texts }))
      : check(api.addReflectionQuestion({ categoryId: v.categoryId, text: v.texts[0] })),
    onSuccess: (_r, v) => { refresh(); setQDlg(null); toast({ title: v.id ? 'Question updated' : v.texts.length > 1 ? `${v.texts.length} questions added` : 'Question added' }); },
    onError: fail,
  });

  async function removeCategory(c: Category) {
    const n = questions.filter(q => q.categoryId === c.id).length;
    if (!window.confirm(`Delete "${c.title}"${n ? ` with its ${n} question${n === 1 ? '' : 's'} and all answers` : ''}? This cannot be undone.`)) return;
    try { await check(api.deleteReflectionCategory(c.id)); setCatId(null); } catch (e) { fail(e); } finally { refresh(); }
  }
  async function removeQuestion(q: Question) {
    const n = answers.filter(a => a.questionId === q.id).length;
    if (!window.confirm(`Delete this question${n ? ` and its ${n} saved answer${n === 1 ? '' : 's'}` : ''}?`)) return;
    try { await check(api.deleteReflectionQuestion(q.id)); } catch (e) { fail(e); } finally { refresh(); }
  }
  function surprise() {
    const open = questions.filter(q => !(answerMap.get(answerKey(q.id, date))?.body ?? '').trim());
    if (!open.length) { toast({ title: 'All questions answered for this day. Well done.' }); return; }
    const q = open[Math.floor(Math.random() * open.length)];
    setCatId(q.categoryId); setView('today'); setHighlight(q.id);
  }
  function openQuestion(qid: number, d: string) {
    const q = qById.get(qid); if (!q) return;
    setCatId(q.categoryId); setDate(d); setView('today'); setHighlight(qid);
  }

  /* ─ Insights ─ */
  const insights = useMemo(() => {
    const perDay = last30.map(d => ({ d, n: answers.filter(a => a.date === d && a.body.trim()).length }));
    const maxDay = Math.max(1, ...perDay.map(x => x.n));
    const byCat = categories.map(c => {
      const qs = questions.filter(q => q.categoryId === c.id); const ids = new Set(qs.map(q => q.id));
      const ever = new Set(answers.filter(a => ids.has(a.questionId) && a.body.trim()).map(a => a.questionId)).size;
      const recent = answers.filter(a => ids.has(a.questionId) && a.body.trim() && a.date >= last30[0]).length;
      return { c, total: qs.length, ever, recent };
    });
    const lastAnswered = new Map<number, string>(); const counts = new Map<number, number>();
    answers.forEach(a => { if (!a.body.trim()) return; counts.set(a.questionId, (counts.get(a.questionId) ?? 0) + 1); if (!lastAnswered.has(a.questionId) || a.date > lastAnswered.get(a.questionId)!) lastAnswered.set(a.questionId, a.date); });
    const waiting = questions.map(q => ({ q, last: lastAnswered.get(q.id) ?? null }))
      .sort((a, b) => (a.last ?? '').localeCompare(b.last ?? '')).slice(0, 5);
    const top = questions.map(q => ({ q, n: counts.get(q.id) ?? 0 })).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3);
    const neverCount = questions.filter(q => !counts.has(q.id)).length;
    const wordTotal = answers.reduce((a, x) => a + words(x.body), 0);
    return { perDay, maxDay, byCat, waiting, top, neverCount, wordTotal };
  }, [answers, questions, categories]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─ History ─ */
  const historyRows = useMemo(() => {
    const s = histSearch.trim().toLowerCase();
    return answers.filter(a => a.body.trim())
      .filter(a => { const q = qById.get(a.questionId); if (!q) return false; if (histCat !== 'all' && q.categoryId !== histCat) return false; return !s || a.body.toLowerCase().includes(s) || q.text.toLowerCase().includes(s) || a.tags.toLowerCase().includes(s); })
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [answers, qById, histCat, histSearch]);

  const stats = [
    { label: 'Categories', value: categories.length, icon: Sparkles, bg: '#F2F0FF', ink: '#7C6CFF' },
    { label: 'Total reflections', value: totalAnswers, icon: Pencil, bg: '#E3F2FB', ink: '#1B6FA8' },
    { label: 'This month', value: thisMonth, icon: CalendarDays, bg: '#E1FAF3', ink: '#0F8F72' },
    { label: 'Reflection rate', value: `${rate}%`, icon: Target, bg: '#FDF8EB', ink: '#B8860B' },
  ];

  if (isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (isError) return <p className="py-10 text-center text-sm text-[#D95757]">Could not load Deep Reflection. Check that the server is running and try again.</p>;

  return (
    <div className="space-y-5" data-testid="deep-reflection">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#E1FAF3] text-[#0F8F72] sm:h-20 sm:w-20"><Sparkles className="h-8 w-8 sm:h-10 sm:w-10" /></span>
          <div className="min-w-0">
            <h2 className="font-heading text-3xl font-bold leading-tight text-[#17243D]">Deep Reflection</h2>
            <p className="mt-1 text-sm text-[#475569]">Ask. Reflect. Grow. A deeper journey to know yourself.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-[#FFF6DD] px-4 py-2.5" data-testid="rf-streak">
          <Flame className="h-6 w-6 text-[#F2994A]" />
          <div><p className="text-sm font-bold text-[#17243D]">{streak} {streak === 1 ? 'day' : 'days'} streak</p><p className="text-[11px] text-[#64748B]">{todayCount > 0 ? `${todayCount} answered today` : 'Answer one today'}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-2xl border border-[#E3EAF0] bg-white p-3 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:gap-4 sm:p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14" style={{ backgroundColor: s.bg, color: s.ink }}><s.icon className="h-4 w-4 sm:h-6 sm:w-6" /></span>
            <div className="min-w-0"><p className="whitespace-nowrap font-heading text-xl font-bold leading-none text-[#17243D] sm:text-[1.7rem]">{s.value}</p><p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p></div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[#E3EAF0]" role="tablist" aria-label="Deep Reflection views">
        {([['today', "Today's Reflection"], ['history', 'History'], ['insights', 'Insights']] as const).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={view === k} data-testid={`rf-tab-${k}`} onClick={() => setView(k)}
            className={`min-h-[44px] shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors ${view === k ? 'border-[#176B73] text-[#176B73]' : 'border-transparent text-muted-foreground hover:text-[#17243D]'}`}>{label}</button>
        ))}
      </div>

      {/* ───── TODAY ───── */}
      {view === 'today' && (
        <div className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-2xl border border-[#E3EAF0] bg-white p-3 shadow-[0_8px_30px_rgba(23,36,61,.045)] sm:p-4" data-testid="rf-categories">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-heading text-base font-bold text-[#17243D]">Reflection Categories</h3>
              <Button type="button" size="sm" variant="outline" className="h-9" data-testid="rf-add-category" onClick={() => setCatDlg({ edit: null })}><Plus className="mr-1 h-3.5 w-3.5" /> Add Category</Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
              {categories.map(c => {
                const t = tone(c); const Icon = ICONS[c.icon] ?? Sparkles; const on = c.id === catId;
                const qs = questions.filter(q => q.categoryId === c.id);
                const done = answeredOn(date, qs);
                return (
                  <button key={c.id} type="button" data-cat-id={c.id} data-testid={`rf-cat-${c.title}`} onClick={() => setCatId(c.id)} aria-current={on}
                    className="flex min-h-[56px] w-56 shrink-0 items-center gap-3 rounded-2xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md lg:w-full"
                    style={{ borderColor: on ? t.ink : '#E3EAF0', backgroundColor: on ? t.bg : '#fff', boxShadow: on ? `0 0 0 1px ${t.ink}` : undefined }}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: t.bg, color: t.ink }}><Icon className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-[#17243D]">{c.title}</span><span className="block truncate text-[11px] text-muted-foreground">{c.subtitle || 'My own category'}</span></span>
                    <span className="shrink-0 text-right"><span className="block text-xs font-bold" style={{ color: done === qs.length && qs.length ? '#0F8F72' : '#64748B' }}>{done}/{qs.length}</span><span className="block text-[10px] text-muted-foreground">today</span></span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            {cat ? (
              <>
                <div className="rounded-2xl border border-[#E3EAF0] bg-white p-4 shadow-[0_8px_30px_rgba(23,36,61,.045)]" data-testid="rf-cat-header">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {(() => { const t = tone(cat); const Icon = ICONS[cat.icon] ?? Sparkles; return <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: t.bg, color: t.ink }}><Icon className="h-6 w-6" /></span>; })()}
                      <div className="min-w-0"><h3 className="truncate font-heading text-xl font-bold text-[#17243D]">{cat.title}</h3><p className="truncate text-sm text-muted-foreground">{cat.subtitle}</p></div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" size="sm" variant="outline" className="h-9" onClick={surprise} data-testid="rf-surprise"><Shuffle className="mr-1 h-3.5 w-3.5" /> Surprise me</Button>
                      <button type="button" aria-label="Edit category" onClick={() => setCatDlg({ edit: cat })} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#F1F5F9]"><Pencil className="h-4 w-4" /></button>
                      <button type="button" aria-label="Delete category" onClick={() => removeCategory(cat)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[#D95757] hover:bg-[#FBEEEE]"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {cat.intro && <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#EEF2FF] px-3 py-2.5 text-sm text-[#233B63]"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#B8860B]" /> {cat.intro}</p>}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1" data-testid="rf-date">
                      <button type="button" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))} className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-[#F1F5F9]"><ChevronLeft className="h-4 w-4" /></button>
                      <label className="relative"><span className="sr-only">Date</span>
                        <input type="date" value={date} max={today} onChange={e => e.target.value && e.target.value <= today && setDate(e.target.value)} className="h-9 rounded-lg border bg-white px-2 text-sm font-semibold text-[#17243D]" />
                      </label>
                      <button type="button" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-[#F1F5F9] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                      {date !== today && <button type="button" onClick={() => setDate(today)} className="ml-1 min-h-[36px] px-2 text-xs font-semibold text-[#176B73] hover:underline">Back to today</button>}
                    </div>
                    <p className="text-xs font-semibold text-[#64748B]" data-testid="rf-progress">{answeredOn(date, catQuestions)} of {catQuestions.length} answered{date === today ? ' today' : ` on ${shortDate(date)}`}</p>
                  </div>
                  {date !== today && <p className="mt-2 rounded-lg bg-[#FDF8EB] px-3 py-1.5 text-xs text-[#B8860B]">You are writing for {niceDate(date)}.</p>}
                </div>

                {catQuestions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#D9E3E9] bg-white px-6 py-8 text-center">
                    <p className="font-heading text-base font-bold text-[#17243D]">No questions here yet</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Add the questions you want to answer. Put one question on each line to add many at once.</p>
                  </div>
                ) : (
                  <ul className="space-y-3" data-testid="rf-questions">
                    {catQuestions.map((q, i) => (
                      <QuestionCard key={q.id} q={q} index={i} saved={answerMap.get(answerKey(q.id, date))} past={pastFor(q.id)} draft={drafts[q.id]}
                        saving={savingId === q.id} highlighted={highlight === q.id}
                        onDraft={p => setDraft(q.id, p)} onSave={() => save(q)} onEdit={() => setQDlg({ edit: q })} onDelete={() => removeQuestion(q)}
                        onOpenHistory={() => { setHistCat(cat.id); setHistSearch(q.text.slice(0, 20)); setView('history'); }} />
                    ))}
                  </ul>
                )}
                <Button type="button" variant="outline" className="h-11 w-full border-dashed" data-testid="rf-add-question" onClick={() => setQDlg({ edit: null })}><Plus className="mr-1.5 h-4 w-4" /> Add question{catQuestions.length ? 's' : ''}</Button>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D9E3E9] bg-white px-6 py-10 text-center">
                <p className="font-heading text-base font-bold text-[#17243D]">No categories yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create a category, then add your questions.</p>
                <Button type="button" className="mt-4 text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }} onClick={() => setCatDlg({ edit: null })}><Plus className="mr-1.5 h-4 w-4" /> Add Category</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── HISTORY ───── */}
      {view === 'history' && (
        <div className="space-y-4" data-testid="rf-history">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 basis-56"><span className="sr-only">Search answers</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={histSearch} onChange={e => { setHistSearch(e.target.value); setHistLimit(20); }} placeholder="Search your answers" className="h-10 pl-9" />
            </label>
            <label><span className="sr-only">Category</span>
              <select value={histCat} onChange={e => { setHistCat(e.target.value === 'all' ? 'all' : Number(e.target.value)); setHistLimit(20); }} className="h-10 max-w-full rounded-lg border bg-white px-3 text-sm">
                <option value="all">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>
          </div>
          {historyRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D9E3E9] bg-white px-6 py-10 text-center text-sm text-muted-foreground">{totalAnswers ? 'No answers match your search.' : 'Your saved answers will appear here, newest first.'}</div>
          ) : (
            <ul className="space-y-3">
              {historyRows.slice(0, histLimit).map((a, i, arr) => {
                const q = qById.get(a.questionId)!; const c = categories.find(x => x.id === q.categoryId); const t = c ? tone(c) : PALETTE[0];
                const newDay = i === 0 || arr[i - 1].date !== a.date;
                return (
                  <li key={a.id} data-testid={`hist-${a.id}`}>
                    {newDay && <p className="mb-2 mt-1 text-xs font-bold uppercase tracking-[0.08em] text-[#64748B]">{niceDate(a.date)}</p>}
                    <div className="rounded-2xl border border-[#E3EAF0] bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {c && <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: t.bg, color: t.ink }}>{c.title}</span>}
                        {splitTags(a.tags).map(tag => <span key={tag} className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#233B63]">{tag}</span>)}
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold text-[#17243D]">{q.text}</p>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#475569]">{a.body}</p>
                      <button type="button" onClick={() => openQuestion(a.questionId, a.date)} className="mt-2 min-h-[32px] text-xs font-semibold text-[#176B73] hover:underline">Open and edit</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {historyRows.length > histLimit && <Button type="button" variant="outline" className="w-full" onClick={() => setHistLimit(n => n + 20)}>Show more ({historyRows.length - histLimit} left)</Button>}
        </div>
      )}

      {/* ───── INSIGHTS ───── */}
      {view === 'insights' && (
        <div className="space-y-4" data-testid="rf-insights">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-[#E3EAF0] bg-white p-4 sm:p-5">
              <h3 className="font-heading text-base font-bold text-[#17243D]">Answers, last 30 days</h3>
              <div className="mt-4 flex h-28 items-end gap-[3px]" data-testid="rf-strip">
                {insights.perDay.map(x => <div key={x.d} title={`${shortDate(x.d)}: ${x.n}`} className="flex h-full min-w-0 flex-1 items-end"><div className="w-full rounded-t-sm" style={{ height: `${Math.max(x.n ? 10 : 3, (x.n / insights.maxDay) * 100)}%`, backgroundColor: x.n ? '#176B73' : '#EDF0F4' }} /></div>)}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{shortDate(last30[0])}</span><span>today</span></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#DDF4F7] p-2"><p className="font-heading text-lg font-bold text-[#176B73]">{activeDays30}/30</p><p className="text-[10px] text-[#176B73]">days reflected</p></div>
                <div className="rounded-xl bg-[#F2F0FF] p-2"><p className="font-heading text-lg font-bold text-[#7C6CFF]">{streak}</p><p className="text-[10px] text-[#7C6CFF]">day streak</p></div>
                <div className="rounded-xl bg-[#FDF8EB] p-2"><p className="font-heading text-lg font-bold text-[#B8860B]">{insights.wordTotal.toLocaleString()}</p><p className="text-[10px] text-[#B8860B]">words written</p></div>
              </div>
            </section>
            <section className="min-w-0 rounded-2xl border border-[#E3EAF0] bg-white p-4 sm:p-5">
              <h3 className="font-heading text-base font-bold text-[#17243D]">Coverage by category</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Questions you have answered at least once.</p>
              <div className="mt-4 space-y-3">
                {insights.byCat.map(({ c, total, ever, recent }) => { const t = tone(c); const pct = total ? Math.round((ever / total) * 100) : 0; return (
                  <div key={c.id} data-testid={`cov-${c.title}`}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="truncate font-semibold text-[#17243D]">{c.title}</span><span className="shrink-0 text-muted-foreground">{ever}/{total} · {recent} in 30 days</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F4]"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: t.ink }} /></div>
                  </div>
                ); })}
              </div>
            </section>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-[#E3EAF0] bg-white p-4 sm:p-5" data-testid="rf-waiting">
              <h3 className="font-heading text-base font-bold text-[#17243D]">Waiting the longest</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{insights.neverCount} of {questions.length} questions have never been answered.</p>
              <ul className="mt-3 space-y-2">
                {insights.waiting.map(({ q, last }) => (
                  <li key={q.id}><button type="button" onClick={() => openQuestion(q.id, today)} className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border p-2.5 text-left hover:bg-[#F8FAFC]">
                    <span className="min-w-0 flex-1"><span className="line-clamp-2 break-words text-sm font-medium text-[#17243D]">{q.text}</span><span className="block text-[10px] text-muted-foreground">{last ? `last answered ${niceDate(last)}` : 'never answered'}</span></span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button></li>
                ))}
                {insights.waiting.length === 0 && <li className="text-xs text-muted-foreground">Add some questions first.</li>}
              </ul>
            </section>
            <section className="min-w-0 rounded-2xl border border-[#E3EAF0] bg-white p-4 sm:p-5">
              <h3 className="font-heading text-base font-bold text-[#17243D]">Questions you return to most</h3>
              {insights.top.length === 0 ? <p className="mt-3 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Answer a question on different days to see how your thinking changes.</p> : (
                <ul className="mt-3 space-y-2">{insights.top.map(({ q, n }) => <li key={q.id} className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] p-3"><span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-[#DDF4F7] px-2 text-xs font-bold text-[#176B73]">{n}×</span><span className="min-w-0 break-words text-sm text-[#17243D]">{q.text}</span></li>)}</ul>
              )}
            </section>
          </div>
        </div>
      )}

      <CategoryDialog state={catDlg} saving={catMut.isPending} onClose={() => setCatDlg(null)} onSubmit={(id, body) => catMut.mutate({ id, body })} />
      <QuestionDialog state={qDlg} categoryId={cat?.id ?? null} categories={categories} saving={questionMut.isPending} onClose={() => setQDlg(null)} onSubmit={(id, categoryId, texts) => questionMut.mutate({ id, categoryId, texts })} />
    </div>
  );
}

/* ─── Dialogs ───────────────────────────────────────────────────────────── */
function CategoryDialog({ state, saving, onClose, onSubmit }: { state: { edit: Category | null } | null; saving: boolean; onClose: () => void; onSubmit: (id: number | undefined, body: Record<string, unknown>) => void }) {
  const edit = state?.edit ?? null;
  const [title, setTitle] = useState(''); const [subtitle, setSubtitle] = useState(''); const [intro, setIntro] = useState('');
  const [icon, setIcon] = useState('sparkles'); const [color, setColor] = useState(0);
  useEffect(() => {
    if (!state) return;
    setTitle(edit?.title ?? ''); setSubtitle(edit?.subtitle ?? ''); setIntro(edit?.intro ?? ''); setIcon(edit?.icon ?? 'sparkles'); setColor(edit?.color ?? 0);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={state !== null} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto" data-testid="dialog-category">
        <DialogHeader><DialogTitle className="text-base">{edit ? 'Edit category' : 'Add category'}</DialogTitle></DialogHeader>
        <form className="space-y-3.5" onSubmit={e => { e.preventDefault(); if (title.trim()) onSubmit(edit?.id, { title: title.trim(), subtitle: subtitle.trim() || null, intro: intro.trim() || null, icon, color }); }}>
          <div className="space-y-1.5"><Label htmlFor="rf-c-title" className="text-xs">Name *</Label><Input id="rf-c-title" value={title} maxLength={80} autoComplete="off" onChange={e => setTitle(e.target.value)} placeholder="e.g. Fears, Gratitude, My Work" /></div>
          <div className="space-y-1.5"><Label htmlFor="rf-c-sub" className="text-xs">Short line (optional)</Label><Input id="rf-c-sub" value={subtitle} maxLength={120} onChange={e => setSubtitle(e.target.value)} placeholder="e.g. What I am afraid of" /></div>
          <div className="space-y-1.5"><Label htmlFor="rf-c-intro" className="text-xs">Why this category? (optional)</Label><Textarea id="rf-c-intro" rows={2} value={intro} maxLength={300} onChange={e => setIntro(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Icon</Label>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
              {ICON_KEYS.map(k => { const I = ICONS[k]; const on = icon === k; const t = PALETTE[color % PALETTE.length]; return (
                <button key={k} type="button" role="radio" aria-checked={on} aria-label={k} onClick={() => setIcon(k)} className="flex h-10 w-10 items-center justify-center rounded-xl border-2" style={{ backgroundColor: on ? t.bg : '#fff', color: on ? t.ink : '#64748B', borderColor: on ? t.ink : '#E3EAF0' }}><I className="h-5 w-5" /></button>
              ); })}
            </div>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Colour</Label>
            <div className="flex gap-2" role="radiogroup" aria-label="Colour">
              {PALETTE.map((c, i) => <button key={i} type="button" role="radio" aria-checked={color === i} aria-label={`Colour ${i + 1}`} onClick={() => setColor(i)} className="flex h-9 w-9 items-center justify-center rounded-full border-2" style={{ backgroundColor: c.bg, borderColor: color === i ? c.ink : 'transparent' }}>{color === i && <Check className="h-4 w-4" style={{ color: c.ink }} />}</button>)}
            </div>
          </div>
          <Button type="submit" disabled={!title.trim() || saving} data-testid="rf-save-category" className="h-10 w-full text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }}>{saving ? 'Saving…' : edit ? 'Save changes' : 'Add category'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuestionDialog({ state, categoryId, categories, saving, onClose, onSubmit }: { state: { edit: Question | null } | null; categoryId: number | null; categories: Category[]; saving: boolean; onClose: () => void; onSubmit: (id: number | undefined, categoryId: number, texts: string[]) => void }) {
  const edit = state?.edit ?? null;
  const [text, setText] = useState(''); const [cid, setCid] = useState<number | null>(categoryId);
  useEffect(() => { if (state) { setText(edit?.text ?? ''); setCid(edit?.categoryId ?? categoryId); } }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const lines = edit ? [text.trim()].filter(Boolean) : parseLines(text);
  return (
    <Dialog open={state !== null} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto" data-testid="dialog-question">
        <DialogHeader><DialogTitle className="text-base">{edit ? 'Edit question' : 'Add questions'}</DialogTitle></DialogHeader>
        <form className="space-y-3.5" onSubmit={e => { e.preventDefault(); if (lines.length && cid !== null) onSubmit(edit?.id, cid, lines); }}>
          <div className="space-y-1.5"><Label htmlFor="rf-q-cat" className="text-xs">Category</Label>
            <select id="rf-q-cat" value={cid ?? ''} onChange={e => setCid(Number(e.target.value))} className="h-10 w-full rounded-lg border bg-white px-3 text-sm">{categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="rf-q-text" className="text-xs">{edit ? 'Question' : 'One question per line. Paste a whole list if you like.'}</Label>
            <Textarea id="rf-q-text" rows={edit ? 3 : 7} value={text} maxLength={edit ? 500 : 20000} onChange={e => setText(e.target.value)} placeholder={edit ? '' : 'What am I most grateful for today?\nWhat did I avoid today, and why?'} style={{ minHeight: edit ? '5rem' : '10rem' }} />
          </div>
          <Button type="submit" disabled={!lines.length || cid === null || saving} data-testid="rf-save-question" className="h-10 w-full text-white" style={{ background: 'linear-gradient(120deg, #233B63, #176B73)' }}>{saving ? 'Saving…' : edit ? 'Save changes' : lines.length > 1 ? `Add ${lines.length} questions` : 'Add question'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
