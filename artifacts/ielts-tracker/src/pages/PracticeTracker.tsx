import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Target, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const READING_TYPES = [
  { id: 'True/False/Not Given', name: 'True / False / Not Given', icon: '🔍', color: 'bg-coral text-white', accent: 'text-coral', bar: '[&>div]:bg-coral' },
  { id: 'Yes/No/Not Given', name: 'Yes / No / Not Given', icon: '💬', color: 'bg-purple-600 text-white', accent: 'text-purple-600', bar: '[&>div]:bg-purple-600' },
  { id: 'Summary/Gap Fill', name: 'Summary / Gap Fill', icon: '✏️', color: 'bg-teal text-white', accent: 'text-teal', bar: '[&>div]:bg-teal' },
  { id: 'Matching Headings', name: 'Matching Headings', icon: '📑', color: 'bg-green-500 text-white', accent: 'text-green-500', bar: '[&>div]:bg-green-500' },
  { id: 'Matching Information', name: 'Matching Information', icon: '🔗', color: 'bg-yellow-400 text-gray-900', accent: 'text-yellow-600', bar: '[&>div]:bg-yellow-400' },
  { id: 'Multiple Choice', name: 'Multiple Choice', icon: '✅', color: 'bg-navy text-white', accent: 'text-navy', bar: '[&>div]:bg-navy' },
  { id: 'Sentence Completion', name: 'Sentence Completion', icon: '🔤', color: 'bg-orange-500 text-white', accent: 'text-orange-500', bar: '[&>div]:bg-orange-500' },
];

const LISTENING_PARTS = [
  { id: 'Part 1', name: 'Part 1: Form/note completion (everyday social)', icon: '📝', color: 'bg-teal text-white' },
  { id: 'Part 2', name: 'Part 2: Monologue (non-academic)', icon: '🎙️', color: 'bg-purple-500 text-white' },
  { id: 'Part 3', name: 'Part 3: Discussion (academic, multiple speakers)', icon: '👥', color: 'bg-coral text-white' },
  { id: 'Part 4', name: 'Part 4: Academic lecture', icon: '🎓', color: 'bg-navy text-white' },
];

const WRITING_TASKS = [
  { id: 'Task 1', name: 'Task 1: Graph/chart/diagram description', icon: '📊', color: 'bg-green-500 text-white', detail: '150 words, 20 min' },
  { id: 'Task 2', name: 'Task 2: Essay', icon: '📝', color: 'bg-blue-600 text-white', detail: '250 words, 40 min' },
];

const SPEAKING_PARTS = [
  { id: 'Part 1', name: 'Part 1: Introduction/Interview', icon: '👋', color: 'bg-yellow-500 text-white', detail: '4-5 min' },
  { id: 'Part 2', name: 'Part 2: Individual long turn / Cue Card', icon: '⏱️', color: 'bg-orange-500 text-white', detail: '3-4 min' },
  { id: 'Part 3', name: 'Part 3: Two-way discussion', icon: '🗣️', color: 'bg-red-500 text-white', detail: '4-5 min' },
];

