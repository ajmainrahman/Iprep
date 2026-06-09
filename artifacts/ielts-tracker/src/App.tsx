import React, { useState } from 'react';
import { Dashboard } from '@/pages/Dashboard';
import { ScoreTracker } from '@/pages/ScoreTracker';
import { StudyLog } from '@/pages/StudyLog';
import { PracticeTracker } from '@/pages/PracticeTracker';
import { VocabularyBank } from '@/pages/VocabularyBank';
import { MindsetCorner } from '@/pages/MindsetCorner';
import { ExamTimer } from '@/pages/ExamTimer';
import { HigherStudyPrep } from '@/pages/HigherStudyPrep';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Confetti } from '@/components/Confetti';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
type FlyTab   = 'overview' | 'applications' | 'tests' | 'scholarships' | 'templates';
type StudyTab = 'dashboard' | 'scores' | 'study' | 'practice' | 'vocab' | 'mindset' | 'timer';

const FLY_TABS: { id: FlyTab; label: string; emoji: string }[] = [
  { id: 'overview',     label: 'Overview',       emoji: '🗺️' },
  { id: 'applications', label: 'Applications',   emoji: '🎓' },
  { id: 'tests',        label: 'Test Scores',    emoji: '📊' },
  { id: 'scholarships', label: 'Scholarships',   emoji: '🏆' },
  { id: 'templates',    label: 'Doc Templates',  emoji: '📋' },
];

const STUDY_TABS: { id: StudyTab; label: string; emoji: string }[] = [
  { id: 'dashboard', label: 'Dashboard',        emoji: '🏠' },
  { id: 'scores',    label: 'Score Tracker',    emoji: '📈' },
  { id: 'study',     label: 'Study Log',        emoji: '📖' },
  { id: 'practice',  label: 'Practice Tracker', emoji: '🎯' },
  { id: 'vocab',     label: 'Vocab Bank',       emoji: '🔤' },
  { id: 'mindset',   label: 'Mindset',          emoji: '🧘' },
  { id: 'timer',     label: 'Exam Timer',       emoji: '⏱️' },
];

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
    indigo: { bg: '#ede9fe', border: '#ddd6fe', text: '#4f46e5' },
    teal:   { bg: '#ccfbf1', border: '#99f6e4', text: '#0d9488' },
    amber:  { bg: '#fef3c7', border: '#fde68a', text: '#d97706' },
  };
  const p = palettes[color];
  const display =
    days === 0 ? 'Today!' :
    days > 0   ? `${days} day${days === 1 ? '' : 's'}` :
                 `${Math.abs(days)}d ago`;
  const urgent = days >= 0 && days <= 7;
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl min-w-[120px]"
      style={{ background: p.bg, border: `1.5px solid ${p.border}` }}>
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: p.text }}>{label}</span>
      <span className="text-2xl font-black leading-none" style={{ color: p.text }}>
        {urgent && days >= 0 ? '⚡ ' : ''}{display}
      </span>
    </div>
  );
}

