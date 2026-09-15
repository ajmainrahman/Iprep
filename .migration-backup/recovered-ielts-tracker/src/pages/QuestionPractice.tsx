import React, { useState } from 'react';
import { useApp, PracticeLog } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const QUESTION_TYPES = [
  { id: 'tfng', name: 'True / False / Not Given', icon: '🔍', color: 'bg-coral text-white', accent: 'text-coral', bar: '[&>div]:bg-coral' },
  { id: 'ynng', name: 'Yes / No / Not Given', icon: '💬', color: 'bg-purple-600 text-white', accent: 'text-purple-600', bar: '[&>div]:bg-purple-600' },
  { id: 'gap', name: 'Summary / Gap Fill', icon: '✏️', color: 'bg-teal text-white', accent: 'text-teal', bar: '[&>div]:bg-teal' },
  { id: 'head', name: 'Matching Headings', icon: '📑', color: 'bg-green-500 text-white', accent: 'text-green-500', bar: '[&>div]:bg-green-500' },
  { id: 'match', name: 'Matching Information', icon: '🔗', color: 'bg-yellow-400 text-gray-900', accent: 'text-yellow-600', bar: '[&>div]:bg-yellow-400' },
  { id: 'mcq', name: 'Multiple Choice', icon: '✅', color: 'bg-navy text-white', accent: 'text-navy', bar: '[&>div]:bg-navy' },
  { id: 'sentence', name: 'Sentence Completion', icon: '🔤', color: 'bg-orange-500 text-white', accent: 'text-orange-500', bar: '[&>div]:bg-orange-500' },
];

export function QuestionPractice() {
  const { practiceLogs, setPracticeLogs } = useApp();
  const { toast } = useToast();
  
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [activeType, setActiveType] = useState(QUESTION_TYPES[0]);
  
  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('');
  const [notes, setNotes] = useState('');

  const openLogModal = (type: typeof QUESTION_TYPES[0]) => {
    setActiveType(type);
    setScore('');
    setTotal('');
    setNotes('');
    setLogModalOpen(true);
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numScore = Number(score);
    const numTotal = Number(total);
    
    if (numScore > numTotal) {
      toast({ title: "Error", description: "Score cannot be higher than total questions.", variant: "destructive" });
      return;
    }

    const newLog: PracticeLog = {
      id: Date.now().toString(),
      date,
      typeId: activeType.id,
      score: numScore,
      total: numTotal,
      notes
    };

    setPracticeLogs([...practiceLogs, newLog]);
    setLogModalOpen(false);
    toast({ title: "Logged successfully", description: `Added practice for ${activeType.name}` });
  };

  // Compute stats per type
  const typeStats = QUESTION_TYPES.map(type => {
    const logs = practiceLogs.filter(l => l.typeId === type.id);
    const attempts = logs.length;
    
    let avgScoreStr = '-';
    let bestScoreStr = '-';
    let accuracy = 0;
    
    if (attempts > 0) {
      const totalScore = logs.reduce((sum, l) => sum + l.score, 0);
      const totalQuestions = logs.reduce((sum, l) => sum + l.total, 0);
      
      const avgScore = totalScore / attempts;
      const avgTotal = totalQuestions / attempts;
      avgScoreStr = `${avgScore.toFixed(1)}/${avgTotal.toFixed(1)}`;
      
      const best = [...logs].sort((a,b) => (b.score/b.total) - (a.score/a.total))[0];
      bestScoreStr = `${best.score}/${best.total}`;
      
      accuracy = (totalScore / totalQuestions) * 100;
    }
    
    return { ...type, attempts, avgScoreStr, bestScoreStr, accuracy };
  });

  // Radar chart data
  const radarData = typeStats.map(s => ({
    subject: s.name.replace(/ \/ /g, '/').split(' ')[0], // Short name
    accuracy: Math.round(s.accuracy),
    fullMark: 100
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <Target className="w-8 h-8 text-coral" />
        <h1 className="text-3xl font-heading font-bold text-navy dark:text-white">Question Practice</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Cards List */}
        <div className="xl:col-span-2 space-y-4">
          <p className="text-gray-600 mb-4">Track your accuracy on specific IELTS question types to find your weak spots.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeStats.map(stat => (
              <Card key={stat.id} className="shadow-sm hover-elevate transition-all overflow-hidden border-t-0 border-l-4" style={{borderLeftColor: 'currentColor'}}>
                <div className={`w-1 h-full absolute left-0 ${stat.color}`}></div>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${stat.color}`}>
                        {stat.icon}
                      </div>
                      <h3 className="font-semibold text-gray-800 leading-tight">{stat.name}</h3>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-4 text-sm text-center bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                    <div>
                      <p className="text-gray-500 text-xs">Attempts</p>
                      <p className="font-bold text-navy dark:text-white">{stat.attempts}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Avg Score</p>
                      <p className="font-bold text-navy dark:text-white">{stat.avgScoreStr}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Best</p>
                      <p className="font-bold text-navy dark:text-white">{stat.bestScoreStr}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-500">Accuracy</span>
                      <span className={stat.accent}>{stat.accuracy.toFixed(0)}%</span>
                    </div>
                    <Progress value={stat.accuracy} className={`h-1.5 bg-gray-100 ${stat.bar}`} />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-xs font-medium h-8"
                    onClick={() => openLogModal(stat)}
                  >
                    Log Practice
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Radar Chart */}
        <div className="xl:col-span-1">
          <Card className="shadow-sm sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-heading font-bold text-lg text-navy mb-2 text-center">Accuracy Radar</h3>
              <p className="text-xs text-center text-gray-500 mb-6">Visualise your strengths and weaknesses</p>
              
              <div className="h-[300px] w-full">
                {practiceLogs.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <Radar name="Accuracy %" dataKey="accuracy" stroke="#2EC4B6" fill="#2EC4B6" fillOpacity={0.4} />
                      <RechartsTooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50/50 rounded-lg border border-dashed text-sm text-center p-4">
                     Log practice scores to generate your accuracy radar chart
                   </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Modal */}
      <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{activeType.icon}</span>
              <span>Log: {activeType.name}</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLog} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Score (Correct)</Label>
                <Input type="number" min="0" value={score} onChange={e => setScore(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Total Questions</Label>
                <Input type="number" min="1" value={total} onChange={e => setTotal(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes / Tricks learned</Label>
              <Textarea placeholder="E.g. Pay attention to keywords in the second paragraph." value={notes} onChange={e => setNotes(e.target.value)} className="resize-none" />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setLogModalOpen(false)}>Cancel</Button>
              <Button type="submit" className={`${activeType.color} border-none shadow-sm`}>Save Log</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}