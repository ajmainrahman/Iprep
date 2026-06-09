import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar as CalendarIcon, Edit2, PlayCircle, Headphones, MessageCircle, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const MOTIVATIONAL_QUOTES = [
  "Success is the sum of small efforts, repeated day in and day out.",
  "Your only limit is your mind.",
  "Don't stop until you're proud.",
  "Small daily improvements are the key to staggering long-term results.",
  "Believe you can and you're halfway there.",
  "You don't have to be great to start, but you have to start to be great.",
  "Dream big and dare to fail.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Wake up with determination. Go to bed with satisfaction."
];

export function Dashboard() {
  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const { data: scores = [], isLoading: scoresLoading } = useQuery({ queryKey: ['scores'], queryFn: api.getScores });
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({ queryKey: ['study-sessions'], queryFn: api.getStudySessions });

  if (settingsLoading || scoresLoading || sessionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  const getDaysRemaining = () => {
    if (!settings?.examDate) return 0;
    const today = new Date();
    const exam = new Date(settings.examDate);
    const diffTime = Math.max(0, exam.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const quote = MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];

  // Calculate Overall Band
  const latestScores: Record<string, number> = {};
  ['Reading', 'Writing', 'Speaking', 'Listening'].forEach(mod => {
    const modScores = scores.filter((s: any) => s.module === mod).sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    latestScores[mod] = modScores.length > 0 ? modScores[0].band : 0;
  });
  
  const totalScores = Object.values(latestScores).filter(s => s > 0);
  const overallBand = totalScores.length === 4 ? (totalScores.reduce((a, b) => a + b, 0) / 4) : 0;
  
  const targets = settings?.targets || { Reading: 7, Listening: 7, Writing: 7, Speaking: 7 };
  const overallTarget = Object.values(targets).reduce((a: any, b: any) => a + b, 0) / 4;

  const getDaysColor = (days: number) => {
    if (days > 30) return 'text-green-500 bg-green-50';
    if (days > 15) return 'text-yellow-500 bg-yellow-50';
    return 'text-red-500 bg-red-50';
  };
  
  const getProgressColor = (days: number) => {
    if (days > 30) return '[&>div]:bg-green-500';
    if (days > 15) return '[&>div]:bg-yellow-500';
    return '[&>div]:bg-red-500';
  };

  const getRoutineTask = (daysLeft: number) => {
    if (daysLeft > 28) return { phase: "Foundation", desc: "Focus on question type drills and building vocabulary.", color: "text-blue-600" };
    if (daysLeft > 14) return { phase: "Mixed Practice", desc: "Start doing timed passages and applying strategies.", color: "text-purple-600" };
    if (daysLeft > 7) return { phase: "Mock Tests", desc: "Do full timed tests to build stamina.", color: "text-coral" };
    return { phase: "Final Polish", desc: "Light review, rest well, and trust your preparation.", color: "text-teal" };
  };

  const task = getRoutineTask(daysRemaining);

  const getModuleConfig = (mod: string) => {
    switch(mod) {
      case 'Reading': return { color: 'text-coral', bg: 'bg-coral/10', border: 'border-coral', bar: '[&>div]:bg-coral', icon: BookOpen };
      case 'Writing': return { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-500', bar: '[&>div]:bg-green-500', icon: Edit2 };
      case 'Speaking': return { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-500', bar: '[&>div]:bg-purple-500', icon: MessageCircle };
      case 'Listening': return { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-500', bar: '[&>div]:bg-yellow-500', icon: Headphones };
      default: return { color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-500', bar: '[&>div]:bg-gray-500', icon: Target };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2B406A] rounded-2xl p-8 shadow-lg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-coral opacity-20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <p className="text-teal font-medium tracking-wide mb-1 uppercase text-sm">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
            Welcome back, {settings?.name || 'Student'}! Keep going.
          </h1>
          <div className="bg-white/10 border border-white/20 rounded-lg p-4 inline-block backdrop-blur-md">
            <p className="text-white/90 italic font-serif">"{quote}"</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Days Remaining */}
        <Card className="col-span-1 shadow-sm hover-elevate transition-all border-none">
          <CardContent className={`p-6 h-full flex flex-col justify-center ${getDaysColor(daysRemaining).split(' ')[1]} rounded-xl border border-transparent`}>
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className={`w-5 h-5 ${getDaysColor(daysRemaining).split(' ')[0]}`} />
              <h3 className="font-semibold text-lg text-gray-800">Exam Countdown</h3>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-5xl font-heading font-bold mb-1 tracking-tight text-gray-900">
                {daysRemaining}
              </div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-4">Days left</p>
              <Progress value={Math.min(100, Math.max(0, (90 - daysRemaining) / 90 * 100))} className={`h-2.5 bg-black/10 ${getProgressColor(daysRemaining)}`} />
            </div>
          </CardContent>
        </Card>

        {/* Overall Band */}
        <Card className="col-span-1 shadow-sm hover-elevate transition-all border-none">
          <CardContent className="p-6 h-full flex flex-col justify-center items-center text-center bg-card rounded-xl">
             <h3 className="font-semibold text-lg text-foreground mb-4 w-full text-left">Overall Band</h3>
             <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#E5E7EB" strokeWidth="12" className="dark:stroke-gray-800" />
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#2EC4B6" strokeWidth="12" strokeDasharray="351.8" strokeDashoffset={351.8 - (351.8 * Math.min(100, overallTarget > 0 ? (overallBand / overallTarget) * 100 : 0)) / 100} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
                </svg>
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-bold text-foreground">{overallBand.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground font-medium">Target: {overallTarget.toFixed(1)}</span>
                </div>
             </div>
          </CardContent>
        </Card>
        
        {/* Today's Task */}
        <Card className="col-span-1 md:col-span-1 shadow-sm hover-elevate transition-all border-none">
          <CardContent className="p-6 h-full flex flex-col bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] dark:from-gray-900 dark:to-gray-800 rounded-xl border border-gray-100 dark:border-gray-800">
             <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-5 h-5 text-teal" />
              <h3 className="font-semibold text-lg text-foreground">Today's Focus</h3>
             </div>
             <div className="flex-1 flex flex-col justify-center">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 w-max bg-white dark:bg-gray-800 shadow-sm ${task.color}`}>{task.phase}</span>
                <p className="text-muted-foreground font-medium leading-relaxed">{task.desc}</p>
             </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mt-8 mb-4 border-l-4 border-teal pl-3">
        <h2 className="text-2xl font-heading font-bold text-foreground">Module Progress</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Reading', 'Listening', 'Writing', 'Speaking'].map((mod) => {
          const target = targets[mod as keyof typeof targets] || 0;
          const current = latestScores[mod] || 0;
          const progress = Math.min(100, target > 0 ? (current / target) * 100 : 0);
          const config = getModuleConfig(mod);
          const Icon = config.icon;
          
          return (
            <Card key={mod} className={`overflow-hidden shadow-sm hover-elevate border-t-4 ${config.border}`}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-foreground">{mod}</h3>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-xl ${config.color}`}>{current > 0 ? current.toFixed(1) : '-'}</div>
                    <div className="text-xs text-muted-foreground font-medium">of {target.toFixed(1)}</div>
                  </div>
                </div>
                <Progress value={progress} className={`h-2 bg-muted ${config.bar}`} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}