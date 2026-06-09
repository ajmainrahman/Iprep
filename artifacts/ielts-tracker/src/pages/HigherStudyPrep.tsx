import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { fmtDate, daysUntil } from '@/lib/utils/date';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  GraduationCap, Trophy, BookMarked, Plus, Trash2, Edit2, X, Check,
  CalendarDays, Globe, FileText, TrendingUp, ChevronDown, ChevronUp,
  Target, ClipboardList, ChevronRight, Layers, List, GitBranch
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* ── Types ────────────────────────────────────────────────────────────────── */
type AppStatus = 'researching' | 'applied' | 'interview' | 'admitted' | 'rejected' | 'waitlisted' | 'deferred';
type ScholarshipStatus = 'planning' | 'applied' | 'awarded' | 'rejected';
type ReqItem = { label: string; done: boolean };

const APP_STATUS_META: Record<AppStatus, { label: string; color: string; bg: string }> = {
  researching: { label: 'Researching',  color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-800' },
  applied:     { label: 'Applied',      color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
  interview:   { label: 'Interview',    color: 'text-purple-600',  bg: 'bg-purple-100 dark:bg-purple-900/30' },
  admitted:    { label: 'Admitted 🎉',  color: 'text-green-600',   bg: 'bg-green-100 dark:bg-green-900/30' },
  rejected:    { label: 'Rejected',     color: 'text-red-600',     bg: 'bg-red-100 dark:bg-red-900/30' },
  waitlisted:  { label: 'Waitlisted',   color: 'text-orange-600',  bg: 'bg-orange-100 dark:bg-orange-900/30' },
  deferred:    { label: 'Deferred',     color: 'text-yellow-600',  bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
};

const SCH_STATUS_META: Record<ScholarshipStatus, { label: string; color: string }> = {
  planning: { label: 'Planning',   color: 'text-slate-500' },
  applied:  { label: 'Applied',    color: 'text-blue-600' },
  awarded:  { label: 'Awarded 🏆', color: 'text-green-600' },
  rejected: { label: 'Rejected',   color: 'text-red-600' },
};

const TEST_SECTIONS: Record<string, string[]> = {
  IELTS:    ['Listening', 'Reading', 'Writing', 'Speaking'],
  GRE:      ['Verbal', 'Quantitative', 'Analytical Writing'],
  GMAT:     ['Verbal', 'Quantitative', 'Integrated Reasoning', 'Analytical Writing'],
  TOEFL:    ['Reading', 'Listening', 'Speaking', 'Writing'],
  SAT:      ['Math', 'Evidence-Based Reading & Writing'],
  Duolingo: ['Overall'],
  Other:    ['Section 1', 'Section 2'],
};

/* ── Default checklist templates ────────────────────────────────────────── */
export const DEFAULT_TEMPLATES = [
  {
    id: 'standard-ms',
    name: 'Standard MS 🎓',
    degreeType: 'MS',
    items: [
      'Statement of Purpose (SOP)',
      'Letter of Recommendation 1',
      'Letter of Recommendation 2',
      'Letter of Recommendation 3',
      'Academic Transcripts',
      'CV / Resume',
      'GRE Score Report',
      'TOEFL / IELTS Certificate',
    ],
  },
  {
    id: 'erasmus',
    name: 'Erasmus Programme 🌍',
    degreeType: 'Erasmus',
    items: [
      'Motivation Letter',
      'Letter of Recommendation 1',
      'Letter of Recommendation 2',
      'Academic Transcripts',
      'Language Certificate (IELTS/TOEFL/DELF)',
      'CV / Resume',
      'Learning Agreement',
      'Passport / ID Copy',
      'Transcript of Records',
    ],
  },
  {
    id: 'phd',
    name: 'PhD Programme 🔬',
    degreeType: 'PhD',
    items: [
      'Research Proposal',
      'Statement of Purpose',
      'Letter of Recommendation 1',
      'Letter of Recommendation 2',
      'Letter of Recommendation 3',
      'Academic Transcripts',
      'CV / Resume',
      'Writing Sample',
      'GRE Score Report',
    ],
  },
  {
    id: 'mba',
    name: 'MBA 💼',
    degreeType: 'MBA',
    items: [
      'Personal Essays / SOP',
      'Letter of Recommendation 1',
      'Letter of Recommendation 2',
      'Academic Transcripts',
      'CV / Resume',
      'GMAT Score Report',
      'TOEFL / IELTS Certificate',
      'Interview Prep Notes',
    ],
  },
  {
    id: 'nordic',
    name: 'Nordic / Scandinavian 🇸🇪',
    degreeType: 'Nordic',
    items: [
      'Motivation Letter',
      'Letter of Recommendation 1',
      'Letter of Recommendation 2',
      'Academic Transcripts',
      'IELTS / TOEFL Certificate',
      'CV / Resume',
      "Bachelor's Degree Certificate",
      'Passport Copy',
      'Portfolio (if applicable)',
    ],
  },
];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function safeParseReqs(json: string | null | undefined): ReqItem[] {
  try {
    if (!json) return [];
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is ReqItem => x && typeof x.label === 'string');
  } catch { return []; }
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export function HigherStudyPrep({ tab, onTabChange }: { tab: string; onTabChange: (t: string) => void }) {
  return (
    <>
      {tab === 'overview'     && <OverviewTab onTabChange={onTabChange} />}
      {tab === 'applications' && <ApplicationsTab />}
      {tab === 'tests'        && <TestScoresTab />}
      {tab === 'scholarships' && <ScholarshipsTab />}
      {tab === 'templates'    && <ChecklistTemplates />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════════════════════════════════════════ */
function OverviewTab({ onTabChange }: { onTabChange: (t: string) => void }) {
  const { data: apps = [] }   = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const { data: tests = [] }  = useQuery({ queryKey: ['other-tests'],  queryFn: api.getOtherTestScores });
  const { data: schols = [] } = useQuery({ queryKey: ['scholarships'], queryFn: api.getScholarships });

  const byStatus = (apps as { status: string }[]).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const upcoming = [...(apps as { universityName: string; deadline?: string | null; status: string }[])
    .filter(a => a.deadline)]
    .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1))
    .slice(0, 6);

  const admittedCount = byStatus['admitted'] || 0;
  const appliedCount  = (byStatus['applied'] || 0) + (byStatus['interview'] || 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Universities',  value: (apps as unknown[]).length,   color: 'text-navy dark:text-indigo',  tab: 'applications', emoji: '🎓' },
          { label: 'Applied',       value: appliedCount,                 color: 'text-blue-600',               tab: 'applications', emoji: '📨' },
          { label: 'Admitted',      value: admittedCount,                color: 'text-green-600',              tab: 'applications', emoji: '✅' },
          { label: 'Scholarships',  value: (schols as unknown[]).length, color: 'text-yellow-600',             tab: 'scholarships', emoji: '🏆' },
        ].map(({ label, value, color, tab, emoji }) => (
          <Card
            key={label}
            className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
            onClick={() => onTabChange(tab)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-1">{emoji}</div>
              <p className={`text-3xl font-bold font-heading ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming deadlines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal" /> Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deadlines yet. Add applications to track them.</p>
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((a, i) => {
                  const meta = APP_STATUS_META[a.status as AppStatus] || APP_STATUS_META.researching;
                  const days = daysUntil(a.deadline);
                  return (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.universityName}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(a.deadline)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {days !== null && (
                          <span className={`text-xs font-semibold ${
                            days < 0 ? 'text-muted-foreground' :
                            days <= 7 ? 'text-red-500' :
                            days <= 30 ? 'text-orange-500' : 'text-muted-foreground'
                          }`}>
                            {days < 0 ? 'Past' : days === 0 ? 'Today!' : `${days}d`}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pipeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-teal" /> Application Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(apps as unknown[]).length === 0 ? (
              <p className="text-sm text-muted-foreground">Add universities to see your pipeline.</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(APP_STATUS_META).map(([status, meta]) => {
                  const count = byStatus[status] || 0;
                  if (!count) return null;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`text-xs w-24 font-medium shrink-0 ${meta.color}`}>{meta.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(count / (apps as unknown[]).length) * 100}%`,
                            background: 'currentColor',
                            opacity: 0.6,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold w-4 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test scores snapshot */}
      {(tests as unknown[]).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-teal" /> Latest Test Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(tests as { id: number; testName: string; totalScore?: number | null; attemptDate: string }[])
                .slice(0, 6)
                .map(t => (
                  <div key={t.id} className="border rounded-xl px-4 py-3 text-center min-w-[90px]">
                    <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">{t.testName}</p>
                    <p className="text-2xl font-bold text-navy dark:text-teal mt-0.5">{t.totalScore ?? '–'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(t.attemptDate)}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   APPLICATIONS TAB
═══════════════════════════════════════════════════════════════════════════ */
function ApplicationsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: apps = [], isLoading } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const { data: customTemplates = [] }  = useQuery({ queryKey: ['templates'],    queryFn: api.getTemplates });

  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState<number | null>(null);
  const [expandedId,  setExpandedId]  = useState<number | null>(null);
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [newItemDraft,  setNewItemDraft]  = useState('');
  const [viewMode,    setViewMode]    = useState<'list' | 'timeline'>('list');

  const emptyBase = {
    universityName: '', country: '', program: '', degreeType: 'MS',
    status: 'researching', deadline: '', appliedDate: '', notes: '',
  };
  const [formBase,    setFormBase]    = useState(emptyBase);
  const [requirements, setRequirements] = useState<ReqItem[]>([]);

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addApplication(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      setShowForm(false);
      setFormBase(emptyBase);
      setRequirements([]);
      toast({ title: '🎓 University added!' });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateApplication(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      setEditId(null);
      setShowForm(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteApplication,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); toast({ title: 'Removed' }); },
  });

  function startEdit(app: Record<string, unknown> & { id: number }) {
    setFormBase({
      universityName: String(app.universityName || ''),
      country:        String(app.country || ''),
      program:        String(app.program || ''),
      degreeType:     String(app.degreeType || 'MS'),
      status:         String(app.status || 'researching'),
      deadline:       String(app.deadline || ''),
      appliedDate:    String(app.appliedDate || ''),
      notes:          String(app.notes || ''),
    });
    setRequirements(safeParseReqs(app.requirementsJson as string));
    setEditId(app.id);
    setShowForm(true);
    setExpandedId(null);
  }

  function applyTemplate(items: string[]) {
    setRequirements(items.map(label => ({ label, done: false })));
    setShowTplPicker(false);
  }

  function addReqItem() {
    setRequirements(p => [...p, { label: '', done: false }]);
  }

  function removeReqItem(i: number) {
    setRequirements(p => p.filter((_, idx) => idx !== i));
  }

  function updateReqLabel(i: number, label: string) {
    setRequirements(p => p.map((r, idx) => idx === i ? { ...r, label } : r));
  }

  function saveForm() {
    const reqs = requirements.filter(r => r.label.trim() !== '');
    const payload = {
      ...formBase,
      deadline:    formBase.deadline || null,
      appliedDate: formBase.appliedDate || null,
      requirementsJson: reqs.length ? JSON.stringify(reqs) : null,
    };
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else addMutation.mutate(payload);
  }

  function toggleReqInApp(app: Record<string, unknown> & { id: number }, idx: number) {
    const reqs = safeParseReqs(app.requirementsJson as string);
    if (!reqs[idx]) return;
    reqs[idx] = { ...reqs[idx], done: !reqs[idx].done };
    updateMutation.mutate({ id: app.id, data: { requirementsJson: JSON.stringify(reqs) } });
  }

  function removeReqFromApp(app: Record<string, unknown> & { id: number }, idx: number) {
    const reqs = safeParseReqs(app.requirementsJson as string).filter((_, i) => i !== idx);
    updateMutation.mutate({ id: app.id, data: { requirementsJson: JSON.stringify(reqs) } });
  }

  function addReqToApp(app: Record<string, unknown> & { id: number }, label: string) {
    if (!label.trim()) return;
    const reqs = [...safeParseReqs(app.requirementsJson as string), { label: label.trim(), done: false }];
    updateMutation.mutate({ id: app.id, data: { requirementsJson: JSON.stringify(reqs) } });
    setNewItemDraft('');
  }

  const allTemplates = [
    ...DEFAULT_TEMPLATES,
    ...(customTemplates as { id: number; name: string; items: string }[]).map(t => ({
      id: String(t.id),
      name: t.name,
      degreeType: '',
      items: (() => { try { return JSON.parse(t.items) as string[]; } catch { return []; } })(),
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {(apps as unknown[]).length} {(apps as unknown[]).length === 1 ? 'university' : 'universities'} tracked
        </p>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'list' ? 'bg-navy text-white dark:bg-indigo' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-2.5 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'timeline' ? 'bg-navy text-white dark:bg-indigo' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <GitBranch className="w-3.5 h-3.5" /> Timeline
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => { setFormBase(emptyBase); setRequirements([]); setEditId(null); setShowForm(true); }}
            className="bg-navy hover:bg-navy/90 dark:bg-indigo dark:hover:bg-indigo/90 text-white"
          >
            <Plus className="w-4 h-4 mr-1" /> Add University
          </Button>
        </div>
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <Card className="border-2 border-indigo/25 dark:border-indigo/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo" />
              {editId ? 'Edit Application' : 'New University Application'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>University Name *</Label>
                <Input
                  placeholder="e.g. University of Copenhagen"
                  value={formBase.universityName}
                  onChange={e => setFormBase(p => ({ ...p, universityName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Country *</Label>
                <Input
                  placeholder="e.g. Denmark 🇩🇰"
                  value={formBase.country}
                  onChange={e => setFormBase(p => ({ ...p, country: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Program *</Label>
                <Input
                  placeholder="e.g. Computer Science"
                  value={formBase.program}
                  onChange={e => setFormBase(p => ({ ...p, program: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Degree Type</Label>
                <Select value={formBase.degreeType} onValueChange={v => setFormBase(p => ({ ...p, degreeType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['MS', 'MBA', 'PhD', 'MEng', 'MA', 'MFA', 'LLM', 'MPH', 'MPA', 'Undergraduate', 'Other'].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={formBase.status} onValueChange={v => setFormBase(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(APP_STATUS_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Application Deadline</Label>
                <Input
                  type="date"
                  value={formBase.deadline}
                  onChange={e => setFormBase(p => ({ ...p, deadline: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Date Applied</Label>
                <Input
                  type="date"
                  value={formBase.appliedDate}
                  onChange={e => setFormBase(p => ({ ...p, appliedDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Dynamic requirements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">📋 Requirements Checklist</Label>
                <div className="flex gap-2">
                  <div className="relative">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={() => setShowTplPicker(p => !p)}
                    >
                      <Layers className="w-3 h-3" />
                      Use Template
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    {showTplPicker && (
                      <div className="absolute right-0 top-full mt-1 z-50 bg-card border rounded-xl shadow-lg p-2 min-w-[220px] space-y-0.5">
                        {allTemplates.map(t => (
                          <button
                            key={t.id}
                            onClick={() => applyTemplate(t.items)}
                            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-muted transition-colors"
                          >
                            <span className="font-medium">{t.name}</span>
                            <span className="text-muted-foreground ml-1">({t.items.length} items)</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1"
                    onClick={addReqItem}
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </Button>
                </div>
              </div>

              {requirements.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No items yet — use a template or add items manually.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo/50 shrink-0" />
                      <Input
                        value={req.label}
                        onChange={e => updateReqLabel(i, e.target.value)}
                        placeholder="Requirement name…"
                        className="flex-1 h-8 text-sm"
                      />
                      <button
                        onClick={() => removeReqItem(i)}
                        className="shrink-0 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                placeholder="Funding info, contact person, ranking, link…"
                value={formBase.notes}
                onChange={e => setFormBase(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!formBase.universityName || !formBase.country || !formBase.program}
                onClick={saveForm}
                className="bg-navy hover:bg-navy/90 dark:bg-indigo dark:hover:bg-indigo/90 text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {editId ? 'Update' : 'Save Application'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowForm(false); setEditId(null); setShowTplPicker(false); }}
              >
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Application list / timeline ── */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Loading…</p>
      ) : (apps as unknown[]).length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-semibold">No applications yet</p>
          <p className="text-sm mt-1">Add your first target university to start tracking.</p>
        </div>
      ) : viewMode === 'timeline' ? (
        /* ── TIMELINE VIEW ── */
        <div className="space-y-2">
          {/* legend */}
          <div className="flex flex-wrap gap-2 pb-2">
            {Object.entries(APP_STATUS_META).map(([k, v]) => (
              <span key={k} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${v.bg} ${v.color}`}>{v.label}</span>
            ))}
          </div>
          <div className="relative">
            {/* Vertical spine */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4 pl-12">
              {[...(apps as (Record<string, unknown> & { id: number })[])].sort((a, b) => {
                const da = a.deadline as string | null;
                const db = b.deadline as string | null;
                if (!da && !db) return 0;
                if (!da) return 1;
                if (!db) return -1;
                return da > db ? 1 : -1;
              }).map(app => {
                const meta = APP_STATUS_META[app.status as AppStatus] || APP_STATUS_META.researching;
                const days = daysUntil(app.deadline as string);
                const urgent = days !== null && days >= 0 && days <= 7;
                const dotColor: Record<AppStatus, string> = {
                  researching: 'bg-slate-400',
                  applied:     'bg-blue-500',
                  interview:   'bg-purple-500',
                  admitted:    'bg-green-500',
                  rejected:    'bg-red-400',
                  waitlisted:  'bg-orange-400',
                  deferred:    'bg-yellow-400',
                };
                return (
                  <div key={app.id} className="relative">
                    {/* Dot on spine */}
                    <div className={`absolute -left-8 top-4 w-4 h-4 rounded-full border-2 border-background shadow ${dotColor[app.status as AppStatus] || 'bg-slate-400'}`} />
                    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${urgent ? 'border-red-300 dark:border-red-700' : ''}`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-navy dark:text-white">{String(app.universityName)}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
                              {urgent && (
                                <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                                  ⚠️ Due in {days}d
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {String(app.degreeType)} · {String(app.program)} · <Globe className="w-3 h-3 inline" /> {String(app.country)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {app.deadline ? (
                              <p className="text-sm font-semibold text-foreground">{fmtDate(app.deadline as string)}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">No deadline set</p>
                            )}
                            {days !== null && days >= 0 && (
                              <p className={`text-xs font-medium ${days <= 7 ? 'text-red-500' : days <= 30 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                                {days === 0 ? 'Today!' : `${days} days left`}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <button onClick={() => startEdit(app)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(app.id)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {(apps as (Record<string, unknown> & { id: number })[]).map(app => {
            const meta     = APP_STATUS_META[app.status as AppStatus] || APP_STATUS_META.researching;
            const reqs     = safeParseReqs(app.requirementsJson as string);
            const doneCount = reqs.filter(r => r.done).length;
            const isExpanded = expandedId === app.id;

            return (
              <Card key={app.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-navy dark:text-white truncate">
                          {String(app.universityName)}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {String(app.degreeType)} in {String(app.program)} ·{' '}
                        <Globe className="w-3 h-3 inline" /> {String(app.country)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        {app.deadline && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Deadline: {fmtDate(app.deadline as string)}
                            {(() => {
                              const d = daysUntil(app.deadline as string);
                              if (d === null || d < 0) return null;
                              return (
                                <span className={`font-semibold ${d <= 7 ? 'text-red-500' : d <= 30 ? 'text-orange-500' : ''}`}>
                                  {' '}({d === 0 ? 'Today!' : `${d}d`})
                                </span>
                              );
                            })()}
                          </span>
                        )}
                        {app.appliedDate && (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-500" />
                            Applied: {fmtDate(app.appliedDate as string)}
                          </span>
                        )}
                        {reqs.length > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {doneCount}/{reqs.length} docs done
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => startEdit(app)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(app.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {reqs.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${(doneCount / reqs.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{doneCount}/{reqs.length}</span>
                    </div>
                  )}

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Requirements with add/remove */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                          Requirements Checklist
                        </p>
                        {reqs.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No requirements added yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {reqs.map((r, idx) => (
                              <div key={idx} className="group relative inline-flex items-center">
                                <button
                                  onClick={() => toggleReqInApp(app, idx)}
                                  className={`text-xs px-3 py-1 rounded-full border transition-all font-medium pr-5 ${
                                    r.done
                                      ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                                      : 'bg-muted border-border text-muted-foreground hover:border-indigo/40'
                                  }`}
                                >
                                  {r.done ? '✓ ' : ''}{r.label}
                                </button>
                                <button
                                  onClick={() => removeReqFromApp(app, idx)}
                                  className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add item inline */}
                        <div className="flex gap-2 mt-3">
                          <Input
                            placeholder="+ Add requirement…"
                            className="flex-1 h-7 text-xs"
                            value={expandedId === app.id ? newItemDraft : ''}
                            onChange={e => setNewItemDraft(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') addReqToApp(app, newItemDraft);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => addReqToApp(app, newItemDraft)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {app.notes && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                          <p className="text-sm text-foreground/80 whitespace-pre-line">{String(app.notes)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TEST SCORES TAB
═══════════════════════════════════════════════════════════════════════════ */
function TestScoresTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: scores = [], isLoading } = useQuery({ queryKey: ['other-tests'], queryFn: api.getOtherTestScores });

  const [showForm, setShowForm] = useState(false);
  const [testName,   setTestName]   = useState('GRE');
  const [customTest, setCustomTest] = useState('');
  const [date,  setDate]  = useState('');
  const [total, setTotal] = useState('');
  const [sections, setSections] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const currentSections = TEST_SECTIONS[testName] ?? TEST_SECTIONS['Other'];

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addOtherTestScore(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['other-tests'] });
      setShowForm(false);
      setDate(''); setTotal(''); setSections({}); setNotes('');
      toast({ title: '📊 Score recorded!' });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteOtherTestScore,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['other-tests'] }); toast({ title: 'Score removed' }); },
  });

  function saveScore() {
    const name = testName === 'Other' ? customTest.trim() : testName;
    if (!name || !date) return;
    addMutation.mutate({
      testName: name,
      attemptDate: date,
      totalScore: total ? Number(total) : null,
      scoresJson: JSON.stringify(sections),
      notes: notes || null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(scores as unknown[]).length} test score{(scores as unknown[]).length !== 1 ? 's' : ''} recorded
        </p>
        <Button
          size="sm"
          onClick={() => setShowForm(p => !p)}
          className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Score
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-indigo/25">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-indigo" />
              Record Test Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Test</Label>
                <Select value={testName} onValueChange={v => { setTestName(v); setSections({}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(TEST_SECTIONS).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {testName === 'Other' && (
                <div className="space-y-1">
                  <Label>Custom Test Name</Label>
                  <Input value={customTest} onChange={e => setCustomTest(e.target.value)} placeholder="e.g. Cambridge C1" />
                </div>
              )}
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Total Score</Label>
                <Input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="Overall score" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase">Section Scores</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {currentSections.map(s => (
                  <div key={s} className="space-y-1">
                    <Label className="text-xs">{s}</Label>
                    <Input
                      type="number"
                      placeholder="Score"
                      value={sections[s] ?? ''}
                      onChange={e => setSections(p => ({ ...p, [s]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Prep strategy, retake plans…" />
            </div>

            <div className="flex gap-2">
              <Button size="sm" disabled={!date} onClick={saveScore} className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white">
                <Check className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (scores as unknown[]).length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-semibold">No test scores yet</p>
          <p className="text-sm mt-1">Record your GRE, GMAT, TOEFL or other test scores.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {(scores as {
            id: number; testName: string; totalScore?: number | null;
            attemptDate: string; scoresJson?: string | null; notes?: string | null;
          }[]).map(s => {
            let sectionData: Record<string, string> = {};
            try { if (s.scoresJson) sectionData = JSON.parse(s.scoresJson); } catch { /* ignore */ }

            return (
              <Card key={s.id} className="relative group overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-lg text-navy dark:text-teal">{s.totalScore ?? '–'}</p>
                      <p className="text-sm font-semibold">{s.testName}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(s.attemptDate)}</p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {Object.entries(sectionData).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(sectionData).filter(([, v]) => v).map(([k, v]) => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {k}: <strong>{v}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                  {s.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCHOLARSHIPS TAB
═══════════════════════════════════════════════════════════════════════════ */
function ScholarshipsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: scholarships = [], isLoading } = useQuery({ queryKey: ['scholarships'], queryFn: api.getScholarships });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const emptyForm = {
    name: '', provider: '', country: '', fundingType: 'Full Scholarship',
    amount: '', currency: 'USD', deadline: '', status: 'planning', notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addScholarship(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scholarships'] });
      setShowForm(false); setForm(emptyForm);
      toast({ title: '🏆 Scholarship added!' });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateScholarship(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scholarships'] });
      setEditId(null); setShowForm(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteScholarship,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scholarships'] }); },
  });

  function startEdit(s: Record<string, unknown> & { id: number }) {
    setForm({
      name:         String(s.name || ''),
      provider:     String(s.provider || ''),
      country:      String(s.country || ''),
      fundingType:  String(s.fundingType || 'Full Scholarship'),
      amount:       String(s.amount || ''),
      currency:     String(s.currency || 'USD'),
      deadline:     String(s.deadline || ''),
      status:       String(s.status || 'planning'),
      notes:        String(s.notes || ''),
    });
    setEditId(s.id);
    setShowForm(true);
  }

  function saveForm() {
    const payload = { ...form, deadline: form.deadline || null, amount: form.amount ? Number(form.amount) : null };
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else addMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(scholarships as unknown[]).length} scholarship{(scholarships as unknown[]).length !== 1 ? 's' : ''} tracked
        </p>
        <Button
          size="sm"
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
          className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Scholarship
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-indigo/25">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              {editId ? 'Edit Scholarship' : 'New Scholarship'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Scholarship Name *</Label>
                <Input placeholder="e.g. Erasmus+ Scholarship" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Provider / Organisation</Label>
                <Input placeholder="e.g. European Commission" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                <Input placeholder="e.g. Finland 🇫🇮" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Funding Type</Label>
                <Select value={form.fundingType} onValueChange={v => setForm(p => ({ ...p, fundingType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Full Scholarship', 'Partial Scholarship', 'Tuition Waiver', 'Stipend', 'Travel Grant', 'Research Funding', 'Other'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Amount</Label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="0" className="flex-1" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK', 'BDT', 'Other'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCH_STATUS_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!form.name} onClick={saveForm} className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white">
                <Check className="w-4 h-4 mr-1" /> {editId ? 'Update' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (scholarships as unknown[]).length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-semibold">No scholarships yet</p>
          <p className="text-sm mt-1">Track Erasmus+, Nordic grants and other funding opportunities.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {(scholarships as (Record<string, unknown> & { id: number })[]).map(s => {
            const meta = SCH_STATUS_META[s.status as ScholarshipStatus] || SCH_STATUS_META.planning;
            return (
              <Card key={s.id} className="group hover:shadow-md transition-all hover:-translate-y-0.5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{String(s.name)}</h3>
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      </div>
                      {s.provider && <p className="text-xs text-muted-foreground">{String(s.provider)}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(s)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(s.id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{String(s.fundingType)}</span>
                    {s.country && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">🌍 {String(s.country)}</span>}
                    {s.amount && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 font-semibold">
                        {Number(s.amount).toLocaleString()} {String(s.currency)}
                      </span>
                    )}
                  </div>

                  {s.deadline && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      Deadline: {fmtDate(s.deadline as string)}
                      {(() => {
                        const d = daysUntil(s.deadline as string);
                        if (d === null || d < 0) return null;
                        return <span className={`font-semibold ml-1 ${d <= 14 ? 'text-red-500' : 'text-muted-foreground'}`}>({d}d)</span>;
                      })()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHECKLIST TEMPLATES TAB
═══════════════════════════════════════════════════════════════════════════ */
function ChecklistTemplates() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: custom = [] } = useQuery({ queryKey: ['templates'], queryFn: api.getTemplates });

  const [showForm,    setShowForm]    = useState(false);
  const [formName,    setFormName]    = useState('');
  const [formDegree,  setFormDegree]  = useState('');
  const [formItems,   setFormItems]   = useState<string[]>(['']);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setShowForm(false); setFormName(''); setFormDegree(''); setFormItems(['']);
      toast({ title: '📋 Template saved!' });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); },
  });

  function addFormItem() {
    setFormItems(p => [...p, '']);
  }
  function removeFormItem(i: number) {
    setFormItems(p => p.filter((_, idx) => idx !== i));
  }
  function updateFormItem(i: number, val: string) {
    setFormItems(p => p.map((x, idx) => idx === i ? val : x));
  }
  function saveTemplate() {
    const items = formItems.filter(x => x.trim());
    if (!formName.trim() || !items.length) return;
    addMutation.mutate({ name: formName, degreeType: formDegree || null, items: JSON.stringify(items) });
  }

  const customParsed = (custom as { id: number; name: string; degreeType?: string | null; items: string }[])
    .map(t => ({
      ...t,
      itemsParsed: (() => { try { return JSON.parse(t.items) as string[]; } catch { return []; } })(),
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-lg">Document Checklist Templates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pre-built and custom templates. Apply them when adding a new university application to auto-fill the requirements list.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(p => !p)} className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Custom Template
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-2 border-indigo/25">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo" />
              New Custom Template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Template Name *</Label>
                <Input placeholder="e.g. My University Checklist" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Degree Type (optional)</Label>
                <Input placeholder="e.g. MS, Erasmus, PhD" value={formDegree} onChange={e => setFormDegree(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Checklist Items *</Label>
                <Button type="button" size="sm" variant="outline" className="text-xs h-7" onClick={addFormItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-1.5">
                {formItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo/40 shrink-0" />
                    <Input
                      value={item}
                      onChange={e => updateFormItem(i, e.target.value)}
                      placeholder={`Item ${i + 1}…`}
                      className="flex-1 h-8 text-sm"
                    />
                    {formItems.length > 1 && (
                      <button onClick={() => removeFormItem(i)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!formName.trim() || !formItems.some(x => x.trim())}
                onClick={saveTemplate}
                className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white"
              >
                <Check className="w-4 h-4 mr-1" /> Save Template
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default templates */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Default Templates
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {DEFAULT_TEMPLATES.map(tmpl => {
            const isOpen = expandedId === tmpl.id;
            return (
              <Card key={tmpl.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <button
                  className="w-full text-left p-4"
                  onClick={() => setExpandedId(isOpen ? null : tmpl.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{tmpl.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tmpl.degreeType} · {tmpl.items.length} items</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {isOpen && (
                    <ul className="mt-3 space-y-1.5">
                      {tmpl.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-foreground/75">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom templates */}
      {customParsed.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            My Custom Templates
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {customParsed.map(tmpl => {
              const isOpen = expandedId === String(tmpl.id);
              return (
                <Card key={tmpl.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <button
                        className="flex-1 text-left"
                        onClick={() => setExpandedId(isOpen ? null : String(tmpl.id))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm">{tmpl.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tmpl.degreeType || 'Custom'} · {tmpl.itemsParsed.length} items
                            </p>
                          </div>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        {isOpen && (
                          <ul className="mt-3 space-y-1.5">
                            {tmpl.itemsParsed.map((item, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-foreground/75">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo/60 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(tmpl.id)}
                        className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
