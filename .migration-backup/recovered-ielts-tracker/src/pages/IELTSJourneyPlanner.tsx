import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, X } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Task {
  text: string;
  done: boolean;
}

interface ModuleEntry {
  id: string;
  name: string;
  target: string;
  tasks: Task[];
}

interface Phase {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  modules: ModuleEntry[];
  collapsed: boolean;
}

interface JourneyPlan {
  phases: Phase[];
}

const MODULES_DEFAULT = ['Listening', 'Reading', 'Writing', 'Speaking'];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function calcDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  const s = new Date(sy, sm - 1, sd);
  const e = new Date(ey, em - 1, ed);
  const diff = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  return diff > 0 ? diff : null;
}

function makeFreshModule(name: string): ModuleEntry {
  return { id: uid(), name, target: '', tasks: [{ text: '', done: false }] };
}

function makeFreshPhase(index: number): Phase {
  return {
    id: uid(),
    title: `Phase ${index + 1}`,
    startDate: '',
    endDate: '',
    collapsed: false,
    modules: MODULES_DEFAULT.map(makeFreshModule),
  };
}

/** Migrate old string[] tasks to Task[] on load */
function normalizeTasks(raw: any[]): Task[] {
  return raw.map(t =>
    typeof t === 'string' ? { text: t, done: false } : t
  );
}

function normalizePhases(phases: any[]): Phase[] {
  return phases.map(p => ({
    ...p,
    modules: (p.modules || []).map((m: any) => ({
      ...m,
      tasks: normalizeTasks(m.tasks || [{ text: '', done: false }]),
    })),
  }));
}

const EMPTY_PLAN: JourneyPlan = { phases: [] };

