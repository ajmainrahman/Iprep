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
  Target, ClipboardList, ChevronRight, Layers, List, GitBranch,
  ExternalLink, Copy, MessageSquare, Bell, Pencil, Save, ArrowUpRight,
  CircleCheckBig, Clock3, Building2, CalendarClock, Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ── Types ────────────────────────────────────────────────────────────────── */
type AppStatus =
  | 'researching' | 'shortlisted' | 'supervisor_contact' | 'preparing'
  | 'ready_to_apply' | 'applied' | 'under_review' | 'interview'
  | 'offer' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred'
  | 'withdrawn' | 'missed_deadline';
type ScholarshipStatus = 'planning' | 'ready_to_apply' | 'applied' | 'awarded' | 'rejected';
type Priority = 'high' | 'medium' | 'low';
type ReqItem = { label: string; done: boolean };

const APP_STATUS_META: Record<AppStatus, { label: string; color: string; bg: string }> = {
  researching:    { label: 'Researching',    color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-800' },
  shortlisted:    { label: 'Shortlisted',    color: 'text-cyan-700',    bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  supervisor_contact: { label: 'Supervisor Contact', color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  preparing:      { label: 'Preparing',      color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ready_to_apply: { label: 'Ready to Apply', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  applied:        { label: 'Submitted',      color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30' },
  under_review:   { label: 'Under Review',   color: 'text-sky-600',     bg: 'bg-sky-100 dark:bg-sky-900/30' },
  interview:      { label: 'Interview',      color: 'text-purple-600',  bg: 'bg-purple-100 dark:bg-purple-900/30' },
  offer:          { label: 'Offer',          color: 'text-green-700',   bg: 'bg-green-100 dark:bg-green-900/30' },
  accepted:       { label: 'Accepted',       color: 'text-teal-700',    bg: 'bg-teal-100 dark:bg-teal-900/30' },
  rejected:       { label: 'Rejected',       color: 'text-red-600',     bg: 'bg-red-100 dark:bg-red-900/30' },
  waitlisted:     { label: 'Waitlisted',     color: 'text-orange-600',  bg: 'bg-orange-100 dark:bg-orange-900/30' },
  deferred:       { label: 'Deferred',       color: 'text-yellow-600',  bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  withdrawn:      { label: 'Withdrawn',      color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800' },
  missed_deadline:{ label: 'Missed Deadline',color: 'text-red-700',     bg: 'bg-red-100 dark:bg-red-900/30' },
};

const SCH_STATUS_META: Record<ScholarshipStatus, { label: string; color: string }> = {
  planning:       { label: 'Eligible',       color: 'text-slate-600' },
  ready_to_apply: { label: 'Applying',       color: 'text-amber-600' },
  applied:        { label: 'Applied',        color: 'text-blue-600' },
  awarded:        { label: 'Won',            color: 'text-emerald-600' },
  rejected:       { label: 'Not selected',   color: 'text-red-600' },
};

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string; dot: string }> = {
  high:   { label: 'High',   color: 'text-red-600',    bg: 'bg-red-50 border-red-200 dark:bg-red-900/20',       dot: 'bg-red-500' },
  medium: { label: 'Medium', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20', dot: 'bg-orange-400' },
  low:    { label: 'Low',    color: 'text-slate-500',  bg: 'bg-slate-50 border-slate-200 dark:bg-slate-800',    dot: 'bg-slate-400' },
};

const COUNTRIES = [
  'Australia','Austria','Belgium','Canada','China','Czech Republic','Denmark','Estonia',
  'Finland','France','Germany','Hungary','India','Ireland','Italy','Japan','Latvia',
  'Lithuania','Luxembourg','Netherlands','New Zealand','Norway','Poland','Portugal',
  'Romania','Singapore','Slovakia','Slovenia','South Korea','Spain','Sweden',
  'Switzerland','United Kingdom','United States',
];

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

type TrackedRow = Record<string, unknown> & { id: number };

function nextApplicationAction(app: TrackedRow): string {
  const reqs = safeParseReqs(app.requirementsJson as string);
  const openReqs = reqs.filter(item => !item.done).length;
  const days = daysUntil(String(app.deadline || ''));
  if (days !== null && days >= 0 && days <= 7) return days === 0 ? 'Submit today' : `Deadline in ${days}d`;
  if (app.status === 'researching') return 'Review programme fit';
  if (app.status === 'shortlisted') return 'Confirm programme requirements';
  if (app.status === 'supervisor_contact') return 'Find potential supervisors';
  if (app.status === 'preparing') return openReqs ? `Finish ${openReqs} document${openReqs === 1 ? '' : 's'}` : 'Review application';
  if (app.status === 'ready_to_apply') return openReqs ? `Finish ${openReqs} document${openReqs === 1 ? '' : 's'}` : 'Submit application';
  if (app.status === 'applied' || app.status === 'under_review') return 'Watch for updates';
  if (app.status === 'interview') return 'Prepare for interview';
  if (app.status === 'offer') return 'Review offer details';
  if (app.status === 'accepted') return 'Plan your next steps';
  if (app.status === 'waitlisted') return 'Check for updates';
  if (app.status === 'missed_deadline') return 'Review alternate deadlines';
  if (app.status === 'withdrawn') return 'Revisit when ready';
  return openReqs ? `Finish ${openReqs} document${openReqs === 1 ? '' : 's'}` : 'Keep notes current';
}

function nextScholarshipAction(scholarship: TrackedRow): string {
  const reqs = parseReqs(scholarship.requirementsJson);
  const openReqs = reqs.filter(item => !item.done).length;
  const days = daysUntil(String(scholarship.deadline || ''));
  if (days !== null && days >= 0 && days <= 7) return days === 0 ? 'Submit today' : `Deadline in ${days}d`;
  if (scholarship.status === 'planning') return 'Check eligibility';
  if (scholarship.status === 'ready_to_apply') return openReqs ? `Finish ${openReqs} requirement${openReqs === 1 ? '' : 's'}` : 'Submit application';
  if (scholarship.status === 'applied') return 'Watch for updates';
  if (scholarship.status === 'awarded') return 'Confirm award details';
  return openReqs ? `Finish ${openReqs} requirement${openReqs === 1 ? '' : 's'}` : 'Archive or revisit';
}

function DeadlineCue({ deadline }: { deadline: unknown }) {
  const date = String(deadline || '');
  const days = daysUntil(date);
  const urgent = days !== null && days >= 0 && days <= 7;
  const soon = days !== null && days > 7 && days <= 30;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${urgent ? 'text-red-600' : soon ? 'text-amber-700' : 'text-muted-foreground'}`}>
      <CalendarDays className="h-3.5 w-3.5" />
      {date ? fmtDate(date) : 'No deadline'}
      {days !== null && days >= 0 && <span className="font-bold">· {days === 0 ? 'Today' : `${days}d left`}</span>}
    </span>
  );
}

/* ── Application readiness score ─────────────────────────────────────────────
   NOT an admission probability — purely "how prepared is this application"
   based on (a) how far it has progressed through the lifecycle and
   (b) how many required documents are done. ──────────────────────────────── */
const READINESS_STAGES: AppStatus[] = [
  'researching', 'shortlisted', 'supervisor_contact', 'preparing',
  'ready_to_apply', 'applied', 'under_review', 'interview', 'offer', 'accepted',
];

function computeReadiness(app: TrackedRow): number {
  const reqs = safeParseReqs(app.requirementsJson as string);
  const docsPct = reqs.length ? (reqs.filter(r => r.done).length / reqs.length) * 100 : 0;
  const status = String(app.status || 'researching') as AppStatus;
  const stageIdx = READINESS_STAGES.indexOf(status);
  // Rejected / withdrawn / waitlisted / deferred / missed_deadline: freeze at whatever the docs say.
  const stagePct = stageIdx >= 0 ? (stageIdx / (READINESS_STAGES.length - 1)) * 100 : docsPct;
  const score = reqs.length ? docsPct * 0.65 + stagePct * 0.35 : stagePct * 0.5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function ReadinessBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const tone = value >= 70 ? '#16a34a' : value >= 40 ? '#d97706' : '#94a3b8';
  return (
    <div className="flex items-center gap-2" data-testid="readiness-bar">
      <div className={`flex-1 overflow-hidden rounded-full bg-muted ${compact ? 'h-1' : 'h-1.5'}`}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: tone }} />
      </div>
      <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: tone }}>{value}%</span>
    </div>
  );
}

/* ── Deadline urgency (4-tier, text-forward — never color-only) ──────────── */
type UrgencyTier = 'critical' | 'upcoming' | 'soon' | 'later' | 'none';
function deadlineUrgency(days: number | null): { tier: UrgencyTier; text: string; className: string } {
  if (days === null) return { tier: 'none', text: 'No deadline', className: 'text-muted-foreground' };
  if (days < 0) return { tier: 'critical', text: 'Deadline passed', className: 'text-red-600 font-semibold' };
  if (days === 0) return { tier: 'critical', text: 'Due today · Critical', className: 'text-red-600 font-semibold' };
  if (days <= 7) return { tier: 'critical', text: `${days} day${days === 1 ? '' : 's'} left · Critical`, className: 'text-red-600 font-semibold' };
  if (days <= 30) return { tier: 'upcoming', text: `${days} days left · Upcoming`, className: 'text-orange-600 font-medium' };
  if (days <= 60) return { tier: 'soon', text: `${days} days left · Soon`, className: 'text-amber-600 font-medium' };
  return { tier: 'later', text: `${days} days left`, className: 'text-muted-foreground' };
}

/* ── Country → flag emoji (falls back to a globe if unmapped) ───────────── */
const COUNTRY_ISO: Record<string, string> = {
  Australia: 'AU', Austria: 'AT', Belgium: 'BE', Canada: 'CA', China: 'CN',
  'Czech Republic': 'CZ', Denmark: 'DK', Estonia: 'EE', Finland: 'FI', France: 'FR',
  Germany: 'DE', Hungary: 'HU', India: 'IN', Ireland: 'IE', Italy: 'IT', Japan: 'JP',
  Latvia: 'LV', Lithuania: 'LT', Luxembourg: 'LU', Netherlands: 'NL', 'New Zealand': 'NZ',
  Norway: 'NO', Poland: 'PL', Portugal: 'PT', Romania: 'RO', Singapore: 'SG',
  Slovakia: 'SK', Slovenia: 'SI', 'South Korea': 'KR', Spain: 'ES', Sweden: 'SE',
  Switzerland: 'CH', 'United Kingdom': 'GB', 'United States': 'US',
};
function countryFlag(country: string): string {
  const iso = COUNTRY_ISO[country];
  if (!iso) return '🌐';
  return iso.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export function HigherStudyPrep({ tab, onTabChange }: { tab: string; onTabChange: (t: string) => void }) {
  return (
    <>
      {tab === 'overview'     && <UnifiedOverviewTab onTabChange={onTabChange} />}
      {tab === 'applications' && <ApplicationsTab />}
      {tab === 'tests'        && <TestScoresTab />}
      {tab === 'scholarships' && <ScholarshipsTab />}
      {tab === 'templates'    && <ChecklistTemplates />}
    </>
  );
}

function NoticeBoardCard({
  board,
  boardKey,
}: {
  board: { id: number; title: string; content: string };
  boardKey: 'left' | 'right';
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(board.title);
  const [draftContent, setDraftContent] = useState(board.content);

  useEffect(() => {
    if (!editing) {
      setDraftTitle(board.title);
      setDraftContent(board.content);
    }
  }, [board.title, board.content, editing]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateNoticeBoard(boardKey, { title: draftTitle, content: draftContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notice-boards'] });
      setEditing(false);
      toast({ title: 'Notice board updated' });
    },
  });

  return (
    <Card className={`overflow-hidden border-0 shadow-sm ${boardKey === 'left' ? 'bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/60 dark:from-indigo-950/30 dark:via-card dark:to-sky-950/20' : 'bg-gradient-to-br from-amber-50/90 via-white to-rose-50/60 dark:from-amber-950/20 dark:via-card dark:to-rose-950/20'}`}>
      <div className={`h-1 ${boardKey === 'left' ? 'bg-gradient-to-r from-indigo-500 to-sky-400' : 'bg-gradient-to-r from-amber-400 to-rose-400'}`} />
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${boardKey === 'left' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300'}`}>
            <Bell className="w-4 h-4" />
          </div>
          {editing ? (
            <Input
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              className="h-8 text-sm font-semibold bg-white/70 dark:bg-background/60"
              aria-label={`${boardKey} notice board title`}
            />
          ) : (
            <div>
              <CardTitle className="text-sm">{board.title}</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">Editable dashboard board</p>
            </div>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs shrink-0"
          onClick={() => {
            if (editing) saveMutation.mutate();
            else setEditing(true);
          }}
          disabled={saveMutation.isPending || !draftTitle.trim()}
        >
          {editing ? <Save className="w-3.5 h-3.5 mr-1" /> : <Pencil className="w-3.5 h-3.5 mr-1" />}
          {editing ? 'Save' : 'Edit'}
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        {editing ? (
          <Textarea
            rows={5}
            value={draftContent}
            onChange={e => setDraftContent(e.target.value)}
            placeholder={boardKey === 'left' ? 'Write an upcoming notice, deadline, or reminder…' : 'Write the tasks you want to focus on…'}
            className="resize-none bg-white/80 dark:bg-background/60 text-sm"
            aria-label={`${boardKey} notice board content`}
          />
        ) : (
          <div
            className="min-h-[112px] rounded-xl border border-dashed border-border/80 bg-white/45 dark:bg-background/30 p-3 cursor-text hover:bg-white/70 dark:hover:bg-background/50 transition-colors"
            onClick={() => setEditing(true)}
          >
            {board.content.trim() ? (
              <p className="text-sm leading-6 whitespace-pre-wrap text-foreground/80">{board.content}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">Click Edit to add a notice or task…</p>
            )}
          </div>
        )}
        {editing && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">{draftContent.length}/4000 characters</span>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setDraftTitle(board.title); setDraftContent(board.content); setEditing(false); }}>
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════════════════════════════════════════ */
function UnifiedOverviewTab({ onTabChange }: { onTabChange: (t: string) => void }) {
  const { data: apps = [], isLoading: appsLoading } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const { data: schols = [], isLoading: scholarshipsLoading } = useQuery({ queryKey: ['scholarships'], queryFn: api.getScholarships });
  const { data: tests = [] } = useQuery({ queryKey: ['other-tests'], queryFn: api.getOtherTestScores });

  const [recordType, setRecordType] = useState<'all' | 'application' | 'scholarship'>('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [collapsedCountries, setCollapsedCountries] = useState<Record<string, boolean>>({});

  type ApplicationRow = Record<string, unknown> & { id: number };
  type ScholarshipRow = Record<string, unknown> & { id: number };
  type UnifiedRecord = {
    key: string;
    type: 'application' | 'scholarship' | 'both';
    country: string;
    deadline: string | null;
    priority: Priority;
    app?: ApplicationRow;
    scholarship?: ScholarshipRow;
  };

  const applicationRows = apps as ApplicationRow[];
  const scholarshipRows = schols as ScholarshipRow[];
  const applicationById = new Map(applicationRows.map(app => [app.id, app]));
  const scholarshipByApplicationId = new Map<number, ScholarshipRow>();
  scholarshipRows.forEach(scholarship => {
    const linkedId = Number(scholarship.linkedApplicationId);
    if (linkedId && applicationById.has(linkedId)) scholarshipByApplicationId.set(linkedId, scholarship);
  });

  const unifiedRecords: UnifiedRecord[] = [
    ...applicationRows.map(app => {
      const scholarship = scholarshipByApplicationId.get(app.id);
      const priority = String(app.priority || scholarship?.priority || 'medium') as Priority;
      return {
        key: scholarship ? `both-${app.id}-${scholarship.id}` : `application-${app.id}`,
        type: scholarship ? ('both' as const) : ('application' as const),
        country: String(app.country || scholarship?.country || 'Other'),
        deadline: String(app.deadline || scholarship?.deadline || '') || null,
        priority: PRIORITY_META[priority] ? priority : 'medium',
        app,
        scholarship,
      };
    }),
    ...scholarshipRows
      .filter(scholarship => {
        const linkedId = Number(scholarship.linkedApplicationId);
        return !linkedId || !applicationById.has(linkedId);
      })
      .map(scholarship => {
        const priority = String(scholarship.priority || 'medium') as Priority;
        return {
          key: `scholarship-${scholarship.id}`,
          type: 'scholarship' as const,
          country: String(scholarship.country || 'Other'),
          deadline: String(scholarship.deadline || '') || null,
          priority: PRIORITY_META[priority] ? priority : 'medium',
          scholarship,
        };
      }),
  ];

  const requirementsFor = (record: UnifiedRecord) => {
    const appReqs = record.app ? safeParseReqs(record.app.requirementsJson as string) : [];
    const scholarshipReqs = record.scholarship ? parseReqs(record.scholarship.requirementsJson) : [];
    return [...appReqs, ...scholarshipReqs];
  };
  const countries = [...new Set(unifiedRecords.map(record => record.country).filter(Boolean))].sort();
  const filteredRecords = unifiedRecords
    .filter(record => {
      if (recordType === 'application' && !record.app) return false;
      if (recordType === 'scholarship' && !record.scholarship) return false;
      if (countryFilter !== 'all' && record.country !== countryFilter) return false;
      if (priorityFilter !== 'all' && record.priority !== priorityFilter) return false;
      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const searchable = [
          record.app?.universityName,
          record.app?.program,
          record.scholarship?.name,
          record.scholarship?.provider,
          record.country,
        ].map(value => String(value || '').toLowerCase()).join(' ');
        if (!searchable.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline > b.deadline ? 1 : -1;
    });

  const groups = filteredRecords.reduce<Record<string, UnifiedRecord[]>>((acc, record) => {
    if (!acc[record.country]) acc[record.country] = [];
    acc[record.country].push(record);
    return acc;
  }, {});
  const sortedCountries = Object.keys(groups).sort();

  const totalRequirementItems = unifiedRecords.reduce((total, record) => total + requirementsFor(record).length, 0);
  const completedRequirementItems = unifiedRecords.reduce((total, record) => total + requirementsFor(record).filter(item => item.done).length, 0);
  const requirementsPercent = totalRequirementItems ? Math.round((completedRequirementItems / totalRequirementItems) * 100) : 0;
  const upcomingDeadlines = unifiedRecords
    .filter(record => {
      const days = daysUntil(record.deadline || '');
      return days !== null && days >= 0;
    })
    .sort((a, b) => (daysUntil(a.deadline || '') ?? 999) - (daysUntil(b.deadline || '') ?? 999));
  const next30Days = upcomingDeadlines.filter(record => (daysUntil(record.deadline || '') ?? 999) <= 30);
  const highPriorityCount = unifiedRecords.filter(record => record.priority === 'high').length;
  const latestTest = (tests as { id: number; testName: string; totalScore?: number | null; attemptDate: string }[])
    .slice().sort((a, b) => new Date(b.attemptDate).getTime() - new Date(a.attemptDate).getTime())[0];

  const statusLabel = (value: unknown, type: 'application' | 'scholarship') => {
    const fallback = type === 'application' ? APP_STATUS_META.researching : SCH_STATUS_META.planning;
    const meta = type === 'application'
      ? APP_STATUS_META[String(value) as AppStatus] || fallback
      : SCH_STATUS_META[String(value) as ScholarshipStatus] || fallback;
    return meta.label;
  };

  const recordTitle = (record: UnifiedRecord) => String(record.app?.universityName || record.scholarship?.name || 'Untitled target');
  const recordSubtitle = (record: UnifiedRecord) => {
    if (record.type === 'both') return `${String(record.app?.program || 'University application')} · ${String(record.scholarship?.name || 'Linked scholarship')}`;
    if (record.app) return `${String(record.app.program || 'Program')} · ${String(record.app.degreeType || '')}`;
    return String(record.scholarship?.provider || record.scholarship?.fundingType || 'Funding opportunity');
  };
  const priorityActions = unifiedRecords
    .filter(record => {
      const appStatus = String(record.app?.status || '');
      const scholarshipStatus = String(record.scholarship?.status || '');
      return !['accepted', 'rejected', 'withdrawn', 'missed_deadline'].includes(appStatus)
        && !['awarded', 'rejected'].includes(scholarshipStatus);
    })
    .map(record => {
      const requirements = requirementsFor(record);
      const openRequirements = requirements.filter(item => !item.done).length;
      const days = daysUntil(record.deadline || '');
      const priorityWeight = record.priority === 'high' ? 45 : record.priority === 'medium' ? 25 : 10;
      const deadlineWeight = days === null ? 0 : days < 0 ? 70 : Math.max(8, 70 - days);
      const taskWeight = openRequirements ? 25 : 0;
      return {
        record,
        task: record.app ? nextApplicationAction(record.app) : nextScholarshipAction(record.scholarship!),
        score: priorityWeight + deadlineWeight + taskWeight,
        openRequirements,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  function TypeMark({ type }: { type: UnifiedRecord['type'] }) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ borderColor: type === 'scholarship' ? '#f4c978' : type === 'both' ? '#a6b7f7' : '#9adfd2', color: type === 'scholarship' ? '#9a6700' : type === 'both' ? '#4654a8' : '#087f73', backgroundColor: type === 'scholarship' ? '#fff8e8' : type === 'both' ? '#f1f3ff' : '#eefbf8' }}>
        {type === 'scholarship' ? <Trophy className="h-3 w-3" /> : type === 'both' ? <CircleCheckBig className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
        {type === 'both' ? 'Combined target' : type === 'scholarship' ? 'Scholarship' : 'Application'}
      </span>
    );
  }

  function DeadlineLabel({ deadline }: { deadline: string | null }) {
    const days = daysUntil(deadline || '');
    return (
      <div className={`flex items-center gap-2 text-xs ${days !== null && days >= 0 && days <= 7 ? 'text-red-600' : days !== null && days >= 0 && days <= 30 ? 'text-amber-700' : 'text-muted-foreground'}`}>
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        <span>{deadline ? fmtDate(deadline) : 'No deadline set'}</span>
        {days !== null && (
          <span className="font-bold">{days < 0 ? 'Past' : days === 0 ? 'Today' : `${days}d left`}</span>
        )}
      </div>
    );
  }

  function UnifiedRecordCard({ record, timeline = false }: { record: UnifiedRecord; timeline?: boolean }) {
    const reqs = requirementsFor(record);
    const doneCount = reqs.filter(item => item.done).length;
    const progress = reqs.length ? Math.round((doneCount / reqs.length) * 100) : 0;
    const priorityMeta = PRIORITY_META[record.priority];
    const application = record.app;
    const scholarship = record.scholarship;
    return (
      <article data-testid={`unified-record-${record.key}`} className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${timeline ? 'bg-white/90' : 'bg-white'}`} style={{ borderColor: record.type === 'both' ? '#bfc8fa' : 'var(--apps-border)', boxShadow: '0 1px 2px rgba(20, 20, 43, 0.04)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TypeMark type={record.type} />
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] ${priorityMeta.color}`}><span className={`h-1.5 w-1.5 rounded-full ${priorityMeta.dot}`} />{priorityMeta.label} priority</span>
            </div>
            <h3 className="mt-2 truncate text-base font-bold tracking-tight" style={{ color: 'var(--apps-text-primary)' }}>{recordTitle(record)}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{recordSubtitle(record)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {application && <button type="button" data-testid={`button-open-application-${application.id}`} onClick={() => onTabChange('applications')} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[#eefbf8] hover:text-[#087f73]" title="Open application" aria-label="Open application"><GraduationCap className="h-4 w-4" /></button>}
            {scholarship && <button type="button" data-testid={`button-open-scholarship-${scholarship.id}`} onClick={() => onTabChange('scholarships')} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-[#fff8e8] hover:text-[#9a6700]" title="Open scholarship" aria-label="Open scholarship"><Trophy className="h-4 w-4" /></button>}
          </div>
        </div>

        {record.type === 'both' && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-[#dce5f1] bg-[#f6f9fc] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5f7187]">Application status</p>
              <p className="mt-1 text-sm font-semibold text-[#26384c]">{statusLabel(application?.status, 'application')}</p>
              <p className="mt-1 text-[11px] text-[#6f8194]">{String(application?.universityName || '')}</p>
            </div>
            <div className="rounded-xl border border-[#f2e4c8] bg-[#fffaf0] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8f6f2c]">Scholarship status</p>
              <p className="mt-1 text-sm font-semibold text-[#654f18]">{statusLabel(scholarship?.status, 'scholarship')}</p>
              <p className="mt-1 text-[11px] text-[#947c42]">{String(scholarship?.fundingType || 'Funding opportunity')}</p>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.25fr_1fr_1fr]">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Deadline</p>
            <DeadlineLabel deadline={record.deadline} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Country / region</p>
            <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground"><Globe className="h-3.5 w-3.5 text-muted-foreground" />{record.country}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">IELTS required</p>
            <p className="text-xs font-semibold text-foreground">{String(application?.ieltsScoreRequired || application?.ieltsRequired || 'Not set')}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground"><ClipboardList className="h-3.5 w-3.5" />Documents / requirements</p>
            <span className="text-xs font-bold text-foreground">{doneCount}/{reqs.length} done</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#edf0f4]"><div className="h-full rounded-full bg-[#12a594] transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-xs text-muted-foreground" style={{ borderColor: 'var(--apps-border)' }}>
          <span><strong className="font-semibold text-foreground">Applied?</strong> {application?.appliedDate || scholarship?.dateApplied ? 'Yes' : 'No'}</span>
          <span><strong className="font-semibold text-foreground">Result</strong> {application ? statusLabel(application.status, 'application') : scholarship ? statusLabel(scholarship.status, 'scholarship') : 'Not set'}</span>
          {Boolean(scholarship?.amount) && <span><strong className="font-semibold text-foreground">Award</strong> {Number(scholarship?.amount).toLocaleString()} {String(scholarship?.currency || '')}</span>}
        </div>
        {Boolean(application?.notes || application?.comments || scholarship?.notes) && (
          <p className="mt-3 line-clamp-2 text-xs italic text-muted-foreground">{String(application?.notes || application?.comments || scholarship?.notes)}</p>
        )}
      </article>
    );
  }

  const renderGroup = (country: string, timeline = false) => (
    <section key={country} data-testid={`unified-country-group-${country}`}>
      <button type="button" data-testid={`button-toggle-country-${country}`} onClick={() => setCollapsedCountries(previous => ({ ...previous, [country]: !previous[country] }))} className="mb-3 flex w-full items-center gap-2 text-left">
        {collapsedCountries[country] ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-bold tracking-tight text-foreground">{country}</span>
        <span className="rounded-full bg-[#edf0f4] px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{groups[country].length}</span>
        <span className="text-[10px] text-muted-foreground">{groups[country].filter(record => record.app).length} apps · {groups[country].filter(record => record.scholarship).length} scholarships</span>
        <div className="ml-2 h-px flex-1 bg-border" />
      </button>
      {!collapsedCountries[country] && (
        <div className={timeline ? 'relative space-y-4 pl-7' : 'space-y-3'}>
          {timeline && <div className="absolute bottom-3 left-2.5 top-2 w-px bg-[#dce5f1]" />}
          {groups[country].map(record => timeline ? (
            <div key={record.key} className="relative">
              <span className="absolute -left-[1.42rem] top-5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#12a594] shadow-sm" />
              <UnifiedRecordCard record={record} timeline />
            </div>
          ) : <UnifiedRecordCard key={record.key} record={record} />)}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-5 pb-4" style={{ color: 'var(--apps-text-primary)' }}>
      <div className="relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-[0_16px_40px_rgba(31,41,76,0.16)] sm:p-8" style={{ background: 'linear-gradient(115deg, #17223b 0%, #263f63 52%, #147f79 100%)' }}>
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#89e4d7]/15 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#f6c976]/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#a7e8df]">Fly · Higher Study</p>
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Everything that moves your future forward.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">One focused view for university applications and funding opportunities, ordered by what needs your attention next.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" data-testid="button-overview-add-application" onClick={() => onTabChange('applications')} className="border border-white/20 bg-white/10 text-white hover:bg-white/20"><GraduationCap className="mr-1.5 h-3.5 w-3.5" />Add application</Button>
            <Button size="sm" data-testid="button-overview-add-scholarship" onClick={() => onTabChange('scholarships')} className="bg-[#f6c976] text-[#3f3214] hover:bg-[#f9d998]"><Trophy className="mr-1.5 h-3.5 w-3.5" />Add scholarship</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Applications', value: applicationRows.length, icon: GraduationCap, tone: '#eefbf8', ink: '#087f73', testId: 'total-applications' },
          { label: 'Scholarships', value: scholarshipRows.length, icon: Trophy, tone: '#fff8e8', ink: '#9a6700', testId: 'total-scholarships' },
          { label: 'Docs / requirements', value: `${completedRequirementItems}/${totalRequirementItems}`, icon: ClipboardList, tone: '#f1f3ff', ink: '#4654a8', testId: 'completed-requirements' },
          { label: 'Due in 30 days', value: next30Days.length, icon: CalendarClock, tone: '#fff0ed', ink: '#c64b3c', testId: 'upcoming-deadlines' },
        ].map(stat => (
          <div key={stat.label} data-testid={`unified-stat-${stat.testId}`} className="rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(20,20,43,0.04)]" style={{ borderColor: 'var(--apps-border)' }}>
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-heading text-2xl font-bold" style={{ color: 'var(--apps-text-primary)' }}>{stat.value}</p><p className="mt-1 text-[11px] font-medium text-muted-foreground">{stat.label}</p></div>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: stat.tone, color: stat.ink }}><stat.icon className="h-4 w-4" /></span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#f2d7a2] bg-[#fffaf0] p-4 shadow-[0_10px_28px_rgba(204,147,45,0.08)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-start gap-3 lg:w-[31%]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6c976] text-[#5f4814]"><CalendarClock className="h-5 w-5" /></span>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a6700]">Deadline radar</p><h3 className="mt-1 text-lg font-bold tracking-tight text-[#3f3214]">{next30Days.length ? `${next30Days.length} target${next30Days.length === 1 ? '' : 's'} need attention` : 'No urgent deadlines'}</h3><p className="mt-1 text-xs text-[#947c42]">{next30Days.length ? 'The next 30 days, across applications and scholarships.' : 'You have breathing room. Keep adding dates as you find them.'}</p></div>
          </div>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            {upcomingDeadlines.slice(0, 3).map(record => {
              const days = daysUntil(record.deadline || '');
              return <button type="button" data-testid={`button-deadline-${record.key}`} key={record.key} onClick={() => onTabChange(record.app ? 'applications' : 'scholarships')} className="min-w-0 rounded-xl border border-[#f1dfbb] bg-white/80 p-3 text-left transition-colors hover:bg-white"><div className="flex items-center justify-between gap-2"><TypeMark type={record.type} /><span className={`text-xs font-bold ${days !== null && days <= 7 ? 'text-red-600' : 'text-amber-700'}`}>{days === 0 ? 'Today' : `${days}d`}</span></div><p className="mt-2 truncate text-xs font-bold text-[#3f3214]">{recordTitle(record)}</p><p className="mt-1 truncate text-[10px] text-[#947c42]">{record.deadline ? fmtDate(record.deadline) : 'No deadline'}</p></button>;
            })}
            {upcomingDeadlines.length === 0 && <div className="col-span-3 flex items-center justify-center rounded-xl border border-dashed border-[#f1dfbb] p-4 text-xs text-[#947c42]">Add a deadline to see it here.</div>}
          </div>
        </div>
      </div>

      <div data-testid="overview-priority-actions" className="rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(20,20,43,0.04)] sm:p-5" style={{ borderColor: 'var(--apps-border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#c64b3c]">Next actions</p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">Priority actions</h3>
            <p className="mt-1 text-xs text-muted-foreground">Deadline proximity, priority, status, and incomplete requirements decide what rises to the top.</p>
          </div>
          <span className="hidden rounded-full bg-[#fff0ed] px-2.5 py-1 text-[10px] font-bold text-[#c64b3c] sm:block">{priorityActions.length} to review</span>
        </div>
        {priorityActions.length === 0 ? (
          <div data-testid="overview-priority-actions-empty" className="mt-4 rounded-xl border border-dashed border-border bg-[#fbfcfd] p-5 text-center text-xs text-muted-foreground">You’re all clear for now. Add a target or a deadline to keep your plan moving.</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {priorityActions.map(({ record, task, openRequirements }) => (
              <div key={record.key} data-testid={`priority-action-${record.key}`} className="flex min-w-0 items-center gap-3 rounded-xl border bg-[#fbfcfd] p-3.5" style={{ borderColor: 'var(--apps-border)' }}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${record.priority === 'high' ? 'bg-red-500' : record.priority === 'medium' ? 'bg-orange-400' : 'bg-slate-400'}`} title={`${PRIORITY_META[record.priority].label} priority`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-foreground">{recordTitle(record)}</p>
                    <TypeMark type={record.type} />
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-[#4654a8]">{task}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <DeadlineCue deadline={record.deadline} />
                    <span>{record.app ? statusLabel(record.app.status, 'application') : statusLabel(record.scholarship?.status, 'scholarship')}</span>
                    {openRequirements > 0 && <span>{openRequirements} incomplete</span>}
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" data-testid={`button-continue-priority-${record.key}`} onClick={() => onTabChange(record.app ? 'applications' : 'scholarships')} className="h-8 shrink-0 px-2.5 text-[11px]">Continue <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-3 shadow-[0_1px_2px_rgba(20,20,43,0.04)]" style={{ borderColor: 'var(--apps-border)' }}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex flex-wrap gap-2">
            {(['all', 'application', 'scholarship'] as const).map(type => (
              <button type="button" data-testid={`button-filter-type-${type}`} key={type} onClick={() => setRecordType(type)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors" style={recordType === type ? { borderColor: '#263f63', backgroundColor: '#263f63', color: '#fff' } : { borderColor: 'var(--apps-border)', color: 'var(--apps-text-secondary)' }}>{type === 'all' ? 'All targets' : type === 'application' ? 'Applications' : 'Scholarships'}</button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row xl:justify-end">
            <div className="relative min-w-0 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input data-testid="input-unified-search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search targets, programs, providers..." className="h-9 border pl-9 text-xs" />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger data-testid="select-unified-country" className="h-9 w-full text-xs sm:w-40"><SelectValue placeholder="All countries" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All countries</SelectItem>{countries.map(country => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={value => setPriorityFilter(value as Priority | 'all')}>
              <SelectTrigger data-testid="select-unified-priority" className="h-9 w-full text-xs sm:w-32"><SelectValue placeholder="All priority" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All priority</SelectItem><SelectItem value="high">High priority</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
            </Select>
            <div className="flex shrink-0 rounded-lg border p-0.5" style={{ borderColor: 'var(--apps-border)' }}>
              <button type="button" data-testid="button-view-timeline" onClick={() => setViewMode('timeline')} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${viewMode === 'timeline' ? 'bg-[#17223b] text-white' : 'text-muted-foreground'}`}><GitBranch className="mr-1 inline h-3.5 w-3.5" />Timeline</button>
              <button type="button" data-testid="button-view-list" onClick={() => setViewMode('list')} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${viewMode === 'list' ? 'bg-[#17223b] text-white' : 'text-muted-foreground'}`}><List className="mr-1 inline h-3.5 w-3.5" />List</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,0.65fr)]">
        <div className="rounded-2xl border bg-[#fbfcfd] p-4 sm:p-5" style={{ borderColor: 'var(--apps-border)' }}>
          <div className="mb-5 flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#087f73]">Unified deadline stream</p><h3 className="mt-1 text-xl font-bold tracking-tight">Your targets, by region</h3></div>
            <span className="text-xs text-muted-foreground">{filteredRecords.length} shown</span>
          </div>
          {appsLoading || scholarshipsLoading ? <div className="space-y-3"><div className="h-28 animate-pulse rounded-2xl bg-muted" /><div className="h-28 animate-pulse rounded-2xl bg-muted" /></div> : sortedCountries.length === 0 ? <div data-testid="unified-empty-state" className="rounded-2xl border border-dashed border-border bg-white p-10 text-center"><Target className="mx-auto h-8 w-8 text-muted-foreground/50" /><p className="mt-3 text-sm font-semibold">No targets match these filters</p><p className="mt-1 text-xs text-muted-foreground">Try clearing a filter or add a new application or scholarship.</p></div> : <div className="space-y-6">{sortedCountries.map(country => renderGroup(country, viewMode === 'timeline'))}</div>}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: 'var(--apps-border)' }}>
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#4654a8]">Coverage</p><h3 className="mt-1 text-base font-bold">How ready are you?</h3></div><span className="font-heading text-2xl font-bold text-[#4654a8]">{requirementsPercent}%</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf0f4]"><div className="h-full rounded-full bg-[#4654a8]" style={{ width: `${requirementsPercent}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{completedRequirementItems} of {totalRequirementItems} documents or requirements completed.</p>
            <div className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: 'var(--apps-border)' }}>
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">High priority targets</span><strong>{highPriorityCount}</strong></div>
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Countries / regions</span><strong>{countries.length}</strong></div>
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Targets with deadlines</span><strong>{upcomingDeadlines.length}</strong></div>
            </div>
          </div>
          <div className="rounded-2xl border bg-[#17223b] p-5 text-white" style={{ borderColor: '#17223b' }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a7e8df]">Keep momentum</p>
            <h3 className="mt-2 text-base font-bold">{latestTest ? `${latestTest.testName} · ${latestTest.totalScore ?? '—'}` : 'Your next best action'}</h3>
            <p className="mt-2 text-xs leading-5 text-white/65">{latestTest ? `Latest score recorded ${fmtDate(latestTest.attemptDate)}. Keep every deadline and document moving together.` : 'Add a test score or start a checklist so your targets become actionable.'}</p>
            <button type="button" data-testid="button-overview-tests" onClick={() => onTabChange('tests')} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#a7e8df] hover:text-white">View test scores <ArrowUpRight className="h-3.5 w-3.5" /></button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function OverviewTab({ onTabChange }: { onTabChange: (t: string) => void }) {
  const { data: apps = [] }   = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const { data: tests = [] }  = useQuery({ queryKey: ['other-tests'],  queryFn: api.getOtherTestScores });
  const { data: schols = [] } = useQuery({ queryKey: ['scholarships'], queryFn: api.getScholarships });
  const { data: noticeBoards = [] } = useQuery({ queryKey: ['notice-boards'], queryFn: api.getNoticeBoards });

  const byStatus = (apps as { status: string }[]).reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const upcoming = [...(apps as { universityName: string; deadline?: string | null; status: string }[])
    .filter(a => a.deadline)]
    .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1))
    .slice(0, 6);

  const admittedCount = byStatus['ready_to_apply'] || 0;
  const appliedCount  = (byStatus['applied'] || 0) + (byStatus['interview'] || 0);

  const urgentApps = (apps as any[]).filter((a: any) => {
    const d = daysUntil(a.deadline as string);
    return d !== null && d >= 0 && d <= 15;
  }).sort((a: any, b: any) => {
    return (daysUntil(a.deadline as string) ?? 99) - (daysUntil(b.deadline as string) ?? 99);
  });

  return (
    <div className="space-y-6">
      {/* Dashboard masthead */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 text-white shadow-lg shadow-indigo-500/10"
        style={{ background: 'linear-gradient(120deg, #17153d 0%, #312e81 48%, #0f766e 100%)' }}>
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-24 -bottom-20 w-48 h-48 rounded-full bg-sky-300/15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-indigo-200 font-semibold mb-2">Fly · Higher Study</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your application command center</h2>
            <p className="text-sm text-indigo-100/75 mt-2 max-w-xl">Keep every university, scholarship, deadline and document in view — then take the next best action.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="secondary" className="bg-white/15 hover:bg-white/25 text-white border-white/20" onClick={() => onTabChange('applications')}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add target
            </Button>
            <Button size="sm" variant="secondary" className="bg-white text-indigo-900 hover:bg-indigo-50" onClick={() => onTabChange('scholarships')}>
              Scholarships <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Two editable notice boards */}
      <div className="grid lg:grid-cols-2 gap-4">
        {(['left', 'right'] as const).map((boardKey, i) => {
          const fallback = boardKey === 'left'
            ? { id: 0, title: 'Upcoming Notices', content: '' }
            : { id: 0, title: 'Focus Tasks', content: '' };
          const board = (noticeBoards as { id: number; boardKey?: string; title: string; content: string }[])
            .find(item => item.boardKey === boardKey) ?? fallback;
          return <NoticeBoardCard key={boardKey} board={board} boardKey={boardKey} />;
        })}
      </div>

      {/* ── Deadline Reminder Banner ── */}
      {urgentApps.length > 0 && (
        <div className="rounded-2xl border border-orange-200 dark:border-orange-800 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fff3cd 100%)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-100 dark:border-orange-900">
            <span className="text-xl">⏰</span>
            <div>
              <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
                {urgentApps.length} application deadline{urgentApps.length > 1 ? 's' : ''} approaching!
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Don't miss these — submit early
              </p>
            </div>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {urgentApps.map((a: any) => {
              const d = daysUntil(a.deadline as string) as number;
              return (
                <div key={a.id} className="flex items-center gap-2 bg-white dark:bg-orange-950 rounded-xl px-3 py-2 border border-orange-100 dark:border-orange-800 shadow-sm">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${d <= 7 ? 'bg-red-500' : 'bg-orange-400'}`} />
                  <div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{String(a.universityName)}</p>
                    <p className="text-[10px] text-muted-foreground">{String(a.country)}</p>
                  </div>
                  <span className={`ml-1 text-xs font-bold shrink-0 ${d <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                    {d === 0 ? 'Today!' : `${d}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Universities',  value: (apps as unknown[]).length,   color: 'text-navy dark:text-indigo',  tab: 'applications', emoji: '🎓' },
          { label: 'Applied',       value: appliedCount,                 color: 'text-blue-600',               tab: 'applications', emoji: '📨' },
          { label: 'Ready to Apply', value: admittedCount,                color: 'text-emerald-600',            tab: 'applications', emoji: '✅' },
          { label: 'Scholarships',  value: (schols as unknown[]).length, color: 'text-yellow-600',             tab: 'scholarships', emoji: '🏆' },
        ].map(({ label, value, color, tab, emoji }) => (
          <Card
            key={label}
            className="cursor-pointer border-0 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 bg-card/90"
            onClick={() => onTabChange(tab)}
          >
            <CardContent className="p-4 text-center">
              <div className={`w-9 h-9 mx-auto mb-2 rounded-xl flex items-center justify-center text-lg ${label === 'Scholarships' ? 'bg-amber-100 dark:bg-amber-900/30' : label === 'Applied' ? 'bg-sky-100 dark:bg-sky-900/30' : label === 'Ready to Apply' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30'}`}>{emoji}</div>
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

      {/* Scholarship tracker snapshot — spreadsheet-inspired, but responsive */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Scholarship tracker</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Your funding opportunities at a glance</p>
          </div>
          <Button size="sm" variant="ghost" className="text-xs text-indigo-600 dark:text-indigo-300" onClick={() => onTabChange('scholarships')}>
            View all <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {(schols as any[]).length === 0 ? (
            <div className="px-5 pb-5 text-sm text-muted-foreground">Add a scholarship to start your tracker.</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr] gap-3 px-5 py-2.5 bg-muted/50 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                  <span>Scholarship</span><span>Country</span><span>Deadline</span><span>Documents</span><span>Status</span>
                </div>
                {(schols as any[]).slice(0, 5).map((s: any, index: number) => {
                  const reqs = parseReqs(s.requirementsJson);
                  const done = reqs.filter(r => r.done).length;
                  const meta = SCH_STATUS_META[s.status as ScholarshipStatus] || SCH_STATUS_META.planning;
                  return (
                    <button key={s.id} onClick={() => onTabChange('scholarships')} className="w-full grid grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr] gap-3 px-5 py-3 text-left border-t border-border/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-colors">
                      <span className="font-medium text-sm truncate">{String(s.name)}</span>
                      <span className="text-xs text-muted-foreground truncate">{String(s.country || '—')}</span>
                      <span className="text-xs text-muted-foreground">{s.deadline ? fmtDate(String(s.deadline)) : 'No deadline'}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><CircleCheckBig className="w-3 h-3 text-emerald-500" /> {reqs.length ? `${done}/${reqs.length}` : '—'}</span>
                      <span className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                .slice().sort((a, b) => new Date(b.attemptDate).getTime() - new Date(a.attemptDate).getTime())
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
  const { data: apps = [], isLoading, isError, refetch } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const { data: customTemplates = [] }  = useQuery({ queryKey: ['templates'],    queryFn: api.getTemplates });

  const [showForm,    setShowForm]    = useState(false);
  const [editId,      setEditId]      = useState<number | null>(null);
  const [expandedId,  setExpandedId]  = useState<number | null>(null);
  const [newItemDraft,  setNewItemDraft]  = useState('');
  const [viewMode,    setViewMode]    = useState<'list' | 'timeline' | 'kanban'>(() => {
    try {
      const saved = sessionStorage.getItem('apps-view-mode');
      return saved === 'list' || saved === 'timeline' || saved === 'kanban' ? saved : 'list';
    } catch { return 'list'; }
  });
  useEffect(() => {
    try { sessionStorage.setItem('apps-view-mode', viewMode); } catch { /* storage unavailable — non-fatal */ }
  }, [viewMode]);
  const [detailApp, setDetailApp] = useState<(Record<string, unknown> & { id: number }) | null>(null);

  const [countryFilter,  setCountryFilter]  = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [statusFilter, setStatusFilter] = useState<AppStatus | null>(null);
  const [readinessFilter, setReadinessFilter] = useState<'started' | 'progress' | 'ready' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueCountries = React.useMemo(() => {
    const cs = [...new Set((apps as any[]).map((a: any) => String(a.country || '')).filter(Boolean))].sort();
    return cs;
  }, [apps]);

  const emptyBase = {
    universityName: '', country: '', program: '', degreeType: 'MS',
    status: 'researching', priority: 'medium', deadline: '', appliedDate: '', notes: '',
    websiteUrl: '', comments: '',
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
      priority:       String(app.priority || 'medium'),
      deadline:       String(app.deadline || ''),
      appliedDate:    String(app.appliedDate || ''),
      notes:          String(app.notes || ''),
      websiteUrl:     String(app.websiteUrl || ''),
      comments:       String(app.comments || ''),
    });
    setRequirements(safeParseReqs(app.requirementsJson as string));
    setEditId(app.id);
    setShowForm(true);
    setExpandedId(null);
  }

  function applyTemplate(items: string[]) {
    setRequirements(items.map(label => ({ label, done: false })));
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
      websiteUrl:  formBase.websiteUrl || null,
      comments:    formBase.comments || null,
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

  function changeApplicationStatus(app: TrackedRow, status: AppStatus) {
    updateMutation.mutate({ id: app.id, data: { status } });
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

  const applicationRows = apps as (Record<string, unknown> & { id: number })[];
  const applicationSummary = React.useMemo(() => {
    const priorityCounts: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
    const statusCounts = Object.keys(APP_STATUS_META).reduce<Record<string, number>>((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {});
    let docsCompleted = 0;
    let docsTotal = 0;
    let upcomingDeadlines = 0;

    applicationRows.forEach(app => {
      const requirements = safeParseReqs(app.requirementsJson as string);
      docsCompleted += requirements.filter(item => item.done).length;
      docsTotal += requirements.length;

      const priority = String(app.priority || 'medium') as Priority;
      priorityCounts[priority in priorityCounts ? priority : 'medium'] += 1;
      const status = String(app.status || 'researching');
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const days = daysUntil(String(app.deadline || ''));
      if (days !== null && days >= 0 && days <= 30) upcomingDeadlines += 1;
    });

    return { docsCompleted, docsTotal, upcomingDeadlines, priorityCounts, statusCounts };
  }, [apps]);

  const docsCompletion = applicationSummary.docsTotal > 0
    ? Math.round((applicationSummary.docsCompleted / applicationSummary.docsTotal) * 100)
    : 0;
  const priorityTotal = applicationRows.length || 1;
  const filteredApplications = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return applicationRows
      .filter(app => {
        if (countryFilter && String(app.country || '') !== countryFilter) return false;
        if (priorityFilter && String(app.priority || 'medium') !== priorityFilter) return false;
        if (statusFilter && String(app.status || 'researching') !== statusFilter) return false;
        if (readinessFilter) {
          const r = computeReadiness(app);
          if (readinessFilter === 'started' && r >= 25) return false;
          if (readinessFilter === 'progress' && (r < 25 || r >= 70)) return false;
          if (readinessFilter === 'ready' && r < 70) return false;
        }
        if (query && ![app.universityName, app.program, app.country, app.degreeType]
          .map(value => String(value || '').toLowerCase()).join(' ').includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        const da = String(a.deadline || '');
        const db = String(b.deadline || '');
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da > db ? 1 : -1;
      });
  }, [applicationRows, countryFilter, priorityFilter, statusFilter, readinessFilter, searchQuery]);

  const hasActiveFilters = Boolean(countryFilter || priorityFilter || statusFilter || readinessFilter || searchQuery.trim());
  function clearAllFilters() {
    setCountryFilter(null);
    setPriorityFilter(null);
    setStatusFilter(null);
    setReadinessFilter(null);
    setSearchQuery('');
  }

  return (
    <>
    <div className="space-y-5 rounded-2xl p-1" style={{ backgroundColor: 'var(--apps-bg-page)' }}>
      {/* Summary stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p data-testid="stat-applications-total" className="text-3xl font-heading font-bold" style={{ color: 'var(--apps-text-primary)' }}>{applicationRows.length}</p>
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--apps-text-secondary)' }}>Total Tracked</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--apps-accent-light)', color: 'var(--apps-accent)' }}>
              <Building2 className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-3xl font-heading font-bold" style={{ color: 'var(--apps-text-primary)' }}>
                <span data-testid="stat-applications-documents">{applicationSummary.docsCompleted}<span className="text-base font-semibold" style={{ color: 'var(--apps-text-muted)' }}>/{applicationSummary.docsTotal}</span></span>
              </p>
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--apps-text-secondary)' }}>Docs Completed</p>
            </div>
            <div className="relative h-11 w-11 shrink-0">
              <svg viewBox="0 0 44 44" className="-rotate-90" role="img" aria-label={`${docsCompletion}% of documents completed`}>
                <circle cx="22" cy="22" r="17" fill="none" stroke="var(--apps-progress-track)" strokeWidth="4" />
                <circle
                  cx="22"
                  cy="22"
                  r="17"
                  fill="none"
                  stroke="var(--apps-accent)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 17}
                  strokeDashoffset={(2 * Math.PI * 17) * (1 - docsCompletion / 100)}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: 'var(--apps-accent)' }}>{docsCompletion}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p data-testid="stat-applications-deadlines" className="text-3xl font-heading font-bold" style={{ color: 'var(--apps-text-primary)' }}>{applicationSummary.upcomingDeadlines}</p>
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--apps-text-secondary)' }}>Upcoming Deadlines</p>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--apps-text-muted)' }}>Due within 30 days</p>
            </div>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                backgroundColor: applicationSummary.upcomingDeadlines > 0 ? 'var(--apps-deadline-urgent-bg)' : 'var(--apps-bg-page)',
                color: applicationSummary.upcomingDeadlines > 0 ? 'var(--apps-deadline-urgent-text)' : 'var(--apps-text-muted)',
              }}
            >
              <CalendarClock className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--apps-text-primary)' }}>By Priority</p>
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--apps-progress-track)' }}>
                {(['high', 'medium', 'low'] as Priority[]).map(priority => (
                  <div
                    key={priority}
                    style={{
                      width: `${(applicationSummary.priorityCounts[priority] / priorityTotal) * 100}%`,
                      backgroundColor: priority === 'high' ? 'var(--apps-priority-high)' : priority === 'medium' ? 'var(--apps-priority-medium)' : 'var(--apps-priority-low)',
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: 'var(--apps-text-muted)' }}>
                {(['high', 'medium', 'low'] as Priority[]).map(priority => (
                  <span key={priority} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority === 'high' ? 'var(--apps-priority-high)' : priority === 'medium' ? 'var(--apps-priority-medium)' : 'var(--apps-priority-low)' }} />
                    {PRIORITY_META[priority].label} {applicationSummary.priorityCounts[priority]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status pulse — a compact, live pipeline summary */}
      <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--apps-text-primary)' }}>Application pulse</p>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--apps-text-muted)' }}>Move a target forward as soon as its next step is clear.</p>
          </div>
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:block" style={{ color: 'var(--apps-text-muted)' }}>Live status</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).map(([status, meta]) => {
            const count = applicationSummary.statusCounts[status] || 0;
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                data-testid={`filter-application-status-${status}`}
                onClick={() => setStatusFilter(active ? null : status)}
                aria-pressed={active}
                className="rounded-lg border px-2.5 py-2 text-left transition-colors hover:border-indigo-300"
                style={{ borderColor: active ? 'var(--apps-accent)' : 'var(--apps-border)', backgroundColor: active ? 'var(--apps-accent-light)' : 'var(--apps-bg-page)' }}
              >
                <span className={`block truncate text-[10px] font-semibold ${meta.color}`}>{meta.label}</span>
                <span className="mt-1 block text-lg font-bold leading-none" style={{ color: 'var(--apps-text-primary)' }}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--apps-text-secondary)' }}>
          {applicationRows.length} {applicationRows.length === 1 ? 'university' : 'universities'} tracked
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--apps-border)' }}>
            <button
              type="button"
              data-testid="button-applications-view-list"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'list' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`}
              style={viewMode === 'list' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              type="button"
              data-testid="button-applications-view-kanban"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'kanban' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`}
              style={viewMode === 'kanban' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}
            >
              <Layers className="w-3.5 h-3.5" /> Pipeline
            </button>
            <button
              type="button"
              data-testid="button-applications-view-timeline"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'timeline' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`}
              style={viewMode === 'timeline' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}
            >
              <GitBranch className="w-3.5 h-3.5" /> Timeline
            </button>
          </div>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="outline"
              data-testid="button-clear-all-application-filters"
              onClick={clearAllFilters}
              className="text-xs"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Clear Filters
            </Button>
          )}
          <Button
            size="sm"
            data-testid="button-add-application"
            onClick={() => { setFormBase(emptyBase); setRequirements([]); setEditId(null); setShowForm(true); }}
            className="text-white hover:brightness-95"
            style={{ backgroundColor: 'var(--apps-accent)' }}
          >
            <Plus className="w-4 h-4 mr-1" /> Add University
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          {uniqueCountries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="filter-application-country-all"
                onClick={() => setCountryFilter(null)}
                className="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors"
                style={!countryFilter
                  ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                  : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
              >
                All
              </button>
              {uniqueCountries.map(c => (
                <button
                  type="button"
                  data-testid={`filter-application-country-${c}`}
                  key={c}
                  onClick={() => setCountryFilter(countryFilter === c ? null : c)}
                  className="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors"
                  style={countryFilter === c
                    ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                    : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:ml-auto">
            <div className="relative min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--apps-text-muted)' }} />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search universities or programs..."
                aria-label="Search universities or programs"
                className="h-9 border pl-9 text-xs"
                style={{ backgroundColor: 'var(--apps-bg-page)', borderColor: 'var(--apps-border)', color: 'var(--apps-text-primary)' }}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium shrink-0" style={{ color: 'var(--apps-text-secondary)' }}>Priority:</span>
              {([null, 'high', 'medium', 'low'] as (Priority | null)[]).map(p => (
                <button
                  type="button"
                  data-testid={`filter-application-priority-${p ?? 'all'}`}
                  key={p ?? 'all'}
                  onClick={() => setPriorityFilter(p)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={priorityFilter === p
                    ? p
                      ? { backgroundColor: PRIORITY_META[p].bg.includes('red') ? 'var(--apps-priority-high-bg)' : PRIORITY_META[p].bg.includes('orange') ? 'var(--apps-priority-medium-bg)' : 'var(--apps-priority-low-bg)', color: p === 'high' ? 'var(--apps-priority-high)' : p === 'medium' ? 'var(--apps-priority-medium)' : 'var(--apps-priority-low)', borderColor: 'transparent' }
                      : { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                    : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
                >
                  {p ? PRIORITY_META[p].label : 'All'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium shrink-0" style={{ color: 'var(--apps-text-secondary)' }}>Readiness:</span>
              {([
                [null, 'All'],
                ['started', 'Just started'],
                ['progress', 'In progress'],
                ['ready', 'Ready'],
              ] as [('started' | 'progress' | 'ready' | null), string][]).map(([key, label]) => (
                <button
                  type="button"
                  data-testid={`filter-application-readiness-${key ?? 'all'}`}
                  key={key ?? 'all'}
                  onClick={() => setReadinessFilter(key)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={readinessFilter === key
                    ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                    : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
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
                  data-testid="input-application-university"
                  placeholder="e.g. University of Copenhagen"
                  value={formBase.universityName}
                  onChange={e => setFormBase(p => ({ ...p, universityName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Country *</Label>
                <Input
                  data-testid="input-application-country"
                  placeholder="e.g. Denmark"
                  list="countries-list"
                  value={formBase.country}
                  onChange={e => setFormBase(p => ({ ...p, country: e.target.value }))}
                />
                <datalist id="countries-list">
                  {COUNTRIES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label>Program *</Label>
                <Input
                  data-testid="input-application-program"
                  placeholder="e.g. Computer Science"
                  value={formBase.program}
                  onChange={e => setFormBase(p => ({ ...p, program: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Degree Type</Label>
                <Select value={formBase.degreeType} onValueChange={v => setFormBase(p => ({ ...p, degreeType: v }))}>
                  <SelectTrigger data-testid="select-application-degree"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger data-testid="select-application-form-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(APP_STATUS_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={formBase.priority} onValueChange={v => setFormBase(p => ({ ...p, priority: v }))}>
                  <SelectTrigger data-testid="select-application-form-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <span className={v.color}>{v.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Application Deadline</Label>
                <Input
                  data-testid="input-application-deadline"
                  type="date"
                  value={formBase.deadline}
                  onChange={e => setFormBase(p => ({ ...p, deadline: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Date Applied</Label>
                <Input
                  data-testid="input-application-applied-date"
                  type="date"
                  value={formBase.appliedDate}
                  onChange={e => setFormBase(p => ({ ...p, appliedDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>University Portal / Application URL</Label>
                <Input
                  data-testid="input-application-portal"
                  type="url"
                  placeholder="https://apply.university.edu"
                  value={formBase.websiteUrl}
                  onChange={e => setFormBase(p => ({ ...p, websiteUrl: e.target.value }))}
                />
              </div>
            </div>

            {/* Dynamic requirements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">📋 Requirements Checklist</Label>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="sm" variant="outline" className="text-xs h-7 gap-1">
                        <Layers className="w-3 h-3" />
                        Use Template
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto">
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        Templates
                      </DropdownMenuLabel>
                      {allTemplates.map(t => (
                        <DropdownMenuItem
                          key={t.id}
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => applyTemplate(t.items)}
                        >
                          <span className="text-sm">{t.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">({t.items.length} items)</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                        type="button"
                        data-testid={`button-remove-application-requirement-${i}`}
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
                data-testid="textarea-application-notes"
                rows={2}
                placeholder="Funding info, contact person, ranking…"
                value={formBase.notes}
                onChange={e => setFormBase(p => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Comments</Label>
              <Textarea
                data-testid="textarea-application-comments"
                rows={2}
                placeholder="Pros/cons, tuition cost, visa notes, personal impressions…"
                value={formBase.comments}
                onChange={e => setFormBase(p => ({ ...p, comments: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                data-testid="button-save-application"
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
                data-testid="button-cancel-application"
                  onClick={() => { setShowForm(false); setEditId(null); }}
              >
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Application list / timeline ── */}
      {isLoading ? (
        <div data-testid="applications-loading" className="space-y-3" aria-label="Loading applications">
          {[1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--apps-border)' }} />)}
        </div>
      ) : isError ? (
        <div data-testid="applications-error" className="rounded-xl border border-dashed p-10 text-center" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}>
          <p className="font-semibold" style={{ color: 'var(--apps-text-primary)' }}>Applications could not load</p>
          <p className="mt-1 text-sm text-muted-foreground">Your saved targets are still safe. Try the connection again.</p>
          <Button type="button" size="sm" variant="outline" className="mt-4" data-testid="button-retry-applications" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : applicationRows.length === 0 ? (
        <div data-testid="applications-empty" className="rounded-xl border border-dashed py-14 text-center" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}>
          <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-semibold" style={{ color: 'var(--apps-text-primary)' }}>No applications yet</p>
          <p className="text-sm mt-1">Add your first target university to start tracking.</p>
          <Button type="button" size="sm" className="mt-4 text-white" data-testid="button-empty-add-application" onClick={() => { setFormBase(emptyBase); setRequirements([]); setEditId(null); setShowForm(true); }} style={{ backgroundColor: 'var(--apps-accent)' }}><Plus className="mr-1 h-4 w-4" /> Add your first target</Button>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div data-testid="applications-filtered-empty" className="rounded-xl border border-dashed py-14 text-center" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}>
          <Search className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="font-semibold" style={{ color: 'var(--apps-text-primary)' }}>No applications match these filters</p>
          <p className="mt-1 text-sm">Clear a filter or search for another university.</p>
          <Button type="button" size="sm" variant="ghost" className="mt-2" data-testid="button-clear-application-filters" onClick={clearAllFilters}>Clear filters</Button>
        </div>
      ) : viewMode === 'kanban' ? (
        <div data-testid="applications-kanban" className="overflow-x-auto pb-2">
          <div className="grid min-w-[1120px] grid-cols-7 gap-3">
            {(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).map(([status, meta]) => {
              const columnApps = filteredApplications.filter(app => String(app.status || 'researching') === status);
              return (
                <section key={status} data-testid={`kanban-column-${status}`} className="min-h-[260px] rounded-xl border p-2.5" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-page)' }}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className={`truncate text-[11px] font-bold uppercase tracking-[0.08em] ${meta.color}`}>{meta.label}</h3>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)' }}>{columnApps.length}</span>
                  </div>
                  <div className="space-y-2">
                    {columnApps.map(app => {
                      const reqs = safeParseReqs(app.requirementsJson as string);
                      const done = reqs.filter(item => item.done).length;
                      const days = daysUntil(String(app.deadline || ''));
                      return (
                        <article key={app.id} data-testid={`kanban-card-application-${app.id}`} className="rounded-lg border p-3 shadow-[0_1px_2px_rgba(20,20,43,0.04)]" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="line-clamp-2 text-xs font-bold leading-4" style={{ color: 'var(--apps-text-primary)' }}>{String(app.universityName)}</h4>
                            <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_META[String(app.priority || 'medium') as Priority]?.dot || PRIORITY_META.medium.dot}`} title={`${String(app.priority || 'medium')} priority`} />
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{String(app.program || 'Programme')} · {countryFlag(String(app.country || ''))} {String(app.country || 'Country')}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                            <span className={days !== null && days >= 0 && days <= 7 ? 'font-bold text-red-600' : 'text-muted-foreground'}>{app.deadline ? (days !== null && days >= 0 ? `${days}d left` : fmtDate(String(app.deadline))) : 'No deadline'}</span>
                            <span className="text-muted-foreground">{reqs.length ? `${done}/${reqs.length} docs` : 'No docs'}</span>
                          </div>
                          <div className="mt-2">
                            <ReadinessBar value={computeReadiness(app)} compact />
                          </div>
                          <Select value={status} onValueChange={value => changeApplicationStatus(app, value as AppStatus)}>
                            <SelectTrigger data-testid={`select-application-status-${app.id}`} className="mt-2 h-7 w-full text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <button type="button" data-testid={`button-view-kanban-application-${app.id}`} onClick={() => setDetailApp(app)} className="truncate text-[10px] font-medium text-indigo-600 hover:underline">{nextApplicationAction(app)}</button>
                            <button type="button" data-testid={`button-edit-kanban-application-${app.id}`} aria-label={`Edit ${String(app.universityName)}`} onClick={() => startEdit(app)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Edit2 className="h-3 w-3" /></button>
                          </div>
                        </article>
                      );
                    })}
                    {columnApps.length === 0 && <p className="px-1 py-6 text-center text-[10px] text-muted-foreground">No targets here</p>}
                  </div>
                </section>
              );
            })}
          </div>
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
              {[...filteredApplications].sort((a, b) => {
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
                const dotColor: Partial<Record<AppStatus, string>> = {
                  researching:    'bg-slate-400',
                  ready_to_apply: 'bg-emerald-500',
                  applied:        'bg-blue-500',
                  interview:      'bg-purple-500',
                  rejected:       'bg-red-400',
                  waitlisted:     'bg-orange-400',
                  deferred:       'bg-yellow-400',
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
                            <p className={`text-xs ${deadlineUrgency(days).className}`}>{deadlineUrgency(days).text}</p>
                          </div>
                        </div>
                        <div className="mt-3 max-w-xs">
                          <ReadinessBar value={computeReadiness(app)} compact />
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button size="sm" variant="outline" className="h-7 text-[11px] px-2.5" onClick={() => setDetailApp(app)}>View Details</Button>
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
          {(() => {
             const sortedApps = filteredApplications;

            if (countryFilter) {
              return sortedApps.map(app => renderAppCard(app));
            }

            const grouped: Record<string, (Record<string, unknown> & { id: number })[]> = {};
            sortedApps.forEach(app => {
              const c = String(app.country || 'Unknown');
              if (!grouped[c]) grouped[c] = [];
              grouped[c].push(app);
            });
            const sortedCountries = Object.keys(grouped).sort();

            return sortedCountries.map(country => (
              <div key={country}>
                <div className="flex items-center gap-2 mb-2 mt-1">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{country}</h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{grouped[country].length}</span>
                </div>
                <div className="space-y-3">
                  {grouped[country].map(app => renderAppCard(app))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
    <ApplicationDetailDrawer
      app={detailApp}
      onClose={() => setDetailApp(null)}
      onEdit={a => { setDetailApp(null); startEdit(a); }}
      onToggleReq={(a, idx) => toggleReqInApp(a, idx)}
      onChangeStatus={(a, status) => changeApplicationStatus(a, status)}
    />
    </>
  );

  function renderAppCard(app: Record<string, unknown> & { id: number }) {
            const meta     = APP_STATUS_META[app.status as AppStatus] || APP_STATUS_META.researching;
            const reqs     = safeParseReqs(app.requirementsJson as string);
            const doneCount = reqs.filter(r => r.done).length;
            const isExpanded = expandedId === app.id;
            const priorityKey = (app.priority || 'medium') as Priority;
            const pMeta = PRIORITY_META[priorityKey] || PRIORITY_META.medium;
            const days = daysUntil(String(app.deadline || ''));
            const urgency = deadlineUrgency(days);
            const readiness = computeReadiness(app);

            return (
              <Card key={app.id} data-testid={`card-application-${app.id}`} className="overflow-hidden transition-shadow hover:shadow-md">
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base leading-none" aria-hidden="true">{countryFlag(String(app.country || ''))}</span>
                        <h3 data-testid={`text-application-university-${app.id}`} className="font-semibold text-navy dark:text-white truncate">
                          {String(app.universityName)}
                        </h3>
                        <span data-testid={`status-application-${app.id}`} className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${pMeta.bg} ${pMeta.color}`}>
                          {pMeta.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {String(app.degreeType)} · {String(app.program)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap">
                        <span className={`flex items-center gap-1 ${urgency.className}`}>
                          <CalendarDays className="w-3 h-3" />
                          {app.deadline ? `${fmtDate(app.deadline as string)} · ${urgency.text}` : urgency.text}
                        </span>
                        {Boolean(app.appliedDate) && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Check className="w-3 h-3 text-green-500" />
                            Applied: {fmtDate(app.appliedDate as string)}
                          </span>
                        )}
                        {reqs.length > 0 && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            {doneCount}/{reqs.length} docs
                          </span>
                        )}
                        {Boolean(app.websiteUrl) && (
                          <a
                            href={String(app.websiteUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-indigo hover:underline transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Portal
                          </a>
                        )}
                      </div>
                      <div className="mt-2 max-w-xs">
                        <ReadinessBar value={readiness} compact />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        data-testid={`button-view-application-${app.id}`}
                        onClick={() => setDetailApp(app)}
                        className="h-7 text-[11px] px-2.5"
                      >
                        View Details
                      </Button>
                      <button
                        type="button"
                        data-testid={`button-expand-application-${app.id}`}
                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${String(app.universityName)}`}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        data-testid={`button-edit-application-${app.id}`}
                        onClick={() => startEdit(app)}
                        aria-label={`Edit ${String(app.universityName)}`}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        data-testid={`button-delete-application-${app.id}`}
                        onClick={() => deleteMutation.mutate(app.id)}
                        aria-label={`Delete ${String(app.universityName)}`}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'var(--apps-border)' }}>
                    <span data-testid={`next-action-application-${app.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                      <ArrowUpRight className="h-3.5 w-3.5" /> Next: {nextApplicationAction(app)}
                    </span>
                    <Select value={String(app.status || 'researching')} onValueChange={value => changeApplicationStatus(app, value as AppStatus)}>
                      <SelectTrigger data-testid={`select-list-application-status-${app.id}`} className="h-7 w-[148px] text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
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

                      {Boolean(app.notes) && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                          <p className="text-sm text-foreground/80 whitespace-pre-line">{String(app.notes)}</p>
                        </div>
                      )}
                      {Boolean(app.websiteUrl) && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">University Portal</p>
                          <a
                            href={String(app.websiteUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {String(app.websiteUrl).replace(/^https?:\/\//, '').slice(0, 60)}{String(app.websiteUrl).length > 65 ? '…' : ''}
                          </a>
                        </div>
                      )}
                      {Boolean(app.comments) && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Comments
                          </p>
                          <p className="text-sm text-foreground/80 whitespace-pre-line">{String(app.comments)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
  }
}

/* ── Application Detail Drawer ───────────────────────────────────────────── */
function ApplicationDetailDrawer({
  app, onClose, onEdit, onToggleReq, onChangeStatus,
}: {
  app: (Record<string, unknown> & { id: number }) | null;
  onClose: () => void;
  onEdit: (app: Record<string, unknown> & { id: number }) => void;
  onToggleReq: (app: Record<string, unknown> & { id: number }, idx: number) => void;
  onChangeStatus: (app: Record<string, unknown> & { id: number }, status: AppStatus) => void;
}) {
  if (!app) return null;
  const meta = APP_STATUS_META[app.status as AppStatus] || APP_STATUS_META.researching;
  const reqs = safeParseReqs(app.requirementsJson as string);
  const doneCount = reqs.filter(r => r.done).length;
  const priorityKey = (app.priority || 'medium') as Priority;
  const pMeta = PRIORITY_META[priorityKey] || PRIORITY_META.medium;
  const days = daysUntil(String(app.deadline || ''));
  const urgency = deadlineUrgency(days);
  const readiness = computeReadiness(app);
  const stageIdx = READINESS_STAGES.indexOf(app.status as AppStatus);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${String(app.universityName)} application details`}>
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} data-testid="application-drawer-scrim" />
      {/* Panel */}
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-background shadow-2xl sm:max-w-lg" data-testid="application-detail-drawer">
        <div className="flex items-start justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--apps-border)' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg leading-none" aria-hidden="true">{countryFlag(String(app.country || ''))}</span>
              <h2 className="truncate text-lg font-heading font-bold">{String(app.universityName)}</h2>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{String(app.degreeType)} · {String(app.program)}</p>
          </div>
          <button type="button" data-testid="button-close-application-drawer" onClick={onClose} aria-label="Close details" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 p-4">
          {/* Basic Information */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Basic Information</h3>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">University</dt><dd className="text-right font-medium">{String(app.universityName)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Country</dt><dd className="text-right font-medium">{countryFlag(String(app.country || ''))} {String(app.country)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Degree</dt><dd className="text-right font-medium">{String(app.degreeType)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Program</dt><dd className="text-right font-medium">{String(app.program)}</dd></div>
              {Boolean(app.websiteUrl) && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Application URL</dt>
                  <dd className="text-right">
                    <a href={String(app.websiteUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-indigo hover:underline">
                      <ExternalLink className="h-3 w-3" /> Portal
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* Application Status */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Application Status</h3>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.bg} ${meta.color}`}>{meta.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${pMeta.bg} ${pMeta.color}`}>{pMeta.label} priority</span>
            </div>
            <Select value={String(app.status || 'researching')} onValueChange={value => onChangeStatus(app, value as AppStatus)}>
              <SelectTrigger data-testid="select-drawer-application-status" className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {stageIdx >= 0 && (
              <div className="mt-3 flex items-center gap-1" aria-hidden="true">
                {READINESS_STAGES.map((s, i) => (
                  <div key={s} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i <= stageIdx ? 'var(--apps-accent)' : 'var(--apps-progress-track)' }} />
                ))}
              </div>
            )}
            <p className="mt-2 text-xs font-semibold text-indigo-600 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5" /> Next: {nextApplicationAction(app)}
            </p>
          </section>

          {/* Deadline */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deadline</h3>
            <p className={`text-sm ${urgency.className}`}>
              {app.deadline ? fmtDate(app.deadline as string) : 'No deadline set'} — {urgency.text}
            </p>
          </section>

          {/* Application Readiness */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Application Readiness</h3>
            <ReadinessBar value={readiness} />
            <p className="mt-1.5 text-[11px] text-muted-foreground">Reflects how prepared this application is — not an admission probability.</p>
          </section>

          {/* Documents */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Documents {reqs.length > 0 && <span className="normal-case font-normal">({doneCount}/{reqs.length})</span>}
            </h3>
            {reqs.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">No requirements added yet. Edit this application to add a checklist.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {reqs.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-testid={`button-drawer-toggle-req-${app.id}-${idx}`}
                    onClick={() => onToggleReq(app, idx)}
                    className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                      r.done
                        ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                        : 'bg-muted border-border text-muted-foreground hover:border-indigo/40'
                    }`}
                  >
                    {r.done ? '✓ ' : ''}{r.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Funding & Notes */}
          {Boolean(app.notes) && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes &amp; Funding</h3>
              <p className="whitespace-pre-line text-sm text-foreground/80">{String(app.notes)}</p>
            </section>
          )}
          {Boolean(app.comments) && (
            <section>
              <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquare className="h-3 w-3" /> Comments
              </h3>
              <p className="whitespace-pre-line text-sm text-foreground/80">{String(app.comments)}</p>
            </section>
          )}
        </div>

        <div className="flex gap-2 border-t p-4" style={{ borderColor: 'var(--apps-border)' }}>
          <Button size="sm" data-testid="button-drawer-edit-application" onClick={() => onEdit(app)} className="flex-1">
            <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit Application
          </Button>
          <Button size="sm" variant="ghost" data-testid="button-drawer-close-application" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
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
  const [editId,   setEditId]   = useState<number | null>(null);
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
      setShowForm(false); setEditId(null);
      setDate(''); setTotal(''); setSections({}); setNotes('');
      toast({ title: '📊 Score recorded!' });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateOtherTestScore(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['other-tests'] });
      setShowForm(false); setEditId(null);
      setDate(''); setTotal(''); setSections({}); setNotes('');
      toast({ title: '📊 Score updated!' });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.deleteOtherTestScore,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['other-tests'] }); toast({ title: 'Score removed' }); },
  });

  function startEdit(s: { id: number; testName: string; totalScore?: number | null; attemptDate: string; sectionsJson?: string | null; notes?: string | null }) {
    let sectionData: Record<string, string> = {};
    try { if (s.sectionsJson) sectionData = JSON.parse(s.sectionsJson); } catch { /* ignore */ }
    const tName = TEST_SECTIONS[s.testName] ? s.testName : 'Other';
    setTestName(tName);
    setCustomTest(tName === 'Other' ? s.testName : '');
    setDate(s.attemptDate);
    setTotal(s.totalScore != null ? String(s.totalScore) : '');
    setSections(sectionData);
    setNotes(s.notes || '');
    setEditId(s.id);
    setShowForm(true);
  }

  function saveScore() {
    const name = testName === 'Other' ? customTest.trim() : testName;
    if (!name || !date) return;
    const payload = {
      testName: name,
      attemptDate: date,
      totalScore: total ? Number(total) : null,
      sectionsJson: JSON.stringify(sections),
      notes: notes || null,
    };
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else addMutation.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {(scores as unknown[]).length} test score{(scores as unknown[]).length !== 1 ? 's' : ''} recorded
        </p>
        <Button
          size="sm"
          onClick={() => { setEditId(null); setDate(''); setTotal(''); setSections({}); setNotes(''); setShowForm(p => !p); }}
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
              {editId ? 'Edit Test Score' : 'Record Test Score'}
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
            attemptDate: string; sectionsJson?: string | null; notes?: string | null;
          }[]).map(s => {
            let sectionData: Record<string, string> = {};
            try { if (s.sectionsJson) sectionData = JSON.parse(s.sectionsJson); } catch { /* ignore */ }

            return (
              <Card key={s.id} className="relative group overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-lg text-navy dark:text-teal">{s.totalScore ?? '–'}</p>
                      <p className="text-sm font-semibold">{s.testName}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(s.attemptDate)}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => startEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(s.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {(() => {
                    const definedSections = TEST_SECTIONS[s.testName];
                    const entries: [string, string][] = definedSections
                      ? definedSections.map(k => [k, sectionData[k] || ''])
                      : Object.entries(sectionData).filter(([, v]) => v);
                    if (entries.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {entries.map(([k, v]) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {k}: <strong>{v || '–'}</strong>
                          </span>
                        ))}
                      </div>
                    );
                  })()}
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
function parseReqs(json: unknown): ReqItem[] {
  if (!json || typeof json !== 'string') return [];
  try { const p = JSON.parse(json); return Array.isArray(p) ? p : []; } catch { return []; }
}

function ScholarshipsTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: scholarships = [], isLoading, isError, refetch } = useQuery({ queryKey: ['scholarships'], queryFn: api.getScholarships });
  const { data: applications = [] } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });

  const { data: customTemplates = [] } = useQuery({ queryKey: ['templates'], queryFn: api.getTemplates });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedSchId, setExpandedSchId] = useState<number | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesEditDraft, setNotesEditDraft] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [statusFilter, setStatusFilter] = useState<ScholarshipStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
  // inline checklist new-item input per card
  const [newReqText, setNewReqText] = useState<Record<number, string>>({});

  const emptyForm = {
    name: '', provider: '', country: '', fundingType: 'Full Scholarship',
    amount: '', currency: 'USD', deadline: '', status: 'planning', priority: 'medium', linkedApplicationId: '', notes: '',
    dateApplied: '', portalUrl: '', requirements: [] as ReqItem[],
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
      priority:     String(s.priority || 'medium'),
      linkedApplicationId: s.linkedApplicationId ? String(s.linkedApplicationId) : '',
      notes:        String(s.notes || ''),
      dateApplied:  String(s.dateApplied || ''),
      portalUrl:    String(s.portalUrl || ''),
      requirements: parseReqs(s.requirementsJson),
    });
    setEditId(s.id);
    setShowForm(true);
  }

  function saveForm() {
    const { requirements, ...rest } = form;
    const payload = {
      ...rest,
      deadline:         form.deadline || null,
      dateApplied:      form.dateApplied || null,
      portalUrl:        form.portalUrl || null,
      amount:           form.amount ? Number(form.amount) : null,
      linkedApplicationId: form.linkedApplicationId ? Number(form.linkedApplicationId) : null,
      requirementsJson: requirements.length ? JSON.stringify(requirements) : null,
    };
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else addMutation.mutate(payload);
  }

  // Toggle a checklist item directly on a card (inline, immediate save)
  function toggleReq(s: Record<string, unknown> & { id: number }, idx: number) {
    const reqs = parseReqs(s.requirementsJson);
    reqs[idx] = { ...reqs[idx], done: !reqs[idx].done };
    updateMutation.mutate({ id: s.id, data: { requirementsJson: JSON.stringify(reqs) } });
  }

  // Add a new checklist item to a card inline
  function addReqInline(s: Record<string, unknown> & { id: number }) {
    const text = (newReqText[s.id] || '').trim();
    if (!text) return;
    const reqs = [...parseReqs(s.requirementsJson), { label: text, done: false }];
    updateMutation.mutate({ id: s.id, data: { requirementsJson: JSON.stringify(reqs) } });
    setNewReqText(p => ({ ...p, [s.id]: '' }));
  }

  // Remove a checklist item inline
  function removeReq(s: Record<string, unknown> & { id: number }, idx: number) {
    const reqs = parseReqs(s.requirementsJson).filter((_, i) => i !== idx);
    updateMutation.mutate({ id: s.id, data: { requirementsJson: reqs.length ? JSON.stringify(reqs) : null } });
  }

  function changeScholarshipStatus(s: TrackedRow, status: ScholarshipStatus) {
    updateMutation.mutate({ id: s.id, data: { status } });
  }

  const scholarshipRows = scholarships as (Record<string, unknown> & { id: number })[];
  const uniqueCountries = React.useMemo(() => (
    [...new Set(scholarshipRows.map(s => String(s.country || '').trim()).filter(Boolean))].sort()
  ), [scholarships]);
  const scholarshipSummary = React.useMemo(() => {
    const priorityCounts: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
    const statusCounts: Record<ScholarshipStatus, number> = {
      planning: 0, ready_to_apply: 0, applied: 0, awarded: 0, rejected: 0,
    };
    let docsCompleted = 0;
    let docsTotal = 0;
    let upcomingDeadlines = 0;

    scholarshipRows.forEach(s => {
      const requirements = parseReqs(s.requirementsJson);
      docsCompleted += requirements.filter(item => item.done).length;
      docsTotal += requirements.length;

      const priority = String(s.priority || 'medium') as Priority;
      priorityCounts[priority in priorityCounts ? priority : 'medium'] += 1;

      const status = String(s.status || 'planning');
      if (status in statusCounts) statusCounts[status as ScholarshipStatus] += 1;

      const days = daysUntil(String(s.deadline || ''));
      if (days !== null && days >= 0 && days <= 30) upcomingDeadlines += 1;
    });

    return { docsCompleted, docsTotal, upcomingDeadlines, priorityCounts, statusCounts };
  }, [scholarships]);
  const docsCompletion = scholarshipSummary.docsTotal > 0
    ? Math.round((scholarshipSummary.docsCompleted / scholarshipSummary.docsTotal) * 100)
    : 0;
  const priorityTotal = scholarshipRows.length || 1;
  const filteredScholarships = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scholarshipRows
      .filter(s => {
        if (countryFilter && String(s.country || '') !== countryFilter) return false;
        if (priorityFilter && String(s.priority || 'medium') !== priorityFilter) return false;
        if (statusFilter && String(s.status || 'planning') !== statusFilter) return false;
        if (query) {
          const searchable = [s.name, s.provider, s.country, s.fundingType]
            .map(value => String(value || '').toLowerCase()).join(' ');
          if (!searchable.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = String(a.deadline || '');
        const db = String(b.deadline || '');
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da > db ? 1 : -1;
      });
  }, [scholarships, countryFilter, priorityFilter, statusFilter, searchQuery]);
  const groupedScholarships = React.useMemo(() => {
    const grouped: Record<string, typeof scholarshipRows> = {};
    filteredScholarships.forEach(s => {
      const country = String(s.country || 'Other');
      if (!grouped[country]) grouped[country] = [];
      grouped[country].push(s);
    });
    return grouped;
  }, [filteredScholarships]);
  const sortedCountries = Object.keys(groupedScholarships).sort();

  return (
    <div className="space-y-5 rounded-2xl p-1" style={{ backgroundColor: 'var(--apps-bg-page)' }}>
      {/* Summary stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p data-testid="stat-scholarships-total" className="text-3xl font-heading font-bold" style={{ color: 'var(--apps-text-primary)' }}>{scholarshipRows.length}</p>
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--apps-text-secondary)' }}>Total Scholarships Tracked</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <Trophy className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-3xl font-heading font-bold" style={{ color: 'var(--apps-text-primary)' }}>
                <span data-testid="stat-scholarships-documents">{scholarshipSummary.docsCompleted}<span className="text-base font-semibold" style={{ color: 'var(--apps-text-muted)' }}>/{scholarshipSummary.docsTotal}</span></span>
              </p>
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--apps-text-secondary)' }}>Requirements/Docs Completed</p>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--apps-text-muted)' }}>{docsCompletion}% complete</p>
            </div>
            <div className="relative h-11 w-11 shrink-0">
              <svg viewBox="0 0 44 44" className="-rotate-90" role="img" aria-label={`${docsCompletion}% of scholarship requirements completed`}>
                <circle cx="22" cy="22" r="17" fill="none" stroke="var(--apps-progress-track)" strokeWidth="4" />
                <circle cx="22" cy="22" r="17" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 17} strokeDashoffset={(2 * Math.PI * 17) * (1 - docsCompletion / 100)} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-600">{docsCompletion}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p data-testid="stat-scholarships-deadlines" className="text-3xl font-heading font-bold" style={{ color: 'var(--apps-text-primary)' }}>{scholarshipSummary.upcomingDeadlines}</p>
              <p className="mt-1 text-xs font-medium" style={{ color: 'var(--apps-text-secondary)' }}>Upcoming Deadlines</p>
              <p className="mt-1 text-[10px]" style={{ color: 'var(--apps-text-muted)' }}>Due within 30 days</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: scholarshipSummary.upcomingDeadlines > 0 ? 'var(--apps-deadline-urgent-bg)' : 'var(--apps-bg-page)', color: scholarshipSummary.upcomingDeadlines > 0 ? 'var(--apps-deadline-urgent-text)' : 'var(--apps-text-muted)' }}>
              <CalendarClock className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--apps-text-primary)' }}>By Status</p>
            <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--apps-progress-track)' }}>
              {(Object.keys(SCH_STATUS_META) as ScholarshipStatus[]).map(status => (
                <div key={status} style={{ width: `${(scholarshipSummary.statusCounts[status] / priorityTotal) * 100}%`, backgroundColor: status === 'planning' ? '#94a3b8' : status === 'ready_to_apply' ? '#f59e0b' : status === 'applied' ? '#3b82f6' : status === 'awarded' ? '#10b981' : '#ef4444' }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]" style={{ color: 'var(--apps-text-muted)' }}>
              {(Object.entries(SCH_STATUS_META) as [ScholarshipStatus, typeof SCH_STATUS_META[ScholarshipStatus]][]).map(([status, meta]) => (
                <button key={status} type="button" data-testid={`filter-scholarship-status-${status}`} onClick={() => setStatusFilter(statusFilter === status ? null : status)} aria-pressed={statusFilter === status} className={`flex items-center gap-1 rounded px-1 py-0.5 transition-colors ${statusFilter === status ? 'bg-muted font-bold' : ''}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status === 'planning' ? '#94a3b8' : status === 'ready_to_apply' ? '#f59e0b' : status === 'applied' ? '#3b82f6' : status === 'awarded' ? '#10b981' : '#ef4444' }} />{meta.label} {scholarshipSummary.statusCounts[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filteredScholarships.length} of {scholarshipRows.length} scholarship{scholarshipRows.length !== 1 ? 's' : ''} tracked
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--apps-border)' }}>
            <button type="button" data-testid="button-scholarships-view-list" onClick={() => setViewMode('list')} className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'list' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`} style={viewMode === 'list' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}>
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button type="button" data-testid="button-scholarships-view-timeline" onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'timeline' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`} style={viewMode === 'timeline' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}>
              <GitBranch className="w-3.5 h-3.5" /> Timeline
            </button>
          </div>
          <Button size="sm" data-testid="button-add-scholarship" onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="text-white hover:brightness-95" style={{ backgroundColor: 'var(--apps-accent)' }}>
            <Plus className="w-4 h-4 mr-1" /> Add Scholarship
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" data-testid="filter-scholarship-country-all" onClick={() => setCountryFilter(null)} className="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors" style={!countryFilter ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' } : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}>All</button>
            {uniqueCountries.map(country => (
              <button type="button" key={country} data-testid={`filter-scholarship-country-${country}`} onClick={() => setCountryFilter(countryFilter === country ? null : country)} className="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors" style={countryFilter === country ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' } : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}>{country}</button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:ml-auto">
            <div className="relative min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--apps-text-muted)' }} />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search scholarships or providers..." aria-label="Search scholarships or providers" className="h-9 border pl-9 text-xs" style={{ backgroundColor: 'var(--apps-bg-page)', borderColor: 'var(--apps-border)', color: 'var(--apps-text-primary)' }} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium shrink-0" style={{ color: 'var(--apps-text-secondary)' }}>Priority:</span>
              {([null, 'high', 'medium', 'low'] as (Priority | null)[]).map(priority => (
               <button type="button" key={priority ?? 'all'} data-testid={`filter-scholarship-priority-${priority ?? 'all'}`} onClick={() => setPriorityFilter(priority)} className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors" style={priorityFilter === priority ? priority ? { backgroundColor: priority === 'high' ? '#fee2e2' : priority === 'medium' ? '#ffedd5' : '#f1f5f9', color: priority === 'high' ? '#dc2626' : priority === 'medium' ? '#ea580c' : '#64748b', borderColor: 'transparent' } : { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' } : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}>{priority ? PRIORITY_META[priority].label : 'All'}</button>
              ))}
            </div>
          </div>
        </div>
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
                 <Input data-testid="input-scholarship-name" placeholder="e.g. Erasmus+ Scholarship" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Provider / Organisation</Label>
                 <Input data-testid="input-scholarship-provider" placeholder="e.g. European Commission" value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Country</Label>
                 <Input data-testid="input-scholarship-country" placeholder="e.g. Finland" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Link to University Application</Label>
                <Select value={form.linkedApplicationId || 'none'} onValueChange={v => setForm(p => ({ ...p, linkedApplicationId: v === 'none' ? '' : v }))}>
                   <SelectTrigger data-testid="select-scholarship-linked-application"><SelectValue placeholder="No linked application" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked application</SelectItem>
                    {(applications as { id: number; universityName: string; program?: string | null }[]).map(application => (
                      <SelectItem key={application.id} value={String(application.id)}>
                        {application.universityName}{application.program ? ` · ${application.program}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Funding Type</Label>
                <Select value={form.fundingType} onValueChange={v => setForm(p => ({ ...p, fundingType: v }))}>
                   <SelectTrigger data-testid="select-scholarship-funding-type"><SelectValue /></SelectTrigger>
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
                   <Input data-testid="input-scholarship-amount" type="number" placeholder="0" className="flex-1" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                  <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
                     <SelectTrigger data-testid="select-scholarship-currency" className="w-24"><SelectValue /></SelectTrigger>
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
                   <SelectTrigger data-testid="select-scholarship-form-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCH_STATUS_META).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                 <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                   <SelectTrigger data-testid="select-scholarship-form-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['high', 'medium', 'low'] as Priority[]).map(priority => (
                      <SelectItem key={priority} value={priority}>{PRIORITY_META[priority].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Application Deadline</Label>
               <Input data-testid="input-scholarship-deadline" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Date Applied</Label>
               <Input data-testid="input-scholarship-applied-date" type="date" value={form.dateApplied} onChange={e => setForm(p => ({ ...p, dateApplied: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>University Portal / Application URL</Label>
                 <Input
                   data-testid="input-scholarship-portal"
                  type="url"
                  placeholder="https://apply.university.edu/scholarships/…"
                  value={form.portalUrl}
                  onChange={e => setForm(p => ({ ...p, portalUrl: e.target.value }))}
                />
              </div>
            </div>

            {/* Requirements Checklist builder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Requirements Checklist
                </Label>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Layers className="w-3 h-3" /> Use Template <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto">
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">Default Templates</DropdownMenuLabel>
                      {DEFAULT_TEMPLATES.map(tmpl => (
                        <DropdownMenuItem
                          key={tmpl.id}
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setForm(p => ({ ...p, requirements: tmpl.items.map(label => ({ label, done: false })) }))}
                        >
                          <span className="text-sm">{tmpl.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0 ml-2">({tmpl.items.length} items)</span>
                        </DropdownMenuItem>
                      ))}
                      {(customTemplates as { id: number; name: string; items: string }[]).length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider">My Templates</DropdownMenuLabel>
                          {(customTemplates as { id: number; name: string; items: string }[]).map(tmpl => {
                            const items: string[] = (() => { try { return JSON.parse(tmpl.items) as string[]; } catch { return []; } })();
                            return (
                              <DropdownMenuItem
                                key={tmpl.id}
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setForm(p => ({ ...p, requirements: items.map(label => ({ label, done: false })) }))}
                              >
                                <span className="text-sm">{tmpl.name}</span>
                                <span className="text-xs text-muted-foreground shrink-0 ml-2">({items.length} items)</span>
                              </DropdownMenuItem>
                            );
                          })}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setForm(p => ({ ...p, requirements: [...p.requirements, { label: '', done: false }] }))}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
              </div>
              {form.requirements.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2 px-1">
                  No items yet — use a template or add items manually.
                </p>
              ) : (
                <div className="space-y-1.5 mt-1">
                  {form.requirements.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForm(p => {
                          const reqs = [...p.requirements];
                          reqs[i] = { ...reqs[i], done: !reqs[i].done };
                          return { ...p, requirements: reqs };
                        })}
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${r.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border bg-background hover:border-emerald-400'}`}
                      >
                        {r.done && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <Input
                        className="h-7 text-xs flex-1"
                        value={r.label}
                        placeholder={`Requirement ${i + 1}…`}
                        onChange={e => setForm(p => {
                          const reqs = [...p.requirements];
                          reqs[i] = { ...reqs[i], label: e.target.value };
                          return { ...p, requirements: reqs };
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, requirements: p.requirements.filter((_, j) => j !== i) }))}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
               <Textarea data-testid="textarea-scholarship-notes" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Eligibility criteria, contacts, reminders…" />
            </div>
            <div className="flex gap-2">
               <Button size="sm" data-testid="button-save-scholarship" disabled={!form.name} onClick={saveForm} className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white">
                <Check className="w-4 h-4 mr-1" /> {editId ? 'Update' : 'Save'}
              </Button>
               <Button size="sm" variant="ghost" data-testid="button-cancel-scholarship" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div data-testid="scholarships-loading" className="space-y-3" aria-label="Loading scholarships">
          {[1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--apps-border)' }} />)}
        </div>
      ) : isError ? (
        <div data-testid="scholarships-error" className="rounded-xl border border-dashed p-10 text-center" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}>
          <p className="font-semibold" style={{ color: 'var(--apps-text-primary)' }}>Scholarships could not load</p>
          <p className="mt-1 text-sm text-muted-foreground">Your saved funding opportunities are still safe. Try again.</p>
          <Button type="button" size="sm" variant="outline" className="mt-4" data-testid="button-retry-scholarships" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : (scholarships as unknown[]).length === 0 ? (
        <div data-testid="scholarships-empty" className="rounded-xl border border-dashed py-14 text-center" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}>
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-semibold" style={{ color: 'var(--apps-text-primary)' }}>No scholarships yet</p>
          <p className="text-sm mt-1">Track Erasmus+, Nordic grants and other funding opportunities.</p>
          <Button type="button" size="sm" className="mt-4 text-white" data-testid="button-empty-add-scholarship" onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} style={{ backgroundColor: 'var(--apps-accent)' }}><Plus className="mr-1 h-4 w-4" /> Add a funding opportunity</Button>
        </div>
      ) : filteredScholarships.length === 0 ? (
        <div data-testid="scholarships-filtered-empty" className="rounded-xl border border-dashed py-14 text-center" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}>
          <Search className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="font-semibold">No scholarships match these filters</p>
          <p className="text-sm mt-1">Try another country, priority, or search term.</p>
          <Button type="button" size="sm" variant="ghost" className="mt-2" data-testid="button-clear-scholarship-filters" onClick={() => { setCountryFilter(null); setPriorityFilter(null); setStatusFilter(null); setSearchQuery(''); }}>Clear filters</Button>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="relative space-y-4 pl-8">
          <div className="absolute left-3 top-1 bottom-1 w-0.5 bg-border" />
          {filteredScholarships.map(s => {
                const meta = SCH_STATUS_META[s.status as ScholarshipStatus] || SCH_STATUS_META.planning;
            const priorityKey = String(s.priority || 'medium') as Priority;
            const pMeta = PRIORITY_META[priorityKey] || PRIORITY_META.medium;
            const reqs = parseReqs(s.requirementsJson);
            const doneCount = reqs.filter(r => r.done).length;
                const linkedApplication = (applications as { id: number; universityName?: string; program?: string }[]).find(application => application.id === Number(s.linkedApplicationId));
            return (
              <div key={s.id} className="relative">
                <span className="absolute -left-[1.45rem] top-4 h-3 w-3 rounded-full border-2 border-background bg-amber-400 shadow" />
                <Card data-testid={`card-scholarship-${s.id}`} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 data-testid={`text-scholarship-name-${s.id}`} className="font-semibold text-sm truncate">{String(s.name)}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${pMeta.bg} ${pMeta.color}`}>{pMeta.label}</span>
                          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                        </div>
                         {Boolean(s.provider) && <p className="text-xs text-muted-foreground mt-0.5">{String(s.provider)}</p>}
                         {linkedApplication && <p data-testid={`linked-application-scholarship-${s.id}`} className="mt-1 text-[11px] font-medium text-indigo-600">For {linkedApplication.universityName}{linkedApplication.program ? ` · ${linkedApplication.program}` : ''}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                         <button type="button" data-testid={`button-edit-scholarship-${s.id}`} aria-label={`Edit ${String(s.name)}`} title="Edit scholarship" onClick={() => startEdit(s)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                         <button type="button" data-testid={`button-delete-scholarship-${s.id}`} aria-label={`Delete ${String(s.name)}`} title="Delete scholarship" onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{String(s.fundingType)}</span>
                      {Boolean(s.country) && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">🌍 {String(s.country)}</span>}
                      {Boolean(s.amount) && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 font-semibold">{Number(s.amount).toLocaleString()} {String(s.currency)}</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span data-testid={`next-action-scholarship-${s.id}`} className="text-xs font-semibold text-indigo-600">{nextScholarshipAction(s)}</span>
                      <Select value={String(s.status || 'planning')} onValueChange={value => changeScholarshipStatus(s, value as ScholarshipStatus)}>
                        <SelectTrigger data-testid={`select-scholarship-status-${s.id}`} className="h-7 w-[132px] text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.entries(SCH_STATUS_META) as [ScholarshipStatus, typeof SCH_STATUS_META[ScholarshipStatus]][]).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Requirements</span>
                        <span className={`font-semibold ${doneCount === reqs.length && reqs.length > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{doneCount}/{reqs.length} reqs done</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${reqs.length ? (doneCount / reqs.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="mt-3"><DeadlineCue deadline={s.deadline} /></div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {sortedCountries.map(country => (
            <section key={country}>
              <button
                type="button"
                onClick={() => setExpandedCountries(previous => ({ ...previous, [country]: previous[country] === false }))}
                className="flex w-full items-center gap-2 mb-2 mt-1 text-left"
                aria-expanded={expandedCountries[country] !== false}
              >
                {expandedCountries[country] === false ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{country}</h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{groupedScholarships[country].length}</span>
              </button>
              {expandedCountries[country] !== false && (
                <div className="space-y-3">
          {groupedScholarships[country].map(s => {
            const meta = SCH_STATUS_META[s.status as ScholarshipStatus] || SCH_STATUS_META.planning;
            const priorityKey = String(s.priority || 'medium') as Priority;
            const pMeta = PRIORITY_META[priorityKey] || PRIORITY_META.medium;
            const isExpanded = expandedSchId === s.id;
            const reqs = parseReqs(s.requirementsJson);
            const doneCount = reqs.filter(r => r.done).length;
            const linkedApplication = (applications as { id: number; universityName?: string; program?: string }[]).find(application => application.id === Number(s.linkedApplicationId));
            return (
              <Card key={s.id} data-testid={`card-scholarship-${s.id}`} className="group overflow-hidden hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => setExpandedSchId(isExpanded ? null : s.id)}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 data-testid={`text-scholarship-name-${s.id}`} className="font-semibold text-sm truncate">{String(s.name)}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${pMeta.bg} ${pMeta.color}`}>{pMeta.label}</span>
                        <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                      </div>
                      {Boolean(s.provider) && <p className="text-xs text-muted-foreground">{String(s.provider)}</p>}
                      {linkedApplication && <p data-testid={`linked-application-scholarship-${s.id}`} className="mt-1 text-[11px] font-medium text-indigo-600">For {linkedApplication.universityName}{linkedApplication.program ? ` · ${linkedApplication.program}` : ''}</p>}
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        data-testid={`button-expand-scholarship-${s.id}`}
                        onClick={() => setExpandedSchId(isExpanded ? null : s.id)}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${String(s.name)}`}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                       <button type="button" data-testid={`button-edit-scholarship-${s.id}`} aria-label={`Edit ${String(s.name)}`} title="Edit scholarship" onClick={() => startEdit(s)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                       <button type="button" data-testid={`button-delete-scholarship-${s.id}`} aria-label={`Delete ${String(s.name)}`} title="Delete scholarship" onClick={() => deleteMutation.mutate(s.id)} className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{String(s.fundingType)}</span>
                    {Boolean(s.country) && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">🌍 {String(s.country)}</span>}
                    {Boolean(s.amount) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 font-semibold">
                        {Number(s.amount).toLocaleString()} {String(s.currency)}
                      </span>
                    )}
                  </div>

                   <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'var(--apps-border)' }}>
                     <span data-testid={`next-action-scholarship-${s.id}`} className="truncate text-xs font-semibold text-indigo-600">{nextScholarshipAction(s)}</span>
                     <Select value={String(s.status || 'planning')} onValueChange={value => changeScholarshipStatus(s, value as ScholarshipStatus)}>
                       <SelectTrigger data-testid={`select-list-scholarship-status-${s.id}`} className="h-7 w-[132px] text-[11px]"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         {(Object.entries(SCH_STATUS_META) as [ScholarshipStatus, typeof SCH_STATUS_META[ScholarshipStatus]][]).map(([key, value]) => <SelectItem key={key} value={key}>{value.label}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>

                  <div className="mt-3 space-y-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Requirements</span>
                        <span className={`font-semibold ${doneCount === reqs.length && reqs.length > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>{doneCount}/{reqs.length} reqs done</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${reqs.length ? (doneCount / reqs.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                     <div data-testid={`deadline-scholarship-${s.id}`}><DeadlineCue deadline={s.deadline} /></div>
                    {Boolean(s.dateApplied) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        Applied: {fmtDate(s.dateApplied as string)}
                      </p>
                    )}
                  </div>

                   {!isExpanded && Boolean(s.notes) && (
                    <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">{String(s.notes)}</p>
                  )}

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-5">
                      {/* Key info grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        {Boolean(s.fundingType) && (
                          <div><span className="text-muted-foreground">Type</span><p className="font-medium">{String(s.fundingType)}</p></div>
                        )}
                        {Boolean(s.country) && (
                          <div><span className="text-muted-foreground">Country</span><p className="font-medium">🌍 {String(s.country)}</p></div>
                        )}
                        {Boolean(s.amount) && (
                          <div><span className="text-muted-foreground">Amount</span><p className="font-medium text-yellow-700 dark:text-yellow-400">{Number(s.amount).toLocaleString()} {String(s.currency)}</p></div>
                        )}
                        {Boolean(s.status) && (
                          <div><span className="text-muted-foreground">Status</span><p className={`font-medium ${meta.color}`}>{meta.label}</p></div>
                        )}
                        {Boolean(s.deadline) && (
                          <div><span className="text-muted-foreground">Deadline</span><p className="font-medium">{fmtDate(String(s.deadline))}</p></div>
                        )}
                        {Boolean(s.dateApplied) && (
                          <div><span className="text-muted-foreground">Date Applied</span><p className="font-medium text-emerald-600 dark:text-emerald-400">{fmtDate(String(s.dateApplied))}</p></div>
                        )}
                      </div>

                      {/* Portal URL */}
                      {Boolean(s.portalUrl) && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Application Portal
                          </p>
                          <a
                            href={String(s.portalUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-indigo dark:text-indigo-300 hover:underline bg-indigo/5 px-2.5 py-1.5 rounded-lg border border-indigo/20 max-w-full"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{String(s.portalUrl)}</span>
                          </a>
                        </div>
                      )}

                      {/* Requirements Checklist */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" /> Requirements Checklist
                          {reqs.length > 0 && (
                            <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground">
                              {doneCount}/{reqs.length} done
                            </span>
                          )}
                        </p>
                        {reqs.length > 0 && (
                          <div className="space-y-1.5 mb-2">
                            {reqs.map((r, i) => (
                              <div key={i} className="flex items-center gap-2 group/req">
                                <button
                                  onClick={() => toggleReq(s, i)}
                                  className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${r.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border bg-background hover:border-emerald-400'}`}
                                >
                                  {r.done && <Check className="w-2.5 h-2.5" />}
                                </button>
                                <span className={`text-sm flex-1 ${r.done ? 'line-through text-muted-foreground' : ''}`}>{r.label}</span>
                                <button
                                  onClick={() => removeReq(s, i)}
                                  className="opacity-0 group-hover/req:opacity-100 p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Add new requirement inline */}
                        <div className="flex gap-2">
                          <Input
                            className="h-7 text-xs flex-1"
                            placeholder="Add a requirement…"
                            value={newReqText[s.id] || ''}
                            onChange={e => setNewReqText(p => ({ ...p, [s.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReqInline(s); } }}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => addReqInline(s)}
                            disabled={!(newReqText[s.id] || '').trim()}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Inline Notes */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Notes
                        </p>
                        {editingNotesId === s.id ? (
                          <div className="space-y-2">
                            <Textarea
                              rows={4}
                              value={notesEditDraft}
                              onChange={e => setNotesEditDraft(e.target.value)}
                              placeholder="Eligibility details, contacts, reminders…"
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-navy hover:bg-navy/90 dark:bg-indigo text-white"
                                onClick={() => {
                                  updateMutation.mutate({ id: s.id, data: { notes: notesEditDraft || null } });
                                  setEditingNotesId(null);
                                }}
                              >
                                <Check className="w-3 h-3 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotesId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="min-h-[60px] p-2.5 rounded-lg border border-dashed border-border bg-muted/30 cursor-pointer hover:border-indigo/40 hover:bg-muted/50 transition-colors"
                            onClick={() => { setEditingNotesId(s.id); setNotesEditDraft(String(s.notes || '')); }}
                          >
                            {s.notes
                              ? <p className="text-sm text-foreground/75 whitespace-pre-wrap">{String(s.notes)}</p>
                              : <p className="text-xs text-muted-foreground italic">Click to add notes, eligibility details, contacts…</p>
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
                </div>
              )}
            </section>
          ))}
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

  const [showForm,      setShowForm]      = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null);
  const [formName,    setFormName]    = useState('');
  const [formDegree,  setFormDegree]  = useState('');
  const [formItems,   setFormItems]   = useState<string[]>(['']);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setShowForm(false); setEditTemplateId(null); setFormName(''); setFormDegree(''); setFormItems(['']);
      toast({ title: '📋 Template saved!' });
    },
  });
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      setShowForm(false); setEditTemplateId(null); setFormName(''); setFormDegree(''); setFormItems(['']);
      toast({ title: '📋 Template updated!' });
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
    const payload = { name: formName, degreeType: formDegree || null, items: JSON.stringify(items) };
    if (editTemplateId) updateTemplateMutation.mutate({ id: editTemplateId, data: payload });
    else addMutation.mutate(payload);
  }
  function copyDefaultTemplate(tmpl: { id: string; name: string; degreeType: string; items: string[] }) {
    setEditTemplateId(null);
    setFormName(tmpl.name + ' (Copy)');
    setFormDegree(tmpl.degreeType);
    setFormItems(tmpl.items.length ? [...tmpl.items] : ['']);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEditTemplate(tmpl: { id: number; name: string; degreeType?: string | null; itemsParsed: string[] }) {
    setEditTemplateId(tmpl.id);
    setFormName(tmpl.name);
    setFormDegree(tmpl.degreeType || '');
    setFormItems(tmpl.itemsParsed.length ? tmpl.itemsParsed : ['']);
    setShowForm(true);
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
        <Button size="sm" onClick={() => { setEditTemplateId(null); setFormName(''); setFormDegree(''); setFormItems(['']); setShowForm(p => !p); }} className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Custom Template
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="border-2 border-indigo/25">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo" />
              {editTemplateId ? 'Edit Custom Template' : 'New Custom Template'}
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
                <Check className="w-4 h-4 mr-1" /> {editTemplateId ? 'Update Template' : 'Save Template'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditTemplateId(null); }}>
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
              <Card key={tmpl.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="flex-1 text-left"
                      onClick={() => setExpandedId(isOpen ? null : tmpl.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{tmpl.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tmpl.degreeType} · {tmpl.items.length} items</p>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground mr-2" /> : <ChevronRight className="w-4 h-4 text-muted-foreground mr-2" />}
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
                    <button
                      onClick={() => copyDefaultTemplate(tmpl)}
                      title="Copy and edit this template"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
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
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <button
                          onClick={() => startEditTemplate(tmpl)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(tmpl.id)}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
