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
import {
  type LucideIcon, ArrowLeft, Menu, PanelLeftClose, PanelLeftOpen, LogOut, Plane, BookOpenCheck,
  LayoutDashboard, GraduationCap, BarChart3, Trophy, FileText, NotebookPen,
  Home, TrendingUp, BookOpen, Target, BookMarked, Compass, CalendarClock,
  Flame, CircleCheckBig, ChevronRight, Plus, ArrowUpRight,
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
type StudyTab = 'dashboard' | 'scores' | 'study' | 'practice' | 'vocab' | 'planning' | 'journey';

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
    indigo: { bg: '#ffffff', border: '#e0e7ff', text: '#4338ca', shadow: '0 2px 10px rgba(67, 56, 202, 0.05)' },
    teal:   { bg: '#ffffff', border: '#e0f2fe', text: '#0284c7', shadow: '0 2px 10px rgba(2, 132, 199, 0.05)' },
    amber:  { bg: '#ffffff', border: '#fef3c7', text: '#d97706', shadow: '0 2px 10px rgba(217, 119, 6, 0.05)' },
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
      <div style={{ minHeight: '100vh', background: '#FAFAF9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes wfw-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #E5E7EB', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'wfw-spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Loading…</p>
        </div>
      </div>
    );
  }
  if (window.location.pathname === '/sign-up') return <SignUpPage />;
  if (!user) return <SignInPage />;
  return <>{children}</>;
}