/* ── Progress ring (SVG) ─────────────────────────────────────────────────── */
function ProgressRing({
  pct,
  size = 52,
  strokeWidth = 5,
  color = '#fff',
  trackColor = 'rgba(255,255,255,0.2)',
  label,
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <span
        className="absolute font-bold"
        style={{ fontSize: size * 0.22, color, lineHeight: 1, userSelect: 'none' }}
      >
        {label ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

/* ── Phase completion helper ─────────────────────────────────────────────── */
function phaseCompletion(phase: Phase): { done: number; total: number; pct: number } {
  let done = 0, total = 0;
  for (const mod of phase.modules) {
    for (const task of mod.tasks) {
      if (task.text.trim()) { total++; if (task.done) done++; }
    }
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/* ── Module row ──────────────────────────────────────────────────────────── */
function ModuleRow({
  mod, onChange, onRemove,
}: {
  mod: ModuleEntry;
  onChange: (updated: ModuleEntry) => void;
  onRemove: () => void;
}) {
  const updateTask = (i: number, val: Partial<Task>) => {
    const tasks = mod.tasks.map((t, idx) => idx === i ? { ...t, ...val } : t);
    onChange({ ...mod, tasks });
  };
  const addTask = () => onChange({ ...mod, tasks: [...mod.tasks, { text: '', done: false }] });
  const removeTask = (i: number) => {
    const tasks = mod.tasks.filter((_, idx) => idx !== i);
    onChange({ ...mod, tasks: tasks.length ? tasks : [{ text: '', done: false }] });
  };

  const MODULE_COLORS: Record<string, string> = {
    Listening: 'bg-yellow-50 border-yellow-200',
    Reading: 'bg-red-50 border-red-200',
    Writing: 'bg-green-50 border-green-200',
    Speaking: 'bg-purple-50 border-purple-200',
  };
  const MODULE_LABEL: Record<string, string> = {
    Listening: 'text-yellow-700',
    Reading: 'text-red-600',
    Writing: 'text-green-700',
    Speaking: 'text-purple-700',
  };
  const colorClass = MODULE_COLORS[mod.name] || 'bg-gray-50 border-gray-200';
  const labelClass = MODULE_LABEL[mod.name] || 'text-gray-700';

  const doneTasks = mod.tasks.filter(t => t.text.trim() && t.done).length;
  const totalTasks = mod.tasks.filter(t => t.text.trim()).length;

  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={mod.name}
            onChange={e => onChange({ ...mod, name: e.target.value })}
            className={`font-semibold text-sm h-8 border-0 bg-transparent p-0 focus-visible:ring-0 ${labelClass}`}
            placeholder="Module name"
          />
        </div>
        {totalTasks > 0 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${doneTasks === totalTasks ? 'bg-green-100 text-green-700' : 'bg-white/70 text-muted-foreground'}`}>
            {doneTasks}/{totalTasks}
          </span>
        )}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Target:</span>
          <Input
            value={mod.target}
            onChange={e => onChange({ ...mod, target: e.target.value })}
            className="w-24 h-7 text-sm font-medium"
            placeholder="e.g. 28/40"
          />
        </div>
        <button onClick={onRemove} className="text-muted-foreground hover:text-red-500 transition-colors ml-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1.5 ml-1">
        {mod.tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-1.5 group">
            <input
              type="checkbox"
              checked={task.done}
              onChange={e => updateTask(i, { done: e.target.checked })}
              className="w-4 h-4 rounded accent-teal shrink-0 cursor-pointer"
              title="Mark as done"
            />
            <Input
              value={task.text}
              onChange={e => updateTask(i, { text: e.target.value })}
              className={`h-7 text-sm flex-1 bg-white/70 transition-all ${task.done ? 'line-through text-muted-foreground opacity-60' : ''}`}
              placeholder="Daily task…"
            />
            {mod.tasks.length > 1 && (
              <button
                onClick={() => removeTask(i)}
                className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addTask}
          className="text-xs text-muted-foreground hover:text-teal transition-colors flex items-center gap-1 mt-1"
        >
          <Plus className="w-3 h-3" /> Add task
        </button>
      </div>
    </div>
  );
}

/* ── Phase card ──────────────────────────────────────────────────────────── */
function PhaseCard({
  phase, index, onUpdate, onRemove,
}: {
  phase: Phase;
  index: number;
  onUpdate: (p: Phase) => void;
  onRemove: () => void;
}) {
  const days = calcDays(phase.startDate, phase.endDate);
  const { done, total, pct } = phaseCompletion(phase);

  const updateModule = (modId: string, updated: ModuleEntry) => {
    onUpdate({ ...phase, modules: phase.modules.map(m => m.id === modId ? updated : m) });
  };
  const removeModule = (modId: string) => {
    onUpdate({ ...phase, modules: phase.modules.filter(m => m.id !== modId) });
  };
  const addModule = () => {
    onUpdate({ ...phase, modules: [...phase.modules, makeFreshModule('Module')] });
  };
  const toggle = () => onUpdate({ ...phase, collapsed: !phase.collapsed });

  const PHASE_COLORS = [
    'from-indigo-500 to-violet-500',
    'from-teal-500 to-emerald-500',
    'from-orange-400 to-rose-400',
    'from-blue-500 to-cyan-500',
    'from-pink-500 to-fuchsia-500',
  ];
  const gradient = PHASE_COLORS[index % PHASE_COLORS.length];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
        <div className="flex items-center gap-3">
          {/* Progress ring */}
          <ProgressRing pct={pct} size={54} strokeWidth={5} />

          <div className="flex-1 min-w-0">
            <Input
              value={phase.title}
              onChange={e => onUpdate({ ...phase, title: e.target.value })}
              className="font-bold text-lg h-8 border-0 bg-white/20 text-white placeholder-white/60 focus-visible:ring-white/40 mb-1"
              placeholder={`Phase ${index + 1}`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-white/70 text-xs">Start</span>
                <input
                  type="date"
                  value={phase.startDate}
                  onChange={e => onUpdate({ ...phase, startDate: e.target.value })}
                  className="bg-white/20 rounded-lg px-2 py-1 text-white text-xs border border-white/30 focus:outline-none focus:border-white/60"
                />
              </div>
              <span className="text-white/50">→</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white/70 text-xs">End</span>
                <input
                  type="date"
                  value={phase.endDate}
                  onChange={e => onUpdate({ ...phase, endDate: e.target.value })}
                  className="bg-white/20 rounded-lg px-2 py-1 text-white text-xs border border-white/30 focus:outline-none focus:border-white/60"
                />
              </div>
              {days !== null && (
                <span className="bg-white/25 text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/30">
                  {days} day{days !== 1 ? 's' : ''}
                </span>
              )}
              {total > 0 && (
                <span className="bg-white/25 text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/30">
                  {done}/{total} tasks
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={toggle} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white">
              {phase.collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
            <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar below header */}
        {total > 0 && (
          <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      {!phase.collapsed && (
        <div className="p-4 space-y-3">
          {phase.modules.map(mod => (
            <ModuleRow
              key={mod.id}
              mod={mod}
              onChange={updated => updateModule(mod.id, updated)}
              onRemove={() => removeModule(mod.id)}
            />
          ))}
          <button
            onClick={addModule}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-teal hover:text-teal transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Add module
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Overall progress summary ────────────────────────────────────────────── */
function OverallProgress({ phases }: { phases: Phase[] }) {
  if (phases.length === 0) return null;
  let totalDone = 0, totalAll = 0;
  const perPhase = phases.map(p => {
    const c = phaseCompletion(p);
    totalDone += c.done;
    totalAll += c.total;
    return c;
  });
  const overallPct = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  return (
    <div className="bg-gradient-to-br from-navy/5 to-teal/5 border border-teal/20 rounded-2xl p-5">
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing pct={overallPct} size={68} strokeWidth={6} color="#0d9488" trackColor="#e2e8f0" />
        <div>
          <h3 className="font-bold text-base text-foreground">Overall Progress</h3>
          <p className="text-sm text-muted-foreground">
            {totalDone} of {totalAll} tasks completed across {phases.length} phase{phases.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {phases.map((phase, i) => {
          const { done, total, pct } = perPhase[i];
          const PHASE_COLORS = ['bg-indigo-500', 'bg-teal-500', 'bg-orange-400', 'bg-blue-500', 'bg-pink-500'];
          const bar = PHASE_COLORS[i % PHASE_COLORS.length];
          return (
            <div key={phase.id} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-xs font-bold text-muted-foreground shrink-0 text-right">{i + 1}</span>
              <span className="w-28 font-medium truncate text-foreground">{phase.title || `Phase ${i + 1}`}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${bar} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-xs text-right text-muted-foreground shrink-0">
                {total === 0 ? '—' : `${pct}%`}
              </span>
              <span className="w-14 text-xs text-right text-muted-foreground/70 shrink-0 hidden sm:block">
                {total === 0 ? '' : `${done}/${total}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export function IELTSJourneyPlanner() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [plan, setPlan] = useState<JourneyPlan>(EMPTY_PLAN);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const { data: serverPlan, isLoading } = useQuery({
    queryKey: ['journey-planner'],
    queryFn: api.getJourneyPlan,
  });

  const saveMutation = useMutation({
    mutationFn: (content: string) => api.saveJourneyPlan(content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journey-planner'] });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('idle');
      toast({ title: 'Save failed', description: 'Could not save your plan. Please try again.', variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (serverPlan?.content) {
      try {
        const parsed = JSON.parse(serverPlan.content);
        setPlan({ phases: normalizePhases(parsed.phases || []) });
      } catch {
        setPlan(EMPTY_PLAN);
      }
    }
  }, [serverPlan]);

  const triggerSave = useCallback((newPlan: JourneyPlan) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      saveMutation.mutate(JSON.stringify(newPlan));
    }, 1000);
  }, [saveMutation]);

  const updatePlan = (newPlan: JourneyPlan) => {
    setPlan(newPlan);
    triggerSave(newPlan);
  };

  const addPhase = () => {
    const newPlan = { ...plan, phases: [...plan.phases, makeFreshPhase(plan.phases.length)] };
    updatePlan(newPlan);
  };

  const updatePhase = (id: string, updated: Phase) => {
    updatePlan({ ...plan, phases: plan.phases.map(p => p.id === id ? updated : p) });
  };

  const removePhase = (id: string) => {
    if (!confirm('Remove this phase?')) return;
    updatePlan({ ...plan, phases: plan.phases.filter(p => p.id !== id) });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-64" />
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="h-48 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-navy dark:text-white flex items-center gap-2">
            🗺️ My IELTS Journey
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Plan your study in phases — tick tasks as you complete them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-teal flex items-center gap-1.5">
              <Save className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <OverallProgress phases={plan.phases} />

      {/* Empty state */}
      {plan.phases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl text-center gap-4">
          <span className="text-5xl">🗓️</span>
          <div>
            <p className="font-semibold text-foreground text-lg mb-1">No phases yet</p>
            <p className="text-muted-foreground text-sm">Break your IELTS preparation into phases — each with date ranges and daily module targets.</p>
          </div>
          <Button onClick={addPhase} className="bg-teal text-white hover:bg-teal/90 mt-2">
            <Plus className="w-4 h-4 mr-2" /> Add your first phase
          </Button>
        </div>
      )}

      {/* Phases */}
      <div className="space-y-4">
        {plan.phases.map((phase, index) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            index={index}
            onUpdate={updated => updatePhase(phase.id, updated)}
            onRemove={() => removePhase(phase.id)}
          />
        ))}
      </div>

      {/* Add phase button */}
      {plan.phases.length > 0 && (
        <button
          onClick={addPhase}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-teal hover:text-teal transition-colors font-medium"
        >
          <Plus className="w-4 h-4" /> Add Phase
        </button>
      )}

      {/* Timeline summary */}
      {plan.phases.length > 0 && (
        <div className="bg-muted/50 rounded-2xl p-5 border border-border">
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">📅 Timeline Summary</h3>
          <div className="space-y-1.5">
            {plan.phases.map((phase, i) => {
              const days = calcDays(phase.startDate, phase.endDate);
              return (
                <div key={phase.id} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-teal/10 text-teal flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="font-medium text-foreground truncate flex-1">{phase.title}</span>
                  {phase.startDate && phase.endDate ? (
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {phase.startDate} → {phase.endDate}
                      {days ? ` · ${days}d` : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50 text-xs">No dates set</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
