import React, { useState } from 'react';
import { Dashboard } from '@/pages/Dashboard';
import { ScoreTracker } from '@/pages/ScoreTracker';
import { StudyLog } from '@/pages/StudyLog';
import { PracticeTracker } from '@/pages/PracticeTracker';
import { VocabularyBank } from '@/pages/VocabularyBank';
import { MindsetCorner } from '@/pages/MindsetCorner';
import { HigherStudyPrep } from '@/pages/HigherStudyPrep';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Confetti } from '@/components/Confetti';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

type AppMode  = 'home' | 'fly' | 'study';
type FlyTab   = 'overview' | 'applications' | 'tests' | 'scholarships' | 'templates';
type StudyTab = 'dashboard' | 'scores' | 'study' | 'practice' | 'vocab' | 'mindset';

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
];

/* ─── LANDING PAGE ──────────────────────────────────────────────────────── */
function LandingPage({ onFly, onStudy }: { onFly: () => void; onStudy: () => void }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-12"
      style={{ background: 'linear-gradient(135deg, #06091a 0%, #0e1245 38%, #051a14 72%, #080c1e 100%)' }}
    >
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full blur-3xl opacity-[0.18]"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[700px] h-[700px] rounded-full blur-3xl opacity-[0.18]"
          style={{ background: 'radial-gradient(circle, #14b8a6, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full blur-3xl opacity-[0.06]"
          style={{ background: 'radial-gradient(ellipse, #818cf8, transparent 65%)' }}
        />
      </div>

      {/* Logo + tagline */}
      <header className="relative z-10 text-center mb-14">
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="text-5xl sm:text-6xl">✈️</span>
          <h1
            className="text-5xl sm:text-6xl font-bold tracking-tight leading-none"
            style={{ fontFamily: "'Poppins', sans-serif", color: '#fff' }}
          >
            FlyStudy
          </h1>
        </div>
        <p
          className="text-sm sm:text-base tracking-[0.2em] uppercase mt-2"
          style={{ color: 'rgba(255,255,255,0.32)' }}
        >
          Your passport to higher education
        </p>

        {/* Erasmus countries */}
        <div className="flex items-center justify-center gap-5 sm:gap-7 mt-8 flex-wrap">
          {[
            { flag: '🇩🇰', name: 'Denmark' },
            { flag: '🇫🇮', name: 'Finland' },
            { flag: '🇳🇴', name: 'Norway' },
            { flag: '🇸🇪', name: 'Sweden' },
          ].map(({ flag, name }) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <span className="text-3xl">{flag}</span>
              <span className="text-[10px] tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {name}
              </span>
            </div>
          ))}
          <div
            className="ml-1 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide"
            style={{
              background: 'rgba(99,102,241,0.15)',
              color: '#a5b4fc',
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            ✦ Erasmus Ready
          </div>
        </div>
      </header>

      {/* Hero cards */}
      <main className="relative z-10 w-full max-w-2xl flex flex-col sm:flex-row gap-5">
        {/* Fly */}
        <button
          onClick={onFly}
          className="flex-1 group relative overflow-hidden rounded-3xl p-9 sm:p-10 text-left transition-all duration-300 hover:scale-[1.03] active:scale-[0.99]"
          style={{
            background: 'rgba(99,102,241,0.07)',
            border: '1px solid rgba(99,102,241,0.28)',
            boxShadow: '0 0 60px rgba(99,102,241,0.06)',
          }}
        >
          <div
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))' }}
          />
          <div className="relative z-10">
            <div className="text-5xl mb-6">✈️</div>
            <h2
              className="text-3xl font-bold mb-2.5 leading-snug"
              style={{ fontFamily: "'Poppins', sans-serif", color: '#fff' }}
            >
              Fly
            </h2>
            <p className="text-[13px] leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.52)' }}>
              Track university applications, scholarships &amp; standardised tests. Built for Erasmus, Nordic and global programmes.
            </p>
            <span
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#a5b4fc' }}
            >
              Start tracking
              <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </span>
          </div>
        </button>

        {/* Study Journey */}
        <button
          onClick={onStudy}
          className="flex-1 group relative overflow-hidden rounded-3xl p-9 sm:p-10 text-left transition-all duration-300 hover:scale-[1.03] active:scale-[0.99]"
          style={{
            background: 'rgba(20,184,166,0.07)',
            border: '1px solid rgba(20,184,166,0.28)',
            boxShadow: '0 0 60px rgba(20,184,166,0.06)',
          }}
        >
          <div
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.18), rgba(16,185,129,0.12))' }}
          />
          <div className="relative z-10">
            <div className="text-5xl mb-6">📚</div>
            <h2
              className="text-3xl font-bold mb-2.5 leading-snug"
              style={{ fontFamily: "'Poppins', sans-serif", color: '#fff' }}
            >
              Study Journey
            </h2>
            <p className="text-[13px] leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.52)' }}>
              Master IELTS with smart score tracking, structured practice, a 1,000-word vocab bank &amp; daily mindset coaching.
            </p>
            <span
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#5eead4' }}
            >
              Begin journey
              <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </span>
          </div>
        </button>
      </main>

      <footer className="relative z-10 mt-14 text-center">
        <p className="text-[11px] tracking-[0.25em] uppercase" style={{ color: 'rgba(255,255,255,0.14)' }}>
          Erasmus · Nordics · Europe · Beyond
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
              style={{
                background: 'rgba(99,102,241,0.22)',
                border: '1px solid rgba(99,102,241,0.35)',
              }}
            >
              ✈️
            </div>
            <div>
              <p className="font-bold text-[17px] text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Fly
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>Higher Study Prep</p>
            </div>
          </div>
        }
        bottomWidget={
          <div
            className="p-4 rounded-2xl"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.32)' }}>
              Erasmus Countries
            </p>
            <div className="flex gap-2 text-xl">🇩🇰 🇫🇮 🇳🇴 🇸🇪</div>
          </div>
        }
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-5 sm:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl md:hidden">✈️</span>
              <div>
                <h1 className="font-bold text-[17px] leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {pageTitle}
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">Higher Study · FlyStudy</p>
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

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-1.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
        {FLY_TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center py-1.5 px-2 rounded-xl min-w-[44px] transition-colors ${
                isActive ? 'text-indigo-500' : 'text-muted-foreground'
              }`}
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
              <p className="font-bold text-[17px] text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Study
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>IELTS Journey</p>
            </div>
          </div>
        }
        bottomWidget={
          <div
            className="p-4 rounded-2xl text-center"
            style={{ background: 'rgba(46,196,182,0.1)', border: '1px solid rgba(46,196,182,0.2)' }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.32)' }}>
              IELTS Target
            </p>
            <p className="text-2xl font-bold text-teal">7.0+</p>
          </div>
        }
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border sticky top-0 z-40">
          <div className="px-4 sm:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl md:hidden">📚</span>
              <div>
                <h1 className="font-bold text-[17px] leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {pageTitle}
                </h1>
                <p className="text-[11px] text-muted-foreground hidden sm:block">IELTS Journey · FlyStudy</p>
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
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-1.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40">
        {STUDY_TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center py-1.5 px-2 rounded-xl min-w-[44px] transition-colors ${
                isActive ? 'text-teal' : 'text-muted-foreground'
              }`}
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