/* ─── LANDING PAGE ──────────────────────────────────────────────────────── */
function LandingPage({ onFly, onStudy }: { onFly: () => void; onStudy: () => void }) {
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
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#fafbff' }}>

      {/* Decorative background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #e0e7ff 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #ccfbf1 0%, transparent 70%)' }} />
        <svg className="absolute top-0 left-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Top nav bar */}
      <nav className="relative z-10 flex items-center px-6 sm:px-10 pt-6 pb-2">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <svg width="36" height="36" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <defs>
              <linearGradient id="navbg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4f46e5"/>
                <stop offset="55%" stopColor="#7c3aed"/>
                <stop offset="100%" stopColor="#0d9488"/>
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="url(#navbg)"/>
            <path d="M46 12 L18 29 L25 32 L21 47 L28 40 L33 43 L54 20 Z" fill="white" opacity="0.95"/>
            <circle cx="17" cy="49" r="2.5" fill="white" opacity="0.4"/>
            <circle cx="11" cy="54" r="1.5" fill="white" opacity="0.25"/>
          </svg>
          <span className="font-bold text-base tracking-tight" style={{ fontFamily: "'Poppins', sans-serif", color: '#1e1b4b' }}>
            Within a Few Weeks
          </span>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 px-5 sm:px-8 pt-10 pb-4 text-center">

        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold tracking-wide"
          style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
          <span>🎯</span> Your IELTS &amp; Higher Study Platform
        </div>

        {/* Main headline */}
        <h1 className="font-black leading-[1.05] mb-5 max-w-2xl"
          style={{ fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(2.4rem, 7vw, 4.5rem)' }}>
          <span style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #0d9488 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Within a Few Weeks
          </span>
        </h1>

        {/* Countdown timers + Streak */}
        {hasCountdowns && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {/* Study streak badge */}
            {streak > 0 && (
              <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl min-w-[120px]"
                style={{ background: '#fff7ed', border: '1.5px solid #fed7aa' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#ea580c' }}>
                  Study Streak
                </span>
                <span className="text-2xl font-black leading-none" style={{ color: '#ea580c' }}>
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
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-10">

          {/* Fly card */}
          <button
            onClick={onFly}
            className="group relative text-left rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f5f3ff 100%)',
              border: '1.5px solid #e0e7ff',
              boxShadow: '0 4px 24px rgba(99,102,241,0.08)',
            }}
          >
            {/* Coloured accent bar at top */}
            <div className="absolute top-0 left-6 right-6 h-[3px] rounded-b-full"
              style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />

            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
              ✈️
            </div>

            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: '#1e1b4b' }}>
              Fly — Higher Study
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#6b7280' }}>
              University applications, scholarships, standardised test scores &amp; Erasmus-ready document templates.
            </p>

            <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#4f46e5' }}>
              Start tracking
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>

          {/* Study Journey card */}
          <button
            onClick={onStudy}
            className="group relative text-left rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f0fdfa 100%)',
              border: '1.5px solid #ccfbf1',
              boxShadow: '0 4px 24px rgba(13,148,136,0.08)',
            }}
          >
            {/* Coloured accent bar at top */}
            <div className="absolute top-0 left-6 right-6 h-[3px] rounded-b-full"
              style={{ background: 'linear-gradient(90deg, #0d9488, #059669)' }} />

            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #ccfbf1, #a7f3d0)' }}>
              📚
            </div>

            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif", color: '#1e1b4b' }}>
              Study Journey
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: '#6b7280' }}>
              Smart IELTS score tracking, structured practice logs, 1,000-word vocab bank &amp; daily mindset coaching.
            </p>

            <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#0d9488' }}>
              Begin journey
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
          </button>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-5">
        <p className="text-[11px] tracking-[0.15em] uppercase" style={{ color: '#d1d5db' }}>
          Within a Few Weeks · Erasmus · Europe · Beyond
        </p>
      </footer>
    </div>
  );
}

/* ─── SHARED SIDEBAR SHELL ──────────────────────────────────────────────── */
interface SidebarProps<T extends string> {
  tabs: { id: T; label: string; emoji: string }[];
  activeTab: T;
  onTab: (t: T) => void;
  onBack: () => void;
  logo: React.ReactNode;
  bottomWidget?: React.ReactNode;
}

