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
    indigo: { bg: '#ffffff', border: '#EAD4FB', text: '#684888', shadow: '0 2px 10px rgba(104, 72, 136, 0.08)' },
    teal:   { bg: '#ffffff', border: '#C2F8F1', text: '#108888', shadow: '0 2px 10px rgba(16, 136, 136, 0.08)' },
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
function LandingPage({ onFly, onStudy }: { onFly: () => void; onStudy: () => void }) {
  const { user, logout } = useAuth();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const { data: applications = [] } = useQuery({ queryKey: ['applications'], queryFn: api.getApplications });
  const { data: studySessions = [] } = useQuery({ queryKey: ['study-sessions'], queryFn: api.getStudySessions });

  const examDays = daysUntil((settings as any)?.examDate);
  const streak = calcStreak(studySessions as any[]);

  const nextDeadline = (applications as any[])
    .map((a: any) => ({ name: a.universityName, days: daysUntil(a.deadline) }))
    .filter(a => a.days !== null && a.days >= 0)
    .sort((a, b) => (a.days as number) - (b.days as number))[0] ?? null;

  const hasCountdowns = examDays !== null || nextDeadline !== null || streak > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #FCF6FF 0%, #F6F7FB 45%)' }}>

      {/* Top nav bar — sits above the hero image, always legible */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-3.5 bg-white border-b border-border">
        <div className="flex items-center gap-3">
          <img src="/images/logo-mark.png" alt="Within a Few Weeks" width="34" height="34" className="shrink-0" />
          <span className="font-bold text-[16px] tracking-tight text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Within a Few Weeks
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-[13px] font-medium text-muted-foreground">{user?.name}</span>
          <button
            onClick={logout}
            className="text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors hover:bg-muted bg-white border border-border text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Hero — the Nordic desk/fjord photo, with headline + countdowns overlaid */}
      <div className="relative w-full overflow-hidden" style={{ height: 'clamp(320px, 48vw, 460px)' }}>
        <img
          src="/images/hero-nordic.jpg"
          alt="A study desk overlooking a Nordic fjord town at sunset, with mountains, national flags, and a journal reading Plan: Learn, Explore, Grow, Inspire"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Gradient scrim for text legibility — darkest at the bottom, where the copy sits */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(8,10,26,0.92) 0%, rgba(8,10,26,0.55) 38%, rgba(8,10,26,0.05) 70%, rgba(8,10,26,0) 100%)' }}
        />

        <div className="relative z-10 flex h-full flex-col justify-end px-6 sm:px-10 pb-7 sm:pb-9">
          <div className="inline-flex w-fit items-center gap-2 px-3.5 py-1 rounded-full mb-3 text-[10.5px] font-bold tracking-widest uppercase"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#E9E3FF', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(4px)' }}>
            <span>🎯</span> Your IELTS &amp; Higher Study Platform
          </div>
          <h1 className="font-black leading-[1.08] mb-2 max-w-xl text-white"
            style={{ fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(2rem, 5vw, 3.2rem)', letterSpacing: '-0.02em', textShadow: '0 2px 20px rgba(0,0,0,0.35)' }}>
            Within a Few Weeks
          </h1>
          <p className="max-w-md text-[13.5px] sm:text-[14px] leading-relaxed text-white/80">
            One place to prepare for IELTS, manage university applications, and stay on track toward your next academic goal.
          </p>
        </div>
      </div>

      {/* Countdown strip — sits just below the hero, on the clean background */}
      <main className="flex-1 flex flex-col items-center px-5 sm:px-8 pt-7 pb-4">
        {hasCountdowns && (
          <div className="flex flex-wrap justify-center gap-4 -mt-2 mb-10">
            {streak > 0 && (
              <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl min-w-[120px] bg-white"
                style={{ border: '1px solid #ffedd5', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-600">
                  Study Streak
                </span>
                <span className="text-2xl font-black leading-none text-orange-600">
                  🔥 {streak} {streak === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}
            {examDays !== null && (
              <CountdownBadge
                label="IELTS Exam"
                days={examDays}
                color={examDays <= 7 ? 'amber' : 'indigo'}
              />
            )}
            {nextDeadline && (
              <CountdownBadge
                label={`Apply · ${(nextDeadline.name as string).slice(0, 18)}${(nextDeadline.name as string).length > 18 ? '…' : ''}`}
                days={nextDeadline.days as number}
                color={(nextDeadline.days as number) <= 7 ? 'amber' : 'teal'}
              />
            )}
          </div>
        )}

        {/* Cards */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 mb-12">

          {/* Fly card — Attention (purple) → Happiness (pink), from your reference image */}
          <button
            onClick={onFly}
            className="group relative text-left bg-white rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] border-y border-r border-border shadow-sm"
            style={{ borderLeftWidth: 4, borderLeftColor: '#684888' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(136,8,128,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-6 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #D8B0F8, #F8B8F8)' }}>
              ✈️
            </div>

            <h2 className="text-xl font-bold mb-2.5 text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Fly — Higher Study
            </h2>
            <p className="text-[13px] leading-relaxed mb-6 text-muted-foreground">
              University applications, scholarships, standardised test scores &amp; Erasmus-ready document templates.
            </p>

            <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#684888' }}>
              Start tracking
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>

          {/* Study Journey card — Energy (teal), from your reference image */}
          <button
            onClick={onStudy}
            className="group relative text-left bg-white rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] border-y border-r border-border shadow-sm"
            style={{ borderLeftWidth: 4, borderLeftColor: '#108888' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(16,136,136,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-6 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #78F0E0, #C8FBF2)' }}>
              📚
            </div>

            <h2 className="text-xl font-bold mb-2.5 text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Study Journey
            </h2>
            <p className="text-[13px] leading-relaxed mb-6 text-muted-foreground">
              Smart IELTS score tracking, structured practice logs, 1,000-word vocab bank &amp; daily mindset coaching.
            </p>

            <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#108888' }}>
              Begin journey
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>
        </div>

      </main>

      {/* Footer */}
      <footer className="text-center py-6">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
          Within a Few Weeks <span className="mx-2 text-muted-foreground/40">·</span> Erasmus <span className="mx-2 text-muted-foreground/40">·</span> Europe <span className="mx-2 text-muted-foreground/40">·</span> Beyond
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
