import React, { useEffect, useMemo, useState } from 'react';
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
