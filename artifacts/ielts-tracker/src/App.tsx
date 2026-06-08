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
import { BookOpen, BarChart3, LayoutDashboard, Target, Book, Brain, GraduationCap } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showConfetti, setShowConfetti] = useState(false);

  const tabs = [
    { id: 'dashboard',    label: 'Dashboard',        icon: LayoutDashboard },
    { id: 'scores',       label: 'Score Tracker',    icon: BarChart3 },
    { id: 'study',        label: 'Study Log',        icon: BookOpen },
    { id: 'practice',     label: 'Practice Tracker', icon: Target },
    { id: 'vocab',        label: 'Vocab Bank',       icon: Book },
    { id: 'higher-study', label: 'Higher Study',     icon: GraduationCap },
    { id: 'mindset',      label: 'Mindset',          icon: Brain },
  ];

  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex transition-colors duration-300">
      <Confetti active={showConfetti} />
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen overflow-y-auto">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center font-bold text-white font-heading shadow-inner">
            I
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-white">IELTS Journey</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm' 
                    : 'text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-card text-card-foreground border-b sticky top-0 z-40">
          <div className="px-4 sm:px-8 h-16 flex items-center justify-between">
            <h1 className="font-heading font-bold text-xl md:text-2xl text-navy dark:text-white">
              {activeTabLabel}
            </h1>
            <div className="flex items-center gap-2">
              <SettingsPanel />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard'    && <Dashboard />}
            {activeTab === 'scores'       && <ScoreTracker triggerConfetti={() => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000); }} />}
            {activeTab === 'study'        && <StudyLog />}
            {activeTab === 'practice'     && <PracticeTracker />}
            {activeTab === 'vocab'        && <VocabularyBank />}
            {activeTab === 'higher-study' && <HigherStudyPrep />}
            {activeTab === 'mindset'      && <MindsetCorner />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t flex justify-around p-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 rounded-lg min-w-[60px] transition-colors ${
                isActive ? 'text-teal' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] leading-tight font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;