import React, { useState } from 'react';
import { Dashboard } from '@/pages/Dashboard';
import { ScoreTracker } from '@/pages/ScoreTracker';
import { StudyLog } from '@/pages/StudyLog';
import { PracticeTracker } from '@/pages/PracticeTracker';
import { VocabularyBank } from '@/pages/VocabularyBank';
import { PlanningCorner } from '@/pages/PlanningCorner';
import { IELTSJourneyPlanner } from '@/pages/IELTSJourneyPlanner';
import { FlyNotepad } from '@/pages/FlyNotepad';
import { HigherStudyPrep } from '@/pages/HigherStudyPrep';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Confetti } from '@/components/Confetti';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import SignInPage from '@/pages/SignInPage';
import SignUpPage from '@/pages/SignUpPage';
import { SpellingPractice } from '@/pages/SpellingPractice';
import {
  type LucideIcon, ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, LogOut, Plane, BookOpenCheck,
  LayoutDashboard, GraduationCap, BarChart3, Trophy, FileText, NotebookPen,
  Home, TrendingUp, BookOpen, Target, BookMarked, Compass, CalendarClock,
  ChevronRight, Quote, ClipboardCheck, Clock, Gauge, Headphones, PenLine, FilePlus2,
  Rocket, ArrowUpRight, ListChecks, CircleCheckBig, ChevronDown, Zap, Linkedin, Youtube, Twitter, Leaf, Mountain,
  SpellCheck,
} from 'lucide-react';
import { Switch, Route, Redirect, useLocation, useParams } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type AppMode  = 'home' | 'fly' | 'study';
type FlyTab   = 'overview' | 'applications' | 'tests' | 'scholarships' | 'templates' | 'notepad';
type StudyTab = 'dashboard' | 'scores' | 'study' | 'practice' | 'vocab' | 'spelling' | 'planning' | 'journey';

