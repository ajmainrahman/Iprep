import React, { useState } from 'react';
import { Dashboard } from '@/pages/Dashboard';
import { ScoreTracker } from '@/pages/ScoreTracker';
import { StudyLog } from '@/pages/StudyLog';
import { QuestionPractice } from '@/pages/QuestionPractice';
import { VocabularyBank } from '@/pages/VocabularyBank';
import { MindsetCorner } from '@/pages/MindsetCorner';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Confetti } from '@/components/Confetti';
import { AppProvider, useApp } from '@/lib/store';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BookOpen, BarChart3, LayoutDashboard, Target, Book, Brain } from 'lucide-react';

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { showConfetti } = useApp();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scores', label: 'Score Tracker', icon: BarChart3 },
    { id: 'study', label: 'Study Log', icon: BookOpen },
    { id: 'practice', label: 'Practice', icon: Target },
    { id: 'vocab', label: 'Vocab Bank', icon: Book },
    { id: 'mindset', label: 'Mindset', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors duration-300">
      <Confetti active={showConfetti} />
      
      <header className="bg-navy text-white shadow-md sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center font-bold text-white font-heading shadow-inner">
              I
            </div>
            <span className="font-heading font-bold text-xl tracking-tight hidden sm:block">IELTS Journey</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-md flex items-center gap-2 transition-all duration-200 ${activeTab === tab.id ? 'bg-teal text-white font-medium shadow-sm' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              )
            })}
          </nav>
          
          <div className="flex items-center gap-2">
            <SettingsPanel />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'scores' && <ScoreTracker />}
        {activeTab === 'study' && <StudyLog />}
        {activeTab === 'practice' && <QuestionPractice />}
        {activeTab === 'vocab' && <VocabularyBank />}
        {activeTab === 'mindset' && <MindsetCorner />}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 transition-colors duration-300">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 rounded-lg min-w-[60px] transition-colors ${activeTab === tab.id ? 'text-teal' : 'text-muted-foreground hover:text-foreground'}`}
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
    <AppProvider>
      <TooltipProvider>
        <MainApp />
        <Toaster />
      </TooltipProvider>
    </AppProvider>
  );
}

export default App;