/* ─── LANDING PAGE ──────────────────────────────────────────────────────── */
function StatBlock({
  icon: Icon, label, value, accent, onClick,
}: { icon: LucideIcon; label: string; value: string; accent: 'orange' | 'indigo' | 'teal'; onClick?: () => void }) {
  const accentColor = accent === 'orange' ? '#EA580C' : accent === 'indigo' ? 'var(--apps-accent)' : '#0D9488';
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${onClick ? 'hover:bg-muted/40 cursor-pointer' : ''}`}
      style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-[17px] font-heading font-bold leading-tight" style={{ color: 'var(--apps-text-primary, inherit)' }}>{value}</p>
      </div>
    </Comp>
  );
}

function ModuleCard({
  icon: Icon, name, description, metrics, cta, accentColor, onClick,
}: { icon: LucideIcon; name: string; description: string; metrics: string[]; cta: string; accentColor: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start rounded-xl border p-5 text-left transition-colors hover:bg-muted/30"
      style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)', borderLeftWidth: 3, borderLeftColor: accentColor }}
    >
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <h2 className="font-heading font-bold text-[16px] mb-1">{name}</h2>
      <p className="text-[13px] leading-relaxed text-muted-foreground mb-3">{description}</p>
      {metrics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {metrics.map(m => (
            <span key={m} className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: `${accentColor}14`, color: accentColor }}>{m}</span>
          ))}
        </div>
      )}
      <span className="mt-auto flex items-center gap-1 text-[13px] font-bold" style={{ color: accentColor }}>
        {cta}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </button>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-muted"
      style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color: 'var(--apps-accent)' }} />
      {label}
    </button>
  );
}

function LandingPage({ onFly, onStudy }: { onFly: () => void; onStudy: () => void }) {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const { data: applications = [] } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const { data: scholarships = [] } = useQuery({ queryKey: ['scholarships'], queryFn: api.getScholarships });
  const { data: studySessions = [] } = useQuery({ queryKey: ['study-sessions'], queryFn: api.getStudySessions });
  const { data: scores = [] } = useQuery({ queryKey: ['scores'], queryFn: api.getScores });

  const examDays = daysUntil((settings as any)?.examDate);
  const streak = calcStreak(studySessions as any[]);

  // Single source of truth: the SAME `applications` query + SAME `daysUntil` date-only
  // helper that Fly → Applications itself renders from. Nothing here is a separate/
  // duplicated deadline value, so the homepage can never drift out of sync with Fly.
  const upcomingApplications = (applications as any[])
    .map((a: any) => ({ ...a, days: daysUntil(a.deadline) }))
    .filter((a) => a.days !== null && a.days >= 0)
    .sort((a, b) => a.days - b.days);
  const nextDeadline = upcomingApplications[0] ?? null;
  const upcomingDeadlineCount = upcomingApplications.filter((a) => a.days <= 30).length;

  const upcomingScholarships = (scholarships as any[])
    .map((s: any) => ({ ...s, days: daysUntil(s.deadline) }))
    .filter((s) => s.days !== null && s.days >= 0)
    .sort((a, b) => a.days - b.days);

  // Current IELTS band — the same "latest score per module, averaged" logic the
  // Study dashboard itself uses, so this metric matches what's shown inside Study.
  const currentBand = React.useMemo(() => {
    const modules = ['Reading', 'Listening', 'Writing', 'Speaking'];
    const latest: number[] = [];
    modules.forEach((mod) => {
      const modScores = (scores as any[]).filter((s) => s.module === mod).sort((a, b) => (a.date < b.date ? 1 : -1));
      if (modScores.length) latest.push(modScores[0].band);
    });
    return latest.length ? latest.reduce((a, b) => a + b, 0) / latest.length : null;
  }, [scores]);

  const fmtDays = (d: number) => (d === 0 ? 'Today' : d === 1 ? '1 day' : `${d} days`);

  // "What needs your attention" — built entirely from real, already-fetched data.
  // Nothing here is fabricated; if nothing qualifies, the section shows "All caught up."
  type Attention = { label: string; sub: string; onClick: () => void; urgent?: boolean };
  const attentionItems: Attention[] = [];
  if (examDays !== null && examDays >= 0 && examDays <= 14) {
    attentionItems.push({
      label: 'IELTS exam approaching',
      sub: `${fmtDays(examDays)} left to prepare`,
      onClick: () => setLocation('/study/scores'),
      urgent: examDays <= 3,
    });
  }
  if (nextDeadline) {
    attentionItems.push({
      label: 'University application deadline approaching',
      sub: `${nextDeadline.universityName} · ${fmtDays(nextDeadline.days)} left`,
      onClick: () => setLocation(`/fly/applications/${nextDeadline.id}`),
      urgent: nextDeadline.days <= 7,
    });
    const reqs: { done?: boolean }[] = (() => { try { return JSON.parse(nextDeadline.requirementsJson || '[]'); } catch { return []; } })();
    const incomplete = reqs.filter((r) => !r.done).length;
    if (incomplete > 0) {
      attentionItems.push({
        label: 'Missing application documents',
        sub: `${incomplete} item${incomplete > 1 ? 's' : ''} left for ${nextDeadline.universityName}`,
        onClick: () => setLocation(`/fly/applications/${nextDeadline.id}`),
      });
    }
  }
  if (upcomingScholarships[0] && upcomingScholarships[0].days <= 14) {
    attentionItems.push({
      label: 'Scholarship deadline approaching',
      sub: `${upcomingScholarships[0].name} · ${fmtDays(upcomingScholarships[0].days)} left`,
      onClick: () => setLocation(`/fly/scholarships/${upcomingScholarships[0].id}`),
      urgent: upcomingScholarships[0].days <= 7,
    });
  }
  if (streak === 0 && (studySessions as any[]).length > 0) {
    attentionItems.push({
      label: 'Study streak broken',
      sub: 'Log a session today to start a new streak',
      onClick: () => setLocation('/study/study'),
    });
  }

  const appCount = (applications as any[]).length;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--apps-bg-page)' }}>
      {/* Header — compact, existing brand identity preserved */}
      <header className="border-b" style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <defs>
                <linearGradient id="navbg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4338CA" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
              <rect width="64" height="64" rx="16" fill="url(#navbg)" />
              <path d="M46 12 L18 29 L25 32 L21 47 L28 40 L33 43 L54 20 Z" fill="white" opacity="0.95" />
            </svg>
            <span className="font-heading font-bold text-[15px] tracking-tight">Within a Few Weeks</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[13px] font-medium text-muted-foreground">{user?.name}</span>
            <button
              onClick={logout}
              className="text-[12.5px] font-medium px-3.5 py-1.5 rounded-full border transition-colors hover:bg-muted"
              style={{ borderColor: 'var(--apps-border)' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-7 sm:py-9 space-y-7">

          {/* Hero — personal, not a marketing landing page */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--apps-accent)' }}>
              Your Higher-Study Journey
            </p>
            <h1 className="font-heading font-bold text-[28px] sm:text-[32px] leading-tight tracking-tight mb-2">
              Within a Few Weeks
            </h1>
            <p className="text-[14px] text-muted-foreground max-w-xl">
              One place to prepare for IELTS, manage university applications, and stay on track toward your next academic goal.
            </p>
          </div>

          {/* Your Timeline — compact, real countdowns only */}
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2.5">Your Timeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatBlock
                icon={Flame}
                label="Study Streak"
                value={streak > 0 ? `${streak} ${streak === 1 ? 'day' : 'days'}` : 'Start today'}
                accent="orange"
                onClick={() => setLocation('/study/study')}
              />
              <StatBlock
                icon={CalendarClock}
                label="IELTS Exam"
                value={examDays === null ? 'Not set' : examDays < 0 ? 'Passed' : fmtDays(examDays)}
                accent="indigo"
                onClick={() => setLocation('/study/scores')}
              />
              <StatBlock
                icon={GraduationCap}
                label={nextDeadline ? `Apply · ${String(nextDeadline.universityName).slice(0, 18)}${String(nextDeadline.universityName).length > 18 ? '…' : ''}` : 'Next Deadline'}
                value={!nextDeadline ? 'None upcoming' : fmtDays(nextDeadline.days)}
                accent="teal"
                onClick={() => nextDeadline ? setLocation(`/fly/applications/${nextDeadline.id}`) : setLocation('/fly/applications')}
              />
            </div>
          </section>

          {/* Fly + Study — two modules of one ecosystem */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ModuleCard
              icon={Plane}
              name="Fly — Higher Study"
              description="Manage your university applications, scholarships, deadlines and application documents."
              metrics={[
                `${appCount} Application${appCount === 1 ? '' : 's'}`,
                ...(upcomingDeadlineCount > 0 ? [`${upcomingDeadlineCount} Upcoming Deadline${upcomingDeadlineCount === 1 ? '' : 's'}`] : []),
              ]}
              cta="Open Fly"
              accentColor="#6D5CE8"
              onClick={onFly}
            />
            <ModuleCard
              icon={BookOpenCheck}
              name="Study Journey"
              description="Prepare for IELTS with structured practice, progress tracking and vocabulary building."
              metrics={[
                ...(currentBand !== null ? [`Band ${currentBand.toFixed(1)}`] : []),
                ...(streak > 0 ? [`${streak}-day streak`] : []),
              ]}
              cta="Open Study"
              accentColor="#0D9488"
              onClick={onStudy}
            />
          </section>

          {/* What needs your attention — real data only, never fabricated */}
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2.5">What needs your attention</h2>
            {attentionItems.length === 0 ? (
              <div
                className="rounded-xl border px-4 py-3 text-[13px] text-muted-foreground flex items-center gap-2"
                style={{ borderColor: 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}
              >
                <CircleCheckBig className="h-4 w-4 text-emerald-500 shrink-0" /> All caught up.
              </div>
            ) : (
              <div className="space-y-2">
                {attentionItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                    style={{ borderColor: item.urgent ? 'var(--apps-deadline-urgent-text)' : 'var(--apps-border)', backgroundColor: 'var(--apps-bg-card)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{item.label}</p>
                      <p className="text-[12px] text-muted-foreground truncate">{item.sub}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions — only actions that already exist in the app */}
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2.5">Quick Actions</h2>
            <div className="flex flex-wrap gap-2">
              <QuickActionButton icon={Plus} label="Add Application" onClick={() => setLocation('/fly/applications')} />
              <QuickActionButton icon={BookOpen} label="Log Study Session" onClick={() => setLocation('/study/study')} />
              <QuickActionButton icon={BookMarked} label="Add Vocabulary" onClick={() => setLocation('/study/vocab')} />
              <QuickActionButton icon={Trophy} label="View Scholarships" onClick={() => setLocation('/fly/scholarships')} />
            </div>
          </section>

        </div>
      </main>

      <footer className="py-5 text-center">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50">
          Within a Few Weeks
        </p>
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
      className={`hidden md:flex flex-col ${collapsed ? 'w-[72px]' : 'w-64'} bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen shrink-0 transition-[width] duration-200 ease-out`}
    >
      <div className={`flex items-center gap-2 p-4 ${collapsed ? 'justify-center' : ''}`}>
        <button
          onClick={onBack}
          aria-label="Back to home"
          title="Back to home"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(var(--sidebar-primary) / 0.18)' }}>
              <ProductIcon className="w-4 h-4" style={{ color: 'hsl(var(--sidebar-primary))' }} />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-semibold text-[14px] leading-tight truncate">{productName}</p>
              <p className="text-[10.5px] text-sidebar-foreground/50 truncate">{productSubtitle}</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2.5 space-y-0.5 mt-1 overflow-y-auto">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const button = (
            <button
              key={tab.id}
              onClick={() => onTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 rounded-lg text-[13px] transition-colors ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'} ${
                isActive ? 'bg-sidebar-primary text-white font-medium' : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">{tab.label}</span>}
              {!collapsed && (tab.badge ?? 0) > 0 && (
                tab.badge === 1
                  ? <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  : <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white bg-red-500 shrink-0">{tab.badge}</span>
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
        className="flex items-center justify-center gap-2 mx-2.5 mb-3 h-8 rounded-lg text-sidebar-foreground/45 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-[11px] font-medium shrink-0"
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
      <SheetContent side="left" className="w-72 p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border [&_svg.absolute]:text-sidebar-foreground/60">
        <SheetTitle className="sr-only">{productName} navigation</SheetTitle>
        <div className="flex items-center gap-2.5 p-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(var(--sidebar-primary) / 0.18)' }}>
            <ProductIcon className="w-4 h-4" style={{ color: 'hsl(var(--sidebar-primary))' }} />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-[14px] leading-tight">{productName}</p>
            <p className="text-[10.5px] text-sidebar-foreground/50">{productSubtitle}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { onTab(tab.id); onOpenChange(false); }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${isActive ? 'bg-sidebar-primary text-white font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {(tab.badge ?? 0) > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white bg-red-500">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => { onOpenChange(false); onBack(); }}
          className="flex items-center gap-2 mx-2.5 mb-2 px-3 py-2.5 rounded-lg text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent transition-colors"
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
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onOpenMobileNav}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors hover:bg-accent text-muted-foreground"
            aria-label="Open navigation menu"
          >
            <Menu className="w-[18px] h-[18px]" />
          </button>
          <div className="min-w-0">
            <h1 className="font-heading font-semibold text-[15px] leading-tight truncate">{title}</h1>
            <p className="text-[11px] text-muted-foreground truncate hidden sm:block">{subtitle}</p>
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