/* ─── DATE / STREAK HELPERS ─────────────────────────────────────────────── */
/** YYYY-MM-DD in LOCAL timezone — never use toISOString() for date comparisons */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  // Parse "YYYY-MM-DD" as local date to avoid UTC-offset issues
  const [y, mo, d] = dateStr.split('-').map(Number);
  const target = new Date(y, mo - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function calcStreak(sessions: any[]): number {
  const studyDates = new Set(sessions.map((s: any) => s.date));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(today);
  // Grace: if today has no session yet, still count from yesterday
  if (!studyDates.has(localDateStr(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (studyDates.has(localDateStr(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function CountdownBadge({
  label, days, color,
}: { label: string; days: number; color: 'indigo' | 'teal' | 'amber' }) {
  const palettes = {
    indigo: { bg: '#FFFFFF', border: '#DAD6FF', text: '#233B63', shadow: '0 2px 10px rgba(124, 108, 255, 0.08)' },
    teal:   { bg: '#FFFFFF', border: '#DDF4F7', text: '#176B73', shadow: '0 2px 10px rgba(25, 199, 183, 0.08)' },
    amber:  { bg: '#FFFFFF', border: '#F2C75C', text: '#B8860B', shadow: '0 2px 10px rgba(242, 199, 92, 0.08)' },
  };
  const p = palettes[color];
  const display =
    days === 0 ? 'Today!' :
    days > 0   ? `${days} day${days === 1 ? '' : 's'}` :
                 `${Math.abs(days)}d ago`;
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl min-w-[120px]"
      style={{ background: p.bg, border: `1px solid ${p.border}`, boxShadow: p.shadow }}>
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: p.text }}>{label}</span>
      <span className="text-2xl font-black leading-none" style={{ color: p.text }}>
        {display}
      </span>
    </div>
  );
}

/* ─── AUTH GATE ─────────────────────────────────────────────────────────── */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes wfw-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #E3EAF0', borderTopColor: '#176B73', borderRadius: '50%', animation: 'wfw-spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Loading…</p>
        </div>
      </div>
    );
  }
  if (window.location.pathname === '/sign-up') return <SignUpPage />;
  if (!user) return <SignInPage />;
  return <>{children}</>;
}

/* ─── RESOURCES DROPDOWN (Home nav) ─────────────────────────────────────── */
// Add or edit links here. An entry with an empty href stays hidden until you paste a link.
const RESOURCE_LINKS: { label: string; href: string }[] = [
  { label: 'Updates about Fly', href: 'https://youtube.com/playlist?list=PLb9m3FmRpwa8&si=drHFHb2oD0EQ9IKL' },
  { label: 'Iprep 2027', href: 'https://youtube.com/playlist?list=PLT9y-1EiZd74&si=fDxh75q-X5ha7jGF' },
  { label: 'YouTube playlist', href: '' },
];

function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const links = RESOURCE_LINKS.filter(l => l.href);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} data-testid="button-resources-menu"
        className="inline-flex items-center gap-1 text-[13px] font-medium pb-1 border-b-2 border-transparent transition-colors hover:text-[#176B73]" style={{ color: open ? '#176B73' : '#64748B' }}>
        Resources <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border bg-white p-1.5" style={{ borderColor: '#E3EAF0', boxShadow: '0 12px 32px rgba(23,36,61,.12)' }}>
          {links.map(l => (
            <a key={l.label} role="menuitem" href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#233B63] transition-colors hover:bg-[#F8FAFC]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEEEE] text-[#D95757]"><Youtube className="h-4 w-4" /></span>
              <span className="flex-1">{l.label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8]" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── LANDING PAGE ──────────────────────────────────────────────────────── */
function LandingPage({ onFly, onStudy }: { onFly: () => void; onStudy: () => void }) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const { data: applications = [] } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const { data: scholarships = [] } = useQuery({ queryKey: ['scholarships'], queryFn: api.getScholarships });
  const { data: studySessions = [] } = useQuery({ queryKey: ['study-sessions'], queryFn: api.getStudySessions });
  const { data: scores = [] } = useQuery({ queryKey: ['scores'], queryFn: api.getScores });
  const { data: practiceLogs = [] } = useQuery({ queryKey: ['practice-logs'], queryFn: api.getPracticeLogs });

  const examDays = daysUntil((settings as any)?.examDate);
  const streak = calcStreak(studySessions as any[]);
  const initials = (user?.name || '?').trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('');

  const sevenDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return localDateStr(d); })();
  const withinLast7Days = (dateStr: string) => Boolean(dateStr) && dateStr >= sevenDaysAgo;

  // ── Fly metrics — all derived directly from the SAME applications/scholarships
  // queries Fly → Applications and Fly → Scholarships themselves render from. ──
  const appRows = (applications as any[]).map(a => ({ ...a, days: daysUntil(a.deadline) }));
  const upcomingApplications = appRows.filter(a => a.status !== 'withdrawn' && a.days !== null && a.days >= 0).sort((a, b) => a.days - b.days);
  const nextDeadline = upcomingApplications[0] ?? null;
  const upcomingDeadlineCount = upcomingApplications.filter(a => a.days <= 30).length;
  let docsDone = 0, docsTotal = 0;
  appRows.forEach(a => {
    if (a.status === 'withdrawn') return; // Not Applied: documents not counted
    const reqs: { done?: boolean }[] = (() => { try { return JSON.parse(a.requirementsJson || '[]'); } catch { return []; } })();
    docsTotal += reqs.length;
    docsDone += reqs.filter(r => r.done).length;
  });

  // ── Study metrics — same "latest score per module, averaged" band calc the
  // Study dashboard uses, plus this-week practice/study activity. ──────────
  const currentBand = React.useMemo(() => {
    const modules = ['Reading', 'Listening', 'Writing', 'Speaking'];
    const latest: number[] = [];
    modules.forEach(mod => {
      const modScores = (scores as any[]).filter(s => s.module === mod).sort((a, b) => (a.date < b.date ? 1 : -1));
      if (modScores.length) latest.push(modScores[0].band);
    });
    return latest.length ? latest.reduce((a, b) => a + b, 0) / latest.length : null;
  }, [scores]);

  const practiceThisWeek = (practiceLogs as any[]).filter(p => withinLast7Days(p.date));
  const minutesThisWeek = (studySessions as any[]).filter(s => withinLast7Days(s.date)).reduce((sum, s) => sum + (s.minutes || 0), 0);
  const accuracyLogs = practiceThisWeek.filter(p => p.module === 'Reading' || p.module === 'Listening');
  const avgAccuracy = accuracyLogs.length
    ? Math.round((accuracyLogs.reduce((sum, p) => sum + (p.score / p.totalQuestions), 0) / accuracyLogs.length) * 100)
    : null;

  const fmtDays = (d: number) => (d === 0 ? 'Today' : d === 1 ? '1 day' : `${d} days`);

  // ── What's Next — built only from real signals; nothing here is fabricated. ──
  type NextItem = { icon: LucideIcon; iconBg: string; iconColor: string; label: string; sub: string; onClick: () => void };
  const nextItems: NextItem[] = [];
  if (nextDeadline) {
    nextItems.push({
      icon: GraduationCap, iconBg: '#DDF4F7', iconColor: '#176B73',
      label: `${nextDeadline.universityName} deadline`,
      sub: `${fmtDays(nextDeadline.days)} left to apply`,
      onClick: () => setLocation(`/fly/applications/${nextDeadline.id}`),
    });
  }
  if (docsTotal > 0 && docsDone < docsTotal) {
    nextItems.push({
      icon: FileText, iconBg: '#FDF8EB', iconColor: '#B8860B',
      label: 'Application documents',
      sub: `${docsTotal - docsDone} item${docsTotal - docsDone === 1 ? '' : 's'} left to complete`,
      onClick: () => setLocation('/fly/applications'),
    });
  }
  if (examDays !== null && examDays >= 0 && examDays <= 21) {
    nextItems.push({
      icon: CalendarClock, iconBg: '#A9DCE8', iconColor: '#233B63',
      label: 'IELTS exam approaching',
      sub: `${fmtDays(examDays)} to prepare`,
      onClick: () => setLocation('/study/scores'),
    });
  }
  if (practiceThisWeek.length === 0) {
    nextItems.push({
      icon: Target, iconBg: '#DDF4F7', iconColor: '#176B73',
      label: 'No practice logged this week',
      sub: 'Log a practice session to stay on track',
      onClick: () => setLocation('/study/practice'),
    });
  }
  const upcomingScholarship = (scholarships as any[])
    .map((s: any) => ({ ...s, days: daysUntil(s.deadline) }))
    .filter(s => s.status !== 'not_eligible' && s.days !== null && s.days >= 0)
    .sort((a, b) => a.days - b.days)[0];
  if (upcomingScholarship && upcomingScholarship.days <= 21) {
    nextItems.push({
      icon: Trophy, iconBg: '#FDF8EB', iconColor: '#B8860B',
      label: `${upcomingScholarship.name} deadline`,
      sub: `${fmtDays(upcomingScholarship.days)} left`,
      onClick: () => setLocation(`/fly/scholarships/${upcomingScholarship.id}`),
    });
  }
  const shownItems = nextItems.slice(0, 4);

  return (
    <div className="landing-page min-h-[100dvh] flex flex-col" style={{ background: '#F8FAFC', color: '#182238' }}>
      <style>{`
        .landing-page { --land-ink:#182238; --land-muted:#64748B; --land-border:#E3EAF0; --land-sea:#176B73; }
        .landing-page .land-card { border:1px solid #E3EAF0; box-shadow:0 2px 8px rgba(23,36,61,.035),0 14px 34px rgba(23,36,61,.035); }
        .landing-page .land-link { transition:transform 180ms ease, background-color 180ms ease, border-color 180ms ease; }
        .landing-page .land-link:hover { transform:translateY(-2px); }
        .landing-page .land-enter { animation:land-enter 620ms cubic-bezier(.2,.7,.2,1) both; }
        .landing-page .land-enter-delay { animation:land-enter 720ms cubic-bezier(.2,.7,.2,1) 100ms both; }
        @keyframes land-enter { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .landing-page .land-enter,.landing-page .land-enter-delay { animation:none; } .landing-page .land-link { transition:none; } }
      `}</style>

      <nav className="relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-12 py-4 bg-white/95 border-b" style={{ borderColor: '#E3EAF0' }}>
        <div className="flex items-center gap-3">
          <img src="/images/logo-mark.png" alt="Within a Few Weeks" width="34" height="34" className="shrink-0" />
          <span className="font-bold text-[15px] sm:text-[16px] tracking-tight" style={{ color: '#17243D', fontFamily: 'Manrope, sans-serif' }}>Within a Few Weeks</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <span className="text-[13px] font-semibold pb-1 border-b-2" style={{ color: '#176B73', borderColor: '#19C7B7' }}>Home</span>
          <button onClick={onStudy} className="text-[13px] font-medium pb-1 border-b-2 border-transparent transition-colors hover:text-[#176B73]" style={{ color: '#64748B' }}>My Study</button>
          <ResourcesMenu />
          <span title="Coming soon" className="text-[13px] font-medium text-slate-400/70 cursor-not-allowed pb-1 border-b-2 border-transparent">Community</span>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="hidden sm:block text-[13px] font-medium" style={{ color: '#64748B' }}>{user?.name}</span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0 ring-2 ring-[#DDF4F7]" style={{ background: 'linear-gradient(140deg, #233B63, #176B73)' }}>{initials}</span>
          <ChevronDown className="hidden sm:block h-3.5 w-3.5" style={{ color: '#64748B' }} />
          <button onClick={logout} className="text-[12px] sm:text-[13px] font-semibold px-3.5 sm:px-4 py-2 rounded-full transition-opacity hover:opacity-85" style={{ background: '#DDF4F7', color: '#233B63' }}>Sign out</button>
        </div>
      </nav>

      <header className="px-4 sm:px-7 lg:px-10 pt-4 sm:pt-5">
        <div className="land-enter relative max-w-[1400px] mx-auto overflow-hidden rounded-[26px] sm:rounded-[32px]" style={{ background: 'linear-gradient(116deg, #17243D 0%, #233B63 58%, #176B73 100%)' }}>
          <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute right-10 top-8 h-64 w-64 rounded-full border border-white/[0.07]" />
          <div className="relative grid lg:grid-cols-[.95fr_1.05fr] gap-6 lg:gap-8 items-center p-5 sm:p-7 lg:p-8">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2.5 rounded-full px-3 py-1.5 mb-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[.16em] text-[#DDF4F7]" style={{ backgroundColor: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.15)' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#42E6B8]" />
                Your next chapter, in motion
              </div>
              <h1 className="max-w-[590px] text-white font-bold leading-[1.04] tracking-[-.045em] mb-3" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(2rem, 3.6vw, 3.1rem)' }}>
                Within a Few<br /><span style={{ color: '#A9DCE8' }}>Weeks.</span>
              </h1>
              <p className="max-w-[480px] text-[13px] sm:text-[14px] leading-6 text-white/75 mb-5">
                Make the distance between today and your Nordic study goal feel a little smaller. Prepare for IELTS, keep applications moving, and see your progress take shape.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={onFly} className="group inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[13px] font-semibold text-[#17243D] transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(100deg, #19C7B7, #7C6CFF)' }}>
                  Explore higher study <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
                <button onClick={onStudy} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-white/15" style={{ border: '1px solid rgba(255,255,255,.32)' }}>
                  <BookOpen className="h-4 w-4 text-[#A9DCE8]" /> Open study space
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5" style={{ background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.13)' }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2C75C]/15"><Zap className="h-4 w-4 text-[#F2C75C]" /></span>
                  <div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-white/55">Study streak</p><p className="mt-0.5 text-[15px] font-bold text-white">{streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'}` : 'Start today'}</p></div>
                </div>
                <button onClick={() => setLocation('/study/scores')} className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors hover:bg-white/[.14]" style={{ background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.13)' }}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#A9DCE8]/15"><Target className="h-4 w-4 text-[#A9DCE8]" /></span>
                  <div><p className="text-[9px] font-semibold uppercase tracking-[.15em] text-white/55">IELTS exam</p><p className="mt-0.5 text-[15px] font-bold text-white">{examDays === null ? 'Not set' : examDays < 0 ? 'Passed' : fmtDays(examDays)}</p></div>
                </button>
              </div>
            </div>
            <div className="land-enter-delay relative min-h-[170px] sm:min-h-[230px] lg:min-h-[290px] overflow-hidden rounded-[22px] sm:rounded-[26px]" style={{ boxShadow: '0 24px 60px rgba(23, 36, 61, .3)', border: '1px solid rgba(255,255,255,.22)' }}>
              <img src="/images/hero-nordic-no-flags.jpg" alt="A quiet study desk looking across a Nordic fjord town at dusk" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(23,36,61,0) 32%, rgba(23,36,61,.68) 100%)' }} />
              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm" style={{ background: 'rgba(23,36,61,.42)', border: '1px solid rgba(255,255,255,.25)' }}>
                <Mountain className="h-3.5 w-3.5 text-[#A9DCE8]" /> A wider horizon is within reach
              </div>
              <div className="absolute bottom-5 left-5 right-5 sm:bottom-7 sm:left-7 sm:right-7 flex items-end justify-between gap-4">
                <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/70">One steady step at a time</p><p className="mt-1 text-[19px] sm:text-[23px] font-semibold tracking-tight text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>Your future has a place.</p></div>
                <span className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm"><ArrowUpRight className="h-5 w-5" /></span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-7 lg:px-10">
        <section className="relative z-10 max-w-[1360px] mx-auto -mt-1 sm:-mt-3">
          <div className="land-card flex flex-col lg:flex-row lg:items-center gap-4 rounded-2xl sm:rounded-[22px] bg-white px-5 sm:px-7 py-5">
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: '#DDF4F7', color: '#176B73' }}><Zap className="h-4.5 w-4.5" /></span>
              <div><p className="text-[13px] font-bold" style={{ color: '#17243D' }}>A good next step</p><p className="text-[11px]" style={{ color: '#64748B' }}>Pick up where you left off</p></div>
            </div>
            <div className="hidden lg:block h-10 w-px bg-[#E3EAF0] mx-1" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 flex-1">
              <button onClick={() => setLocation('/fly/applications')} className="land-link flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-[#E3EAF0] hover:bg-[#F8FAFC]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEEEE] text-[#D95757]"><FileText className="h-4 w-4" /></span><span className="text-[12px] font-semibold text-[#233B63]">Applications</span><ChevronRight className="ml-auto h-3.5 w-3.5 text-[#94A3B8]" />
              </button>
              <button onClick={() => setLocation('/study/study')} className="land-link flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-[#E3EAF0] hover:bg-[#F8FAFC]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DDF4F7] text-[#176B73]"><BookOpen className="h-4 w-4" /></span><span className="text-[12px] font-semibold text-[#233B63]">Log study</span><ChevronRight className="ml-auto h-3.5 w-3.5 text-[#94A3B8]" />
              </button>
              <button onClick={() => setLocation('/study/practice')} className="land-link flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-[#E3EAF0] hover:bg-[#F8FAFC]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEEEE] text-[#D95757]"><Target className="h-4 w-4" /></span><span className="text-[12px] font-semibold text-[#233B63]">Practice</span><ChevronRight className="ml-auto h-3.5 w-3.5 text-[#94A3B8]" />
              </button>
              <button onClick={() => setLocation('/study/vocab')} className="land-link flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-[#E3EAF0] hover:bg-[#F8FAFC]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F2F0FF] text-[#7C6CFF]"><BookMarked className="h-4 w-4" /></span><span className="text-[12px] font-semibold text-[#233B63]">Vocabulary</span><ChevronRight className="ml-auto h-3.5 w-3.5 text-[#94A3B8]" />
              </button>
              <button onClick={() => setLocation('/study/planning')} className="land-link flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-[#E3EAF0] hover:bg-[#F8FAFC]">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FDF8EB] text-[#B8860B]"><CalendarClock className="h-4 w-4" /></span><span className="text-[12px] font-semibold text-[#233B63]">Planning</span><ChevronRight className="ml-auto h-3.5 w-3.5 text-[#94A3B8]" />
              </button>
            </div>
          </div>
        </section>

        <section className="max-w-[1360px] mx-auto pt-10 sm:pt-12 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 sm:mb-6">
            <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#176B73] mb-2">Your workspace</p><h2 className="text-[23px] sm:text-[27px] font-bold tracking-[-.03em]" style={{ color: '#17243D', fontFamily: 'Manrope, sans-serif' }}>Two paths. One bright direction.</h2></div>
            <p className="max-w-md text-[12px] leading-5" style={{ color: '#64748B' }}>Build your English confidence while making the practical pieces of studying abroad easier to see.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_.82fr] gap-4 sm:gap-5">
            <button onClick={onFly} className="land-card land-link group relative overflow-hidden rounded-[22px] bg-white p-5 sm:p-6 text-left">
              <div className="absolute top-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg,#D95757,#F2C75C)' }} />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#FBEEEE] text-[#D95757]"><Plane className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#64748B]">Fly · Higher study</p><h3 className="mt-0.5 text-[17px] font-bold tracking-tight text-[#17243D]" style={{ fontFamily: 'Manrope, sans-serif' }}>Make room for what’s next</h3></div></div>
                <ArrowUpRight className="mt-1 h-4 w-4 text-[#D95757] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-4 mb-5 max-w-lg text-[12px] leading-5 text-[#64748B]">Keep applications, scholarships, deadlines and documents moving in one clear view.</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><FileText className="mb-2 h-4 w-4 text-[#D95757]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{appRows.length}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Applications</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><GraduationCap className="mb-2 h-4 w-4 text-[#176B73]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{(scholarships as any[]).length}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Scholarships</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><CalendarClock className="mb-2 h-4 w-4 text-[#D95757]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{upcomingDeadlineCount}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Upcoming deadlines</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><ClipboardCheck className="mb-2 h-4 w-4 text-[#176B73]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{docsTotal > 0 ? `${docsDone}/${docsTotal}` : '—'}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Documents ready</p></div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-[12px] font-semibold text-[#176B73]">Continue tracking <ArrowUpRight className="h-3.5 w-3.5" /></div>
            </button>

            <button onClick={onStudy} className="land-card land-link group relative overflow-hidden rounded-[22px] bg-white p-5 sm:p-6 text-left">
              <div className="absolute top-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg,#19C7B7,#A9DCE8)' }} />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#DDF4F7] text-[#176B73]"><BookOpen className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#64748B]">Study · IELTS</p><h3 className="mt-0.5 text-[17px] font-bold tracking-tight text-[#17243D]" style={{ fontFamily: 'Manrope, sans-serif' }}>Small practice, real progress</h3></div></div>
                <ArrowUpRight className="mt-1 h-4 w-4 text-[#176B73] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-4 mb-5 max-w-lg text-[12px] leading-5 text-[#64748B]">See your latest scores, weekly practice and time spent building confidence.</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><BarChart3 className="mb-2 h-4 w-4 text-[#176B73]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{currentBand !== null ? currentBand.toFixed(1) : '—'}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Current band</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><CalendarClock className="mb-2 h-4 w-4 text-[#176B73]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{practiceThisWeek.length}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Practice this week</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><Clock className="mb-2 h-4 w-4 text-[#176B73]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{minutesThisWeek}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Minutes this week</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><Target className="mb-2 h-4 w-4 text-[#176B73]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{avgAccuracy !== null ? `${avgAccuracy}%` : '—'}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Average accuracy</p></div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-[12px] font-semibold text-[#176B73]">Continue learning <ArrowUpRight className="h-3.5 w-3.5" /></div>
            </button>

            <aside className="land-card flex flex-col rounded-[22px] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4"><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">Keep momentum</p><h3 className="mt-1 text-[18px] font-bold tracking-tight text-[#17243D]" style={{ fontFamily: 'Manrope, sans-serif' }}>What’s next</h3></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DDF4F7] text-[#176B73]"><Compass className="h-4.5 w-4.5" /></span></div>
              {shownItems.length === 0 ? (
                <div className="flex flex-1 items-center gap-2 text-[12px] text-[#64748B] py-5"><CircleCheckBig className="h-4 w-4 text-[#176B73] shrink-0" /> All caught up.</div>
              ) : (
                <div className="flex-1 space-y-1">
                  {shownItems.map((item, i) => {
                    const Icon = item.icon;
                    return <button key={i} onClick={item.onClick} className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[#F8FAFC]">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: item.iconBg, color: item.iconColor }}><Icon className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold text-[#233B63] truncate">{item.label}</span><span className="block mt-0.5 text-[10px] text-[#64748B] truncate">{item.sub}</span></span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                    </button>;
                  })}
                </div>
              )}
              <button onClick={() => setLocation('/study/planning')} className="mt-4 w-full rounded-full py-3 text-[12px] font-semibold text-[#17243D] transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(100deg, #19C7B7, #7C6CFF)' }}>Open my planner <ArrowUpRight className="inline h-3.5 w-3.5 ml-1" /></button>
            </aside>
          </div>
        </section>

        <section className="max-w-[1360px] mx-auto pb-10 sm:pb-12">
          <div className="rounded-[22px] px-5 sm:px-8 py-6 sm:py-7" style={{ background: '#DDF4F7', border: '1px solid #A9DCE8' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7">
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#176B73]"><GraduationCap className="h-4 w-4" /></span><div><p className="text-[12px] font-bold text-[#233B63]">Structured preparation</p><p className="text-[10px] mt-0.5 text-[#64748B]">Step by step, at your pace</p></div></div>
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#B8860B]"><Target className="h-4 w-4" /></span><div><p className="text-[12px] font-bold text-[#233B63]">Stay organized</p><p className="text-[10px] mt-0.5 text-[#64748B]">Keep the details in view</p></div></div>
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#176B73]"><TrendingUp className="h-4 w-4" /></span><div><p className="text-[12px] font-bold text-[#233B63]">Track progress</p><p className="text-[10px] mt-0.5 text-[#64748B]">Notice every little gain</p></div></div>
              <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#7C6CFF]"><Rocket className="h-4 w-4" /></span><div><p className="text-[12px] font-bold text-[#233B63]">Move toward your goal</p><p className="text-[10px] mt-0.5 text-[#64748B]">Your next chapter is taking shape</p></div></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto" style={{ background: '#17243D' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] font-semibold tracking-[.18em] uppercase text-white/60">Within a Few Weeks <span className="mx-2 text-white/30">·</span> Erasmus <span className="mx-2 text-white/30">·</span> Europe <span className="mx-2 text-white/30">·</span> Beyond</p>
          <div className="flex items-center gap-2.5">
            <a href="#" aria-label="LinkedIn" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Linkedin className="h-4 w-4 text-white" /></a>
            <a href="#" aria-label="YouTube" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Youtube className="h-4 w-4 text-white" /></a>
            <a href="#" aria-label="X" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"><Twitter className="h-4 w-4 text-white" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── SHARED APP SHELL (Part 1 — design system foundation) ─────────────────
   Centralised sidebar, header and mobile navigation used by both products.
   Product identity (Fly = indigo/violet, Study = navy/teal) comes entirely
   from the `.fly-mode` / `.study-mode` CSS scopes in index.css — the shell
   markup itself is shared, so the two products look related, not identical. */
type NavItem<T extends string> = { id: T; label: string; icon: LucideIcon; badge?: number };

const FLY_TABS: NavItem<FlyTab>[] = [
  { id: 'overview',     label: 'Overview',      icon: LayoutDashboard },
  { id: 'applications', label: 'Applications',  icon: GraduationCap },
  { id: 'tests',        label: 'Test Scores',   icon: BarChart3 },
  { id: 'scholarships', label: 'Scholarships',  icon: Trophy },
  { id: 'templates',    label: 'Doc Templates', icon: FileText },
  { id: 'notepad',      label: 'Notepad',       icon: NotebookPen },
];

const STUDY_TABS: NavItem<StudyTab>[] = [
  { id: 'dashboard', label: 'Dashboard',        icon: Home },
  { id: 'scores',    label: 'Mock Test',        icon: TrendingUp },
  { id: 'study',     label: 'Study Log',        icon: BookOpen },
  { id: 'practice',  label: 'Practice Tracker', icon: Target },
  { id: 'vocab',     label: 'Vocab Bank',       icon: BookMarked },
  { id: 'spelling',  label: 'Spelling Practice', icon: SpellCheck },
  { id: 'journey',   label: 'My Journey',       icon: Compass },
  { id: 'planning',  label: 'Planning',         icon: CalendarClock },
];

const SIDEBAR_COLLAPSE_KEY = 'wfw-sidebar-collapsed';
function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0'); } catch { /* storage unavailable — non-fatal */ }
      return next;
    });
  }
  return [collapsed, toggle];
}

/* ─── DESKTOP SIDEBAR — collapsible, icon+label / icon-only ─────────────── */
interface SidebarProps<T extends string> {
  tabs: NavItem<T>[];
  activeTab: T;
  onTab: (t: T) => void;
  onBack: () => void;
  productName: string;
  productSubtitle: string;
  productIcon: LucideIcon;
  bottomWidget?: React.ReactNode;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function AppSidebar<T extends string>({
  tabs, activeTab, onTab, onBack, productName, productSubtitle, productIcon: ProductIcon,
  bottomWidget, collapsed, onToggleCollapsed,
}: SidebarProps<T>) {
  return (
    <aside
      className={`hidden md:flex flex-col ${collapsed ? 'w-20' : 'w-[17rem]'} bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen shrink-0 transition-[width] duration-200 ease-out`}
    >
      <div className={`flex items-center gap-2 p-4 ${collapsed ? 'justify-center' : ''}`}>
        <button
          onClick={onBack}
          aria-label="Back to home"
          title="Back to home"
          className="flex items-center justify-center w-9 h-9 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(var(--sidebar-primary) / 0.18)' }}>
              <ProductIcon className="w-5 h-5" style={{ color: 'hsl(var(--sidebar-primary))' }} />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-semibold text-[15px] leading-tight truncate">{productName}</p>
              <p className="text-[11px] text-sidebar-foreground/60 truncate">{productSubtitle}</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const button = (
            <button
              key={tab.id}
              onClick={() => onTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 rounded-xl text-sm transition-all duration-200 ${collapsed ? 'justify-center px-0 py-3' : 'px-3 py-3'} ${
                isActive ? 'gradient-aurora text-white font-semibold shadow-sm' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">{tab.label}</span>}
              {!collapsed && (tab.badge ?? 0) > 0 && (
                tab.badge === 1
                  ? <span className="w-1.5 h-1.5 rounded-full bg-[#D95757] shrink-0" />
                  : <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white bg-[#D95757] shrink-0">{tab.badge}</span>
              )}
            </button>
          );
          if (!collapsed) return button;
          return (
            <Tooltip key={tab.id} delayDuration={200}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right">{tab.label}{(tab.badge ?? 0) > 0 ? ` · ${tab.badge}` : ''}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {bottomWidget && !collapsed && (
        <div className="px-3 pb-2">
          <div className="h-px bg-sidebar-border mb-3" />
          {bottomWidget}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="flex items-center justify-center gap-2 mx-3 mb-4 h-9 rounded-xl text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-xs font-medium shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /> Collapse</>}
      </button>
    </aside>
  );
}

/* ─── MOBILE NAVIGATION DRAWER — replaces the old fixed bottom tab bar ──── */
interface MobileNavDrawerProps<T extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabs: NavItem<T>[];
  activeTab: T;
  onTab: (t: T) => void;
  onBack: () => void;
  productName: string;
  productSubtitle: string;
  productIcon: LucideIcon;
  bottomWidget?: React.ReactNode;
}

function MobileNavDrawer<T extends string>({
  open, onOpenChange, tabs, activeTab, onTab, onBack, productName, productSubtitle, productIcon: ProductIcon, bottomWidget,
}: MobileNavDrawerProps<T>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(20rem,88vw)] p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border [&_svg.absolute]:text-sidebar-foreground/60">
        <SheetTitle className="sr-only">{productName} navigation</SheetTitle>
        <div className="flex items-center gap-3 p-5 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(var(--sidebar-primary) / 0.18)' }}>
            <ProductIcon className="w-5 h-5" style={{ color: 'hsl(var(--sidebar-primary))' }} />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-[15px] leading-tight">{productName}</p>
            <p className="text-[11px] text-sidebar-foreground/60">{productSubtitle}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { onTab(tab.id); onOpenChange(false); }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200 ${isActive ? 'gradient-aurora text-white font-semibold shadow-sm' : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {(tab.badge ?? 0) > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white bg-[#D95757]">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => { onOpenChange(false); onBack(); }}
          className="flex items-center gap-2 mx-3 mb-3 px-3 py-3 rounded-xl text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>

        {bottomWidget && (
          <div className="px-3 pb-4">
            <div className="h-px bg-sidebar-border mb-3" />
            {bottomWidget}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─── LIGHTWEIGHT TOP HEADER — title, subtitle, actions; no wasted height ── */
function AppHeader({
  title, subtitle, onOpenMobileNav, actions,
}: { title: string; subtitle: string; onOpenMobileNav: () => void; actions?: React.ReactNode }) {
  return (
    <header className="bg-card/90 backdrop-blur-xl border-b border-border/70 sticky top-0 z-40 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenMobileNav}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-colors hover:bg-accent/70 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Open navigation menu"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="min-w-0">
            <h1 className="font-heading font-semibold text-base leading-tight truncate">{title}</h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

/* ─── FLY LAYOUT (Higher Study) ─────────────────────────────────────────── */
function FlyLayout() {
  const params = useParams<{ tab?: string; id?: string }>();
  const [, setLocation] = useLocation();
  const tab = (params.tab as FlyTab) || 'overview';
  function setTab(next: FlyTab) { setLocation(`/fly/${next}`); }
  function onBack() { setLocation('/'); }

  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const pageTitle = FLY_TABS.find(t => t.id === tab)?.label ?? 'Overview';

  const { data: applications = [] } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const urgentDeadlineCount = (applications as any[]).filter((a: any) => {
    const d = daysUntil(a.deadline);
    return d !== null && d >= 0 && d <= 15;
  }).length;

  const flyTabsWithBadges = FLY_TABS.map(t => ({
    ...t,
    badge: (t.id === 'applications' || t.id === 'overview') ? urgentDeadlineCount : undefined,
  }));

  const bottomWidget = (
    <div className="flex flex-col gap-2">
      <div className="px-1 flex items-center justify-between gap-2 min-w-0">
        <p className="text-[12px] text-sidebar-foreground/60 truncate">{user?.name}</p>
        <button onClick={logout} aria-label="Sign out" title="Sign out" className="text-sidebar-foreground/45 hover:text-sidebar-foreground transition-colors shrink-0">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fly-mode h-screen overflow-hidden bg-background text-foreground font-sans flex">
      <AppSidebar
        tabs={flyTabsWithBadges}
        activeTab={tab}
        onTab={(nextTab) => setTab(nextTab as FlyTab)}
        onBack={onBack}
        productName="Fly"
        productSubtitle="Higher Study Prep"
        productIcon={Plane}
        bottomWidget={bottomWidget}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <MobileNavDrawer
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        tabs={flyTabsWithBadges}
        activeTab={tab}
        onTab={(nextTab) => setTab(nextTab as FlyTab)}
        onBack={onBack}
        productName="Fly"
        productSubtitle="Higher Study Prep"
        productIcon={Plane}
        bottomWidget={bottomWidget}
      />

      {/* This column is pinned to the viewport height; `main` below is the ONE
          deliberate scroll region, so long/filtered lists always stay reachable
          regardless of zoom level or screen height (never clipped). */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AppHeader
          title={pageTitle}
          subtitle="Higher Study · Within a Few Weeks"
          onOpenMobileNav={() => setMobileNavOpen(true)}
          actions={urgentDeadlineCount > 0 ? (
            <button
              onClick={() => setTab('applications')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: 'var(--apps-priority-high)' }}
            >
              {urgentDeadlineCount} deadline{urgentDeadlineCount > 1 ? 's' : ''} in ≤15 days
            </button>
          ) : undefined}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {tab === 'notepad'
              ? <FlyNotepad />
              : <HigherStudyPrep tab={tab} onTabChange={(t) => setTab(t as FlyTab)} />
            }
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── STUDY LAYOUT (IELTS) ──────────────────────────────────────────────── */
function StudyLayout() {
  const params = useParams<{ tab?: string }>();
  const [, setLocation] = useLocation();
  const tab = (params.tab as StudyTab) || 'dashboard';
  function setTab(next: StudyTab) { setLocation(`/study/${next}`); }
  function onBack() { setLocation('/'); }

  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const { user, logout } = useAuth();
  const { data: studySettings } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const pageTitle = STUDY_TABS.find(t => t.id === tab)?.label ?? 'Dashboard';

  function fireConfetti() {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3200);
  }

  const targetAvg = (studySettings as any)?.targetReading
    ? (((studySettings as any).targetReading + (studySettings as any).targetListening + (studySettings as any).targetWriting + (studySettings as any).targetSpeaking) / 4).toFixed(1)
    : '7.0';

  const bottomWidget = (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'hsl(var(--sidebar-primary) / 0.12)' }}>
        <p className="text-[9.5px] uppercase tracking-widest text-sidebar-foreground/45 mb-0.5">IELTS Target</p>
        <p className="text-lg font-heading font-bold" style={{ color: 'hsl(var(--sidebar-primary))' }}>{targetAvg}</p>
      </div>
      <div className="px-1 flex items-center justify-between gap-2 min-w-0">
        <p className="text-[12px] text-sidebar-foreground/60 truncate">{(studySettings as any)?.name || user?.name || 'Student'}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <SettingsPanel dark />
          <button onClick={logout} aria-label="Sign out" title="Sign out" className="text-sidebar-foreground/45 hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="study-mode h-screen overflow-hidden bg-background text-foreground font-sans flex">
      <Confetti active={confetti} />

      <AppSidebar
        tabs={STUDY_TABS}
        activeTab={tab}
        onTab={(nextTab) => setTab(nextTab as StudyTab)}
        onBack={onBack}
        productName="Study"
        productSubtitle="IELTS Journey"
        productIcon={BookOpenCheck}
        bottomWidget={bottomWidget}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <MobileNavDrawer
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        tabs={STUDY_TABS}
        activeTab={tab}
        onTab={(nextTab) => setTab(nextTab as StudyTab)}
        onBack={onBack}
        productName="Study"
        productSubtitle="IELTS Journey"
        productIcon={BookOpenCheck}
        bottomWidget={bottomWidget}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AppHeader
          title={pageTitle}
          subtitle="IELTS Journey · Within a Few Weeks"
          onOpenMobileNav={() => setMobileNavOpen(true)}
          actions={<SettingsPanel />}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'scores'    && <ScoreTracker triggerConfetti={fireConfetti} />}
            {tab === 'study'     && <StudyLog />}
            {tab === 'practice'  && <PracticeTracker />}
            {tab === 'vocab'     && <VocabularyBank />}
            {tab === 'spelling'  && <SpellingPractice />}
            {tab === 'journey'   && <IELTSJourneyPlanner />}
            {tab === 'planning'  && <PlanningCorner />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── MAIN APP — real URL routing so refresh/direct-links land on the exact
   page the user was viewing, instead of always resetting to Home. ────────── */
function MainApp() {
  const [, setLocation] = useLocation();
  return (
    <Switch>
      <Route path="/">
        <LandingPage onFly={() => setLocation('/fly/overview')} onStudy={() => setLocation('/study/dashboard')} />
      </Route>
      <Route path="/fly"><Redirect to="/fly/overview" /></Route>
      <Route path="/fly/:tab/:id?"><FlyLayout /></Route>
      <Route path="/study"><Redirect to="/study/dashboard" /></Route>
      <Route path="/study/:tab"><StudyLayout /></Route>
      <Route><Redirect to="/" /></Route>
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthGate>
            <MainApp />
          </AuthGate>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