export function PracticeTracker() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'Reading' | 'Listening' | 'Writing' | 'Speaking'>('Reading');
  
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['practice-logs'], queryFn: api.getPracticeLogs });
  const qc = useQueryClient();
  const addLog = useMutation({
    mutationFn: api.addPracticeLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['practice-logs'] }),
  });

  const [logModalOpen, setLogModalOpen] = useState(false);
  const [activeSubtype, setActiveSubtype] = useState('');
  const [activeIcon, setActiveIcon] = useState('');
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('');
  const [notes, setNotes] = useState('');

  const openLogModal = (subType: string, icon: string) => {
    setActiveSubtype(subType);
    setActiveIcon(icon);
    setScore('');
    setTotal('');
    setNotes('');
    setLogModalOpen(true);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numScore = Number(score);
    const numTotal = Number(total);
    
    if (['Reading', 'Listening'].includes(activeTab) && numScore > numTotal) {
      toast({ title: "Error", description: "Score cannot be higher than total questions.", variant: "destructive" });
      return;
    }

    addLog.mutate({
      date,
      module: activeTab,
      subType: activeSubtype,
      score: numScore,
      totalQuestions: ['Reading', 'Listening'].includes(activeTab) ? numTotal : null,
      notes
    }, {
      onSuccess: () => {
        setLogModalOpen(false);
        toast({ title: "Logged successfully", description: `Added practice for ${activeSubtype}` });
      }
    });
  };

  // Reading Stats
  const readingStats = READING_TYPES.map(type => {
    const typeLogs = logs.filter((l: any) => l.module === 'Reading' && l.subType === type.id);
    const attempts = typeLogs.length;
    let avgAccuracy = 0;
    let bestScoreStr = '-';
    
    if (attempts > 0) {
      const totalScore = typeLogs.reduce((sum: number, l: any) => sum + l.score, 0);
      const totalQuestions = typeLogs.reduce((sum: number, l: any) => sum + l.totalQuestions, 0);
      avgAccuracy = totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0;
      
      const best = [...typeLogs].sort((a: any, b: any) => (b.score/b.totalQuestions) - (a.score/a.totalQuestions))[0];
      bestScoreStr = `${best.score}/${best.totalQuestions}`;
    }
    return { ...type, attempts, avgAccuracy, bestScoreStr };
  });

  const radarData = readingStats.map(s => ({
    subject: s.name.split(' ')[0], // short name
    accuracy: Math.round(s.avgAccuracy),
    fullMark: 100
  }));

  // Listening Stats
  const listeningStats = LISTENING_PARTS.map(part => {
    const partLogs = logs.filter((l: any) => l.module === 'Listening' && l.subType === part.id);
    const attempts = partLogs.length;
    let avgScore = 0;
    let bestScore = 0;

    if (attempts > 0) {
      avgScore = partLogs.reduce((sum: number, l: any) => sum + l.score, 0) / attempts;
      bestScore = Math.max(...partLogs.map((l: any) => l.score));
    }
    return { ...part, attempts, avgScore, bestScore };
  });

  const listeningChartData = listeningStats.map(s => ({
    name: s.id,
    avgScore: Number(s.avgScore.toFixed(1))
  }));

  // Writing Stats
  const writingStats = WRITING_TASKS.map(task => {
    const taskLogs = logs.filter((l: any) => l.module === 'Writing' && l.subType === task.id);
    const attempts = taskLogs.length;
    let avgBand = 0;
    let bestBand = 0;

    if (attempts > 0) {
      avgBand = taskLogs.reduce((sum: number, l: any) => sum + l.score, 0) / attempts;
      bestBand = Math.max(...taskLogs.map((l: any) => l.score));
    }
    return { ...task, attempts, avgBand, bestBand };
  });

  // Prepare writing chart data
  const writingChartDataMap = new Map<string, any>();
  logs.filter((l: any) => l.module === 'Writing').sort((a: any,b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach((l: any) => {
    if (!writingChartDataMap.has(l.date)) writingChartDataMap.set(l.date, { date: l.date });
    writingChartDataMap.get(l.date)[l.subType] = l.score;
  });
  const writingChartData = Array.from(writingChartDataMap.values());

  // Speaking Stats
  const speakingStats = SPEAKING_PARTS.map(part => {
    const partLogs = logs.filter((l: any) => l.module === 'Speaking' && l.subType === part.id);
    const attempts = partLogs.length;
    let avgBand = 0;
    let bestBand = 0;

    if (attempts > 0) {
      avgBand = partLogs.reduce((sum: number, l: any) => sum + l.score, 0) / attempts;
      bestBand = Math.max(...partLogs.map((l: any) => l.score));
    }
    return { ...part, attempts, avgBand, bestBand };
  });


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Tabs */}
      <div className="flex overflow-x-auto space-x-2 border-b border-gray-200 dark:border-gray-800 pb-px">
        {['Reading', 'Listening', 'Writing', 'Speaking'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-card border border-b-0 border-gray-200 dark:border-gray-800 text-primary' 
                : 'text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            style={{ marginBottom: activeTab === tab ? '-1px' : '0' }}
          >
            {tab} Practice
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : (
        <>
          {/* READING TAB */}
          {activeTab === 'Reading' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-4">
                <p className="text-muted-foreground mb-4">Track your accuracy on specific reading question types.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {readingStats.map(stat => (
                    <Card key={stat.id} className="shadow-sm hover-elevate overflow-hidden border-l-4" style={{borderLeftColor: stat.color.includes('bg-coral') ? '#FF6B6B' : stat.color.includes('bg-purple') ? '#7B5EA7' : stat.color.includes('bg-teal') ? '#2EC4B6' : stat.color.includes('bg-green') ? '#06D6A0' : stat.color.includes('bg-yellow') ? '#FFD166' : stat.color.includes('bg-navy') ? '#1B2A4A' : '#F97316'}}>
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                            {stat.icon}
                          </div>
                          <h3 className="font-semibold text-foreground leading-tight">{stat.name}</h3>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4 text-sm text-center bg-muted rounded-lg p-2">
                          <div>
                            <p className="text-muted-foreground text-xs">Attempts</p>
                            <p className="font-bold text-foreground">{stat.attempts}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Avg Acc</p>
                            <p className="font-bold text-foreground">{stat.avgAccuracy.toFixed(0)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Best</p>
                            <p className="font-bold text-foreground">{stat.bestScoreStr}</p>
                          </div>
                        </div>
                        
                        <Button variant="outline" className="w-full text-xs font-medium h-8" onClick={() => openLogModal(stat.id, stat.icon)}>
                          Log Practice
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="xl:col-span-1">
                <Card className="shadow-sm sticky top-24">
                  <CardContent className="p-6">
                    <h3 className="font-heading font-bold text-lg text-foreground mb-2 text-center">Accuracy Radar</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                          <Radar name="Accuracy %" dataKey="accuracy" stroke="#2EC4B6" fill="#2EC4B6" fillOpacity={0.4} />
                          <RechartsTooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* LISTENING TAB */}
          {activeTab === 'Listening' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-4">
                <p className="text-muted-foreground mb-4">Track your performance across the 4 listening parts.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listeningStats.map(stat => (
                    <Card key={stat.id} className="shadow-sm hover-elevate overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                            {stat.icon}
                          </div>
                          <h3 className="font-semibold text-foreground leading-tight">{stat.name}</h3>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4 text-sm text-center bg-muted rounded-lg p-2">
                          <div>
                            <p className="text-muted-foreground text-xs">Attempts</p>
                            <p className="font-bold text-foreground">{stat.attempts}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Avg Score</p>
                            <p className="font-bold text-foreground">{stat.avgScore.toFixed(1)}/10</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Best</p>
                            <p className="font-bold text-foreground">{stat.bestScore}/10</p>
                          </div>
                        </div>
                        
                        <Button variant="outline" className="w-full text-xs font-medium h-8" onClick={() => openLogModal(stat.id, stat.icon)}>
                          Log Practice
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="xl:col-span-1">
                <Card className="shadow-sm sticky top-24">
                  <CardContent className="p-6">
                    <h3 className="font-heading font-bold text-lg text-foreground mb-2 text-center">Avg Score per Part</h3>
                    <div className="h-[300px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={listeningChartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 10]} tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                          <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Bar dataKey="avgScore" fill="#7B5EA7" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* WRITING TAB */}
          {activeTab === 'Writing' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-4">
                <p className="text-muted-foreground mb-4">Track your band scores for Writing Tasks 1 & 2.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {writingStats.map(stat => (
                    <Card key={stat.id} className="shadow-sm hover-elevate">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                            {stat.icon}
                          </div>
                          <h3 className="font-semibold text-foreground leading-tight">{stat.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 ml-10">{stat.detail}</p>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4 text-sm text-center bg-muted rounded-lg p-2">
                          <div>
                            <p className="text-muted-foreground text-xs">Attempts</p>
                            <p className="font-bold text-foreground">{stat.attempts}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Avg Band</p>
                            <p className="font-bold text-foreground">{stat.avgBand > 0 ? stat.avgBand.toFixed(1) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Best Band</p>
                            <p className="font-bold text-foreground">{stat.bestBand > 0 ? stat.bestBand.toFixed(1) : '-'}</p>
                          </div>
                        </div>
                        
                        <Button variant="outline" className="w-full text-xs font-medium h-8" onClick={() => openLogModal(stat.id, stat.icon)}>
                          Log Practice
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="xl:col-span-1">
                <Card className="shadow-sm sticky top-24">
                  <CardContent className="p-6">
                    <h3 className="font-heading font-bold text-lg text-foreground mb-2 text-center">Progress Over Time</h3>
                    <div className="h-[300px] w-full mt-4">
                      {writingChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={writingChartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})} />
                            <YAxis domain={[0, 9]} ticks={[0, 4, 5, 6, 7, 8, 9]} tick={{fontSize: 10}} />
                            <RechartsTooltip />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                            <Line type="monotone" name="Task 1" dataKey="Task 1" stroke="#06D6A0" strokeWidth={2} dot={{r: 3}} connectNulls />
                            <Line type="monotone" name="Task 2" dataKey="Task 2" stroke="#2563EB" strokeWidth={2} dot={{r: 3}} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed text-sm text-center p-4">
                           Log practice to see your progress
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* SPEAKING TAB */}
          {activeTab === 'Speaking' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3 space-y-4">
                <p className="text-muted-foreground mb-4">Track your band scores for Speaking Parts 1, 2 & 3.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {speakingStats.map(stat => (
                    <Card key={stat.id} className="shadow-sm hover-elevate">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                            {stat.icon}
                          </div>
                          <h3 className="font-semibold text-foreground leading-tight">{stat.name}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 ml-10">{stat.detail}</p>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4 text-sm text-center bg-muted rounded-lg p-2">
                          <div>
                            <p className="text-muted-foreground text-xs">Attempts</p>
                            <p className="font-bold text-foreground">{stat.attempts}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Avg Band</p>
                            <p className="font-bold text-foreground">{stat.avgBand > 0 ? stat.avgBand.toFixed(1) : '-'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Best Band</p>
                            <p className="font-bold text-foreground">{stat.bestBand > 0 ? stat.bestBand.toFixed(1) : '-'}</p>
                          </div>
                        </div>
                        
                        <Button variant="outline" className="w-full text-xs font-medium h-8" onClick={() => openLogModal(stat.id, stat.icon)}>
                          Log Practice
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Modal */}
      <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{activeIcon}</span>
              <span>Log Practice</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLog} className="space-y-4 pt-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Module</Label>
                <Input value={activeTab} disabled className="bg-muted text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Label>Sub-type</Label>
                <Input value={activeSubtype} disabled className="bg-muted text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Score 
                  {['Reading'].includes(activeTab) ? " (Correct)" : 
                   ['Listening'].includes(activeTab) ? " (out of 10)" : 
                   " (Band 1-9)"}
                </Label>
                <Input type="number" step={['Writing', 'Speaking'].includes(activeTab) ? "0.5" : "1"} min="0" max={['Writing', 'Speaking'].includes(activeTab) ? "9" : undefined} value={score} onChange={e => setScore(e.target.value)} required />
              </div>
              {['Reading', 'Listening'].includes(activeTab) && (
                <div className="space-y-2">
                  <Label>Total Questions</Label>
                  <Input type="number" min="1" max={activeTab === 'Listening' ? '10' : undefined} value={total} onChange={e => setTotal(e.target.value)} required />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes / Reflection</Label>
              <Textarea placeholder="What did you learn?" value={notes} onChange={e => setNotes(e.target.value)} className="resize-none" />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setLogModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground shadow-sm">Save Log</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}