function AppSidebar<T extends string>({ tabs, activeTab, onTab, onBack, logo, bottomWidget }: SidebarProps<T>) {
  return (
    <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen overflow-y-auto shrink-0">
      <div className="p-5 pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] mb-6 transition-opacity hover:opacity-70"
          style={{ color: 'rgba(255,255,255,0.38)' }}
        >
          ← Home
        </button>
        {logo}
      </div>

      <nav className="flex-1 px-3 space-y-0.5 mt-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm'
                  : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              }`}
            >
              <span className="text-base">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {bottomWidget && <div className="m-3">{bottomWidget}</div>}
    </aside>
  );
}

/* ─── FLY LAYOUT (Higher Study) ─────────────────────────────────────────── */
function FlyLayout({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<FlyTab>('overview');
  const pageTitle = FLY_TABS.find(t => t.id === tab)?.label ?? 'Overview';

  return (
    <div className="fly-mode min-h-screen bg-background text-foreground font-sans flex">
      <AppSidebar
        tabs={FLY_TABS}
        activeTab={tab}
        onTab={setTab}
        onBack={onBack}
        logo={
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner"
              style={{ background: 'rgba(99,102,241,0.22)', border: '1px solid rgba(99,102,241,0.35)' }}
            >
              ✈️
            </div>
            <div>
              <p className="font-bold text-[15px] text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Fly
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.38)' }}>Higher Study Prep</p>
            </div>
          </div>
        }
        bottomWidget={
          <div className="p-3 rounded-2xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.32)' }}>Erasmus</p>
            <div className="flex gap-1.5 text-lg">🇩🇰 🇫🇮 🇳🇴 🇸🇪</div>
          </div>
        }
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-4 sm:px-8 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile back button */}
              <button
                onClick={onBack}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-colors hover:bg-accent"
                aria-label="Back to home"
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xl hidden xs:inline md:hidden">✈️</span>
              <div className="min-w-0">
                <h1 className="font-bold text-[17px] leading-tight truncate" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {pageTitle}
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">Higher Study · Within a Few Weeks</p>
              </div>
            </div>
            <SettingsPanel />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto">
            <HigherStudyPrep tab={tab} onTabChange={(t) => setTab(t as FlyTab)} />
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-1.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
        {FLY_TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex flex-col items-center py-1.5 px-2 rounded-xl min-w-[44px] transition-colors ${isActive ? 'text-indigo-500' : 'text-muted-foreground'}`}
            >
              <span className="text-[15px] mb-0.5">{t.emoji}</span>
              <span className="text-[8px] leading-tight font-medium">{t.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ─── STUDY LAYOUT (IELTS) ──────────────────────────────────────────────── */
function StudyLayout({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<StudyTab>('dashboard');
  const [confetti, setConfetti] = useState(false);
  const pageTitle = STUDY_TABS.find(t => t.id === tab)?.label ?? 'Dashboard';

  function fireConfetti() {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3200);
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex">
      <Confetti active={confetti} />

      <AppSidebar
        tabs={STUDY_TABS}
        activeTab={tab}
        onTab={setTab}
        onBack={onBack}
        logo={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal flex items-center justify-center text-lg shadow-inner">
              📚
            </div>
            <div>
              <p className="font-bold text-[15px] text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Study
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.38)' }}>IELTS Journey</p>
            </div>
          </div>
        }
        bottomWidget={
          <div className="p-3 rounded-2xl text-center" style={{ background: 'rgba(46,196,182,0.1)', border: '1px solid rgba(46,196,182,0.2)' }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>IELTS Target</p>
            <p className="text-2xl font-bold text-teal">7.0+</p>
          </div>
        }
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-4 sm:px-8 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile back button */}
              <button
                onClick={onBack}
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-xl shrink-0 transition-colors hover:bg-accent"
                aria-label="Back to home"
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xl hidden xs:inline md:hidden">📚</span>
              <div className="min-w-0">
                <h1 className="font-bold text-[17px] leading-tight truncate" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {pageTitle}
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">IELTS Journey · Within a Few Weeks</p>
              </div>
            </div>
            <SettingsPanel />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-5xl mx-auto">
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'scores'    && <ScoreTracker triggerConfetti={fireConfetti} />}
            {tab === 'study'     && <StudyLog />}
            {tab === 'practice'  && <PracticeTracker />}
            {tab === 'vocab'     && <VocabularyBank />}
            {tab === 'mindset'   && <MindsetCorner />}
            {tab === 'timer'     && <ExamTimer />}
          </div>
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-1.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
        {STUDY_TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex flex-col items-center py-1.5 px-2 rounded-xl min-w-[44px] transition-colors ${isActive ? 'text-teal' : 'text-muted-foreground'}`}
            >
              <span className="text-[15px] mb-0.5">{t.emoji}</span>
              <span className="text-[8px] leading-tight font-medium">{t.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ─── MAIN APP ──────────────────────────────────────────────────────────── */
function MainApp() {
  const [mode, setMode] = useState<AppMode>('home');
  if (mode === 'fly')   return <FlyLayout   onBack={() => setMode('home')} />;
  if (mode === 'study') return <StudyLayout onBack={() => setMode('home')} />;
  return <LandingPage onFly={() => setMode('fly')} onStudy={() => setMode('study')} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
