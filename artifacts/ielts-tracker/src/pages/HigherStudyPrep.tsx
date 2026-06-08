import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  GraduationCap, Trophy, BookMarked, Plus, Trash2, Edit2, X, Check,
  CalendarDays, Globe, FileText, Award, TrendingUp, Clock,
  ChevronDown, ChevronUp, Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AppStatus = 'researching' | 'applied' | 'interview' | 'admitted' | 'rejected' | 'waitlisted' | 'deferred';
type ScholarshipStatus = 'planning' | 'applied' | 'awarded' | 'rejected';

const APP_STATUS_META: Record<AppStatus, { label: string; color: string; bg: string }> = {
  researching: { label: 'Researching',  color: 'text-gray-600',   bg: 'bg-gray-100 dark:bg-gray-800' },
  applied:     { label: 'Applied',      color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/30' },
  interview:   { label: 'Interview',    color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  admitted:    { label: 'Admitted 🎉',  color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/30' },
  rejected:    { label: 'Rejected',     color: 'text-red-600',    bg: 'bg-red-100 dark:bg-red-900/30' },
  waitlisted:  { label: 'Waitlisted',   color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  deferred:    { label: 'Deferred',     color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
};

const SCH_STATUS_META: Record<ScholarshipStatus, { label: string; color: string }> = {
  planning: { label: 'Planning',  color: 'text-gray-600' },
  applied:  { label: 'Applied',   color: 'text-blue-600' },
  awarded:  { label: 'Awarded 🏆', color: 'text-green-600' },
  rejected: { label: 'Rejected',  color: 'text-red-600' },
};

const TEST_SECTIONS: Record<string, string[]> = {
  GRE:       ['Verbal', 'Quantitative', 'Analytical Writing'],
  GMAT:      ['Verbal', 'Quantitative', 'Integrated Reasoning', 'Analytical Writing'],
  TOEFL:     ['Reading', 'Listening', 'Speaking', 'Writing'],
  SAT:       ['Math', 'Evidence-Based Reading & Writing'],
  Duolingo:  ['Overall'],
  Other:     ['Section 1', 'Section 2'],
};

type Tab = 'overview' | 'applications' | 'tests' | 'scholarships';

export function HigherStudyPrep() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap border-b pb-2">
        {([
          ['overview', 'Overview', TrendingUp],
          ['applications', 'Applications', GraduationCap],
          ['tests', 'Test Scores', BookMarked],
          ['scholarships', 'Scholarships', Trophy],
        ] as [Tab, string, React.ElementType][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-navy text-white dark:bg-teal'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview'      && <OverviewTab setActiveTab={setActiveTab} />}
      {activeTab === 'applications'  && <ApplicationsTab />}
      {activeTab === 'tests'         && <TestScoresTab />}
      {activeTab === 'scholarships'  && <ScholarshipsTab />}
    </div>
  );
}

function OverviewTab({ setActiveTab }: { setActiveTab: (t: Tab) => void }) {
  const { data: apps = [] }   = useQuery({ queryKey: ['applications'],  queryFn: api.getApplications });
  const { data: tests = [] }  = useQuery({ queryKey: ['other-tests'],   queryFn: api.getOtherTestScores });
  const { data: schols = [] } = useQuery({ queryKey: ['scholarships'],  queryFn: api.getScholarships });

  const byStatus = (apps as { status: string }[]).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const upcomingDeadlines = [...(apps as { universityName: string; deadline?: string | null; status: string }[]).filter(a => a.deadline)]
    .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1))
    .slice(0, 5);

  const admittedCount = byStatus['admitted'] || 0;
  const appliedCount  = (byStatus['applied'] || 0) + (byStatus['interview'] || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Universities',  value: (apps as unknown[]).length,    color: 'text-navy dark:text-teal', tab: 'applications' as Tab },
          { label: 'Applied',       value: appliedCount,                  color: 'text-blue-600',            tab: 'applications' as Tab },
          { label: 'Admitted',      value: admittedCount,                 color: 'text-green-600',           tab: 'applications' as Tab },
          { label: 'Scholarships',  value: (schols as unknown[]).length,  color: 'text-yellow-600',          tab: 'scholarships' as Tab },
        ].map(({ label, value, color, tab }) => (
          <Card key={label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab(tab)}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold font-heading ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deadlines yet. Add applications to track them.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingDeadlines.map((a, i) => {
                  const meta = APP_STATUS_META[a.status as AppStatus] || APP_STATUS_META.researching;
                  const daysLeft = a.deadline
                    ? Math.ceil((new Date(a.deadline).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{a.universityName}</p>
                        <p className="text-xs text-muted-foreground">{a.deadline}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {daysLeft !== null && (
                          <span className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-red-500' : daysLeft <= 30 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                            {daysLeft < 0 ? 'Past' : `${daysLeft}d`}
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-teal" />
              Application Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(apps as unknown[]).length === 0 ? (
              <p className="text-sm text-muted-foreground">Add universities to see your pipeline.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(APP_STATUS_META).map(([status, meta]) => {
                  const count = byStatus[status] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`text-xs w-24 font-medium ${meta.color}`}>{meta.label}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${meta.bg.replace('bg-', 'bg-').replace(' dark:bg-.*', '')}`}
                          style={{ width: `${(count / (apps as unknown[]).length) * 100}%`, background: 'currentColor', opacity: 0.7 }}
                        />
                      </div>
                      <span className="text-xs font-bold w-4 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(tests as unknown[]).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-teal" />
              Latest Test Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(tests as { id: number; testName: string; totalScore?: number | null; attemptDate: string }[])
                .slice(0, 6)
                .map(t => (
                  <div key={t.id} className="border rounded-lg px-4 py-2 text-center min-w-[90px]">
                    <p className="text-xs text-muted-foreground font-medium">{t.testName}</p>
                    <p className="text-xl font-bold text-navy dark:text-teal">{t.totalScore ?? '–'}</p>
                    <p className="text-xs text-muted-foreground">{t.attemptDate}</p>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ApplicationsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: apps = [], isLoading } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const emptyForm = {
    universityName: '', country: '', program: '', degreeType: 'MS',
    status: 'researching', deadline: '', appliedDate: '', notes: '',
    reqSop: false, reqLor1: false, reqLor2: false, reqLor3: false,
    reqTranscripts: false, reqCv: false, reqGre: false, reqToefl: false, reqPortfolio: false,
  };
  const [form, setForm] = useState(emptyForm);

  const addMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => api.addApplication(data as unknown as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); setShowForm(false); setForm(emptyForm); toast({ title: 'University added!' }); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof emptyForm> }) => api.updateApplication(id, data as unknown as Record<string, unknown>),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); setEditId(null); toast({ title: 'Updated!' }); },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteApplication,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); toast({ title: 'Removed' }); },
  });

  function startEdit(app: typeof emptyForm & { id: number }) {
    setForm({ ...emptyForm, ...app });
    setEditId(app.id);
    setShowForm(true);
  }

  const REQS = [
    { key: 'reqSop', label: 'SOP' }, { key: 'reqLor1', label: 'LOR 1' },
    { key: 'reqLor2', label: 'LOR 2' }, { key: 'reqLor3', label: 'LOR 3' },
    { key: 'reqTranscripts', label: 'Transcripts' }, { key: 'reqCv', label: 'CV/Resume' },
    { key: 'reqGre', label: 'GRE' }, { key: 'reqToefl', label: 'TOEFL/IELTS' },
    { key: 'reqPortfolio', label: 'Portfolio' },
  ] as { key: keyof typeof emptyForm; label: string }[];

  function completedReqs(app: Record<string, unknown>) {
    return REQS.filter(r => app[r.key] === true).length;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{(apps as unknown[]).length} {(apps as unknown[]).length === 1 ? 'university' : 'universities'} tracked</p>
        <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="bg-navy hover:bg-navy/90 dark:bg-teal dark:hover:bg-teal/90 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add University
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-teal/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editId ? 'Edit Application' : 'New University Application'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>University Name *</Label>
                <Input placeholder="e.g. MIT" value={form.universityName} onChange={e => setForm(p => ({ ...p, universityName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Country *</Label>
                <Input placeholder="e.g. USA" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Program *</Label>
                <Input placeholder="e.g. Computer Science" value={form.program} onChange={e => setForm(p => ({ ...p, program: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Degree Type</Label>
                <Select value={form.degreeType} onValueChange={v => setForm(p => ({ ...p, degreeType: v }))}>
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
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
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
                <Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Date Applied</Label>
                <Input type="date" value={form.appliedDate} onChange={e => setForm(p => ({ ...p, appliedDate: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Requirements Checklist</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REQS.map(r => (
                  <div key={r.key} className="flex items-center gap-2">
                    <Checkbox
                      id={r.key}
                      checked={!!form[r.key]}
                      onCheckedChange={v => setForm(p => ({ ...p, [r.key]: !!v }))}
                    />
                    <Label htmlFor={r.key} className="text-sm cursor-pointer">{r.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Funding info, contact, ranking…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!form.universityName || !form.country || !form.program}
                onClick={() => {
                  if (editId) updateMutation.mutate({ id: editId, data: form });
                  else addMutation.mutate(form);
                }}
                className="bg-navy hover:bg-navy/90 dark:bg-teal text-white"
              >
                <Check className="w-4 h-4 mr-1" />
                {editId ? 'Update' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (apps as unknown[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No applications yet</p>
          <p className="text-sm mt-1">Add your first target university to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(apps as (typeof emptyForm & { id: number })[]).map(app => {
            const meta = APP_STATUS_META[app.status as AppStatus] || APP_STATUS_META.researching;
            const done = completedReqs(app as unknown as Record<string, unknown>);
            const total = REQS.filter(r => (app as unknown as Record<string, unknown>)[r.key] === true || true).length;
            const isExpanded = expandedId === app.id;
            return (
              <Card key={app.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-navy dark:text-white truncate">{app.universityName}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {app.degreeType} in {app.program} · <Globe className="w-3 h-3 inline" /> {app.country}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {app.deadline && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Deadline: {app.deadline}</span>}
                        {app.appliedDate && <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Applied: {app.appliedDate}</span>}
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {done}/{REQS.length} docs marked
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => startEdit(app)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(app.id)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Requirements</p>
                        <div className="flex flex-wrap gap-2">
                          {REQS.map(r => {
                            const checked = !!(app as unknown as Record<string, unknown>)[r.key];
                            return (
                              <button
                                key={r.key}
                                onClick={() => updateMutation.mutate({ id: app.id, data: { [r.key]: !checked } })}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                                  checked
                                    ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                                    : 'bg-muted border-border text-muted-foreground'
                                }`}
                              >
                                {checked ? '✓ ' : ''}{r.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {app.notes && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Notes</p>
                          <p className="text-sm text-foreground/80 whitespace-pre-line">{app.notes}</p>
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

function TestScoresTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: scores = [], isLoading } = useQuery({ queryKey: ['other-tests'], queryFn: api.getOtherTestScores });
  const [showForm, setShowForm] = useState(false);
  const [testName, setTestName] = useState('GRE');
  const [customTest, setCustomTest] = useState('');
  const [date, setDate] = useState('');
  const [total, setTotal] = useState('');
  const [sections, setSections] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const activeSections = TEST_SECTIONS[testName] || TEST_SECTIONS['Other'];

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addOtherTestScore(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['other-tests'] });
      setShowForm(false); setDate(''); setTotal(''); setSections({}); setNotes('');
      toast({ title: 'Score added!' });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteOtherTestScore,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['other-tests'] }); toast({ title: 'Removed' }); },
  });

  function handleSave() {
    const name = testName === 'Other' ? customTest : testName;
    if (!name || !date) return;
    addMutation.mutate({
      testName: name, attemptDate: date,
      totalScore: total ? parseFloat(total) : null,
      sectionsJson: JSON.stringify(sections),
      notes: notes || null,
    });
  }

  const TEST_NAMES = ['GRE', 'GMAT', 'TOEFL', 'SAT', 'Duolingo', 'Other'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{(scores as unknown[]).length} test attempt{(scores as unknown[]).length !== 1 ? 's' : ''} recorded</p>
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-navy hover:bg-navy/90 dark:bg-teal text-white">
          <Plus className="w-4 h-4 mr-1" /> Log Score
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-teal/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Log Test Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Test</Label>
                <Select value={testName} onValueChange={v => { setTestName(v); setSections({}); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEST_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {testName === 'Other' && (
                <div className="space-y-1">
                  <Label>Test Name</Label>
                  <Input placeholder="e.g. PTE" value={customTest} onChange={e => setCustomTest(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label>Attempt Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Total Score</Label>
                <Input type="number" placeholder="e.g. 330" value={total} onChange={e => setTotal(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Section Scores</Label>
              <div className="grid sm:grid-cols-2 gap-3">
                {activeSections.map(sec => (
                  <div key={sec} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{sec}</Label>
                    <Input
                      type="number"
                      placeholder="Score"
                      value={sections[sec] || ''}
                      onChange={e => setSections(p => ({ ...p, [sec]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Target university requirements, next steps…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={!date || (!testName && !customTest)} className="bg-navy hover:bg-navy/90 dark:bg-teal text-white">
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
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (scores as unknown[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No test scores yet</p>
          <p className="text-sm mt-1">Log your GRE, GMAT, TOEFL, or other standardised test results.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {(scores as { id: number; testName: string; totalScore?: number | null; attemptDate: string; sectionsJson?: string | null; notes?: string | null }[]).map(s => {
            let parsedSections: Record<string, string> = {};
            try { parsedSections = s.sectionsJson ? JSON.parse(s.sectionsJson) : {}; } catch { /**/ }
            const sectionEntries = Object.entries(parsedSections).filter(([, v]) => v);
            return (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy dark:text-teal text-lg">{s.testName}</span>
                        {s.totalScore != null && (
                          <span className="text-2xl font-bold">{s.totalScore}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {s.attemptDate}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(s.id)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {sectionEntries.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sectionEntries.map(([sec, val]) => (
                        <div key={sec} className="bg-muted rounded-lg px-2.5 py-1 text-center">
                          <p className="text-[10px] text-muted-foreground">{sec}</p>
                          <p className="text-sm font-semibold">{val}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {s.notes && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{s.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScholarshipsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: schols = [], isLoading } = useQuery({ queryKey: ['scholarships'], queryFn: api.getScholarships });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const empty = {
    name: '', provider: '', amount: '', currency: 'USD',
    fundingType: 'full', deadline: '', status: 'planning', notes: '',
  };
  const [form, setForm] = useState(empty);

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addScholarship(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scholarships'] });
      setShowForm(false); setForm(empty); setEditId(null);
      toast({ title: 'Scholarship added!' });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateScholarship(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scholarships'] }); setShowForm(false); setEditId(null); toast({ title: 'Updated!' }); },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteScholarship,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['scholarships'] }); toast({ title: 'Removed' }); },
  });

  function startEdit(s: typeof empty & { id: number }) {
    setForm({ ...empty, ...s, amount: s.amount?.toString() || '' });
    setEditId(s.id);
    setShowForm(true);
  }

  function handleSave() {
    const payload = { ...form, amount: form.amount ? parseFloat(form.amount) : null };
    if (editId) updateMutation.mutate({ id: editId, data: payload as unknown as Record<string, unknown> });
    else addMutation.mutate(payload as unknown as Record<string, unknown>);
  }

  const FUNDING_TYPES = ['full', 'partial', 'tuition_waiver', 'stipend_only', 'travel_grant', 'other'];
  const FUNDING_LABELS: Record<string, string> = {
    full: 'Full Funding', partial: 'Partial', tuition_waiver: 'Tuition Waiver',
    stipend_only: 'Stipend Only', travel_grant: 'Travel Grant', other: 'Other',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{(schols as unknown[]).length} scholarship{(schols as unknown[]).length !== 1 ? 's' : ''} tracked</p>
        <Button size="sm" onClick={() => { setForm(empty); setEditId(null); setShowForm(true); }} className="bg-navy hover:bg-navy/90 dark:bg-teal text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Scholarship
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-teal/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editId ? 'Edit Scholarship' : 'New Scholarship'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Scholarship Name *</Label>
                <Input placeholder="e.g. Fulbright Scholarship" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Provider / University</Label>
                <Input placeholder="e.g. US State Dept / Harvard" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Funding Type</Label>
                <Select value={form.fundingType} onValueChange={v => setForm(p => ({ ...p, fundingType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNDING_TYPES.map(t => <SelectItem key={t} value={t}>{FUNDING_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="space-y-1 flex-1">
                  <Label>Amount</Label>
                  <Input type="number" placeholder="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="space-y-1 w-24">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'SGD', 'BDT', 'INR', 'Other'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Deadline</Label>
                <Input type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
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
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Eligibility requirements, links, contacts…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={!form.name} className="bg-navy hover:bg-navy/90 dark:bg-teal text-white">
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
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (schols as unknown[]).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No scholarships yet</p>
          <p className="text-sm mt-1">Track Fulbright, Commonwealth, university grants, and more.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {(schols as (typeof empty & { id: number; amount?: number | null })[]).map(s => {
            const meta = SCH_STATUS_META[s.status as ScholarshipStatus] || SCH_STATUS_META.planning;
            return (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-navy dark:text-white truncate">{s.name}</h3>
                        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{s.provider}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {FUNDING_LABELS[s.fundingType] || s.fundingType}
                          {s.amount != null ? ` · ${s.currency} ${s.amount.toLocaleString()}` : ''}
                        </span>
                        {s.deadline && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {s.deadline}</span>}
                      </div>
                      {s.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{s.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(s as typeof empty & { id: number; amount?: number | null })} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(s.id)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FUNDING_LABELS: Record<string, string> = {
  full: 'Full Funding', partial: 'Partial', tuition_waiver: 'Tuition Waiver',
  stipend_only: 'Stipend Only', travel_grant: 'Travel Grant', other: 'Other',
};
