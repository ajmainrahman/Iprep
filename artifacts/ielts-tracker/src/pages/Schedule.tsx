import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2, Clock, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

/* ─── helpers (same convention as Dashboard.tsx / StudyLog.tsx) ─────────── */
function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay() + 1); // Monday start
  return r;
}
function to12h(time: string) {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
function addMinutesToTime(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

const MODULES = ['Listening', 'Reading', 'Writing', 'Speaking', 'Vocabulary', 'Grammar', 'Mock Test', 'General'];
const MODULE_COLOR: Record<string, string> = {
  Listening: '#0EA5E9', Reading: '#FF6B6B', Writing: '#06D6A0',
  Speaking: '#7B5EA7', Vocabulary: '#FFD166', Grammar: '#6366F1',
  'Mock Test': '#F97316', General: '#6B7280',
};
const STATUS_STYLE: Record<string, string> = {
  planned: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  missed: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

type SessionForm = {
  id?: number;
  title: string;
  module: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  priority: string;
  notes: string;
};

const emptyForm = (date: string): SessionForm => ({
  title: '', module: 'Reading', date, startTime: '09:00', durationMinutes: 30, priority: 'medium', notes: '',
});

export function Schedule() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SessionForm>(() => emptyForm(localDateStr(new Date())));
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { data: sessions = [], isLoading } = useQuery({ queryKey: ['scheduled-sessions'], queryFn: api.getScheduledSessions });

  const addMut = useMutation({
    mutationFn: api.addScheduledSession,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scheduled-sessions'] }); toast({ title: 'Session scheduled' }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => api.updateScheduledSession(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-sessions'] }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteScheduledSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-sessions'] }),
  });
  const completeMut = useMutation({
    mutationFn: (id: number) => api.completeScheduledSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-sessions'] });
      qc.invalidateQueries({ queryKey: ['study-sessions'] }); // keeps Learning Activity + Dashboard in sync
      toast({ title: 'Marked completed and logged' });
    },
  });

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekLabel = `${weekDays[0].toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} – ${weekDays[6].toLocaleDateString(undefined, { day: 'numeric', year: 'numeric' })}`;
  const todayStr = localDateStr(new Date());

  const sessionsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (sessions as any[]).forEach(s => {
      (map[s.date] ??= []).push(s);
    });
    Object.values(map).forEach(list => list.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [sessions]);

  function openAdd(date: string) {
    setForm(emptyForm(date));
    setModalOpen(true);
  }
  function openEdit(s: any) {
    setForm({ id: s.id, title: s.title, module: s.module, date: s.date, startTime: s.startTime, durationMinutes: s.durationMinutes, priority: s.priority, notes: s.notes ?? '' });
    setModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: 'Title is required', variant: 'destructive' }); return; }
    const body = {
      title: form.title, module: form.module, date: form.date,
      startTime: form.startTime, durationMinutes: Number(form.durationMinutes),
      priority: form.priority, notes: form.notes || null,
    };
    if (form.id) updateMut.mutate({ id: form.id, body });
    else addMut.mutate(body);
    setModalOpen(false);
  }

  function SessionBlock({ s }: { s: any }) {
    const color = MODULE_COLOR[s.module] ?? '#6B7280';
    return (
      <div
        className="group rounded-lg border p-2.5 text-left text-xs shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        style={{ borderLeftColor: color, borderLeftWidth: 3, backgroundColor: `${color}0D` }}
        onClick={() => openEdit(s)}
      >
        <div className="flex items-start justify-between gap-1">
          <p className="font-semibold text-foreground leading-tight">{s.title}</p>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium capitalize ${STATUS_STYLE[s.status]}`}>{s.status}</span>
        </div>
        <p className="mt-1 flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" /> {to12h(s.startTime)} · {s.durationMinutes}m
        </p>
        <p className="mt-0.5 font-medium" style={{ color }}>{s.module}</p>
        {(s.status === 'planned' || s.status === 'missed') && (
          <div className="mt-2 flex gap-1.5" onClick={e => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => completeMut.mutate(s.id)}>
              <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-destructive" onClick={() => deleteMut.mutate(s.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-16 w-full rounded-xl" /><Skeleton className="h-96 w-full rounded-xl" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-teal" /> Schedule
          </h2>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</Button>
          <Button size="icon" variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" className="bg-teal hover:bg-teal/90" onClick={() => openAdd(todayStr)}>
            <Plus className="mr-1 h-4 w-4" /> Schedule Study
          </Button>
        </div>
      </div>

      {isMobile ? (
        /* ── MOBILE: vertical agenda ── */
        <div className="space-y-4">
          {weekDays.map(day => {
            const ds = localDateStr(day);
            const daySessions = sessionsByDate[ds] ?? [];
            return (
              <Card key={ds} className={ds === todayStr ? 'border-teal' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>{ds === todayStr ? 'TODAY — ' : ''}{day.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                    <Button size="sm" variant="ghost" onClick={() => openAdd(ds)}><Plus className="h-3.5 w-3.5" /></Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {daySessions.length === 0
                    ? <p className="text-xs text-muted-foreground">No study sessions planned.</p>
                    : daySessions.map(s => <SessionBlock key={s.id} s={s} />)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── DESKTOP/TABLET: weekly columns ── */
        <div className="grid grid-cols-7 gap-2 overflow-x-auto">
          {weekDays.map(day => {
            const ds = localDateStr(day);
            const daySessions = sessionsByDate[ds] ?? [];
            return (
              <Card key={ds} className={`min-w-[150px] ${ds === todayStr ? 'border-teal ring-1 ring-teal/40' : ''}`}>
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-xs flex items-center justify-between">
                    <div>
                      <p className="uppercase tracking-wide text-[10px] text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: 'short' })}</p>
                      <p className={`text-base font-heading font-bold ${ds === todayStr ? 'text-teal' : 'text-foreground'}`}>{day.getDate()}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openAdd(ds)}><Plus className="h-3.5 w-3.5" /></Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 px-2 pb-3 min-h-[120px]">
                  {daySessions.length === 0
                    ? <p className="text-[10px] text-muted-foreground/70 px-1">No sessions</p>
                    : daySessions.map(s => <SessionBlock key={s.id} s={s} />)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit Study Session' : 'Schedule Study'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Writing Task 2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Module</Label>
                <Select value={form.module} onValueChange={v => setForm({ ...form, module: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Start</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" min={5} step={5} value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Ends at {to12h(addMinutesToTime(form.startTime, form.durationMinutes))}</p>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Practice opinion essay structure." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-teal hover:bg-teal/90">Schedule Session</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
