import React, { useState } from 'react';
import { useApp, PracticeLog } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { StudyPageHeader } from '@/components/illustrations/StudyPageHeader';
import { QuestionCardsBadge } from '@/components/illustrations/StudyIllustrations';
import { PASTELS } from '@/lib/moduleStyles';
import { useToast } from '@/hooks/use-toast';

const QUESTION_TYPES = [
  { id: 'tfng', name: 'True / False / Not Given', icon: '🔍' },
  { id: 'ynng', name: 'Yes / No / Not Given', icon: '💬' },
  { id: 'gap', name: 'Summary / Gap Fill', icon: '✏️' },
  { id: 'head', name: 'Matching Headings', icon: '📑' },
  { id: 'match', name: 'Matching Information', icon: '🔗' },
  { id: 'mcq', name: 'Multiple Choice', icon: '✅' },
  { id: 'sentence', name: 'Sentence Completion', icon: '🔤' },
].map((t, i) => ({ ...t, ...PASTELS[i % PASTELS.length] }));

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
      <StudyPageHeader
        icon={<QuestionCardsBadge size={44} />}
        title="Question Practice"
        subtitle="Drill specific question types until they click"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Cards List */}
        <div className="xl:col-span-2 space-y-4">
          <p className="text-muted-foreground mb-4">Track your accuracy on specific IELTS question types to find your weak spots.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeStats.map(stat => (
              <div key={stat.id} className="rounded-[20px] p-4" style={{ backgroundColor: stat.bg }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-full bg-white/60 flex items-center justify-center text-base shrink-0">
                    {stat.icon}
                  </div>
                  <h3 className="font-medium leading-tight" style={{ color: stat.text }}>{stat.name}</h3>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 text-sm text-center bg-white/50 rounded-2xl p-2.5">
                  <div>
                    <p className="text-xs" style={{ color: stat.accent }}>Attempts</p>
                    <p className="font-medium" style={{ color: stat.text }}>{stat.attempts}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: stat.accent }}>Avg Score</p>
                    <p className="font-medium" style={{ color: stat.text }}>{stat.avgScoreStr}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: stat.accent }}>Best</p>
                    <p className="font-medium" style={{ color: stat.text }}>{stat.bestScoreStr}</p>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex justify-between text-xs font-medium">
                    <span style={{ color: stat.accent }}>Accuracy</span>
                    <span style={{ color: stat.text }}>{stat.accuracy.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/50">
                    <div className="h-full rounded-full" style={{ width: `${stat.accuracy}%`, backgroundColor: stat.accent }} />
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full text-xs font-medium h-8 rounded-xl border-none bg-white/60 hover:bg-white/90"
                  style={{ color: stat.text }}
                  onClick={() => openLogModal(stat)}
                >
                  Log Practice
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Radar Chart */}
        <div className="xl:col-span-1">
          <Card className="rounded-[20px] border-none shadow-none bg-white dark:bg-card sticky top-24">
            <CardContent className="p-6">
              <h3 className="font-heading font-medium text-lg text-foreground mb-2 text-center">Accuracy Radar</h3>
              <p className="text-xs text-center text-muted-foreground mb-6">Visualise your strengths and weaknesses</p>

              <div className="h-[300px] w-full">
                {practiceLogs.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <Radar name="Accuracy %" dataKey="accuracy" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.35} />
                      <RechartsTooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/40 rounded-2xl border border-dashed text-sm text-center p-4">
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
        <DialogContent className="sm:max-w-[425px] rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{activeType.icon}</span>
              <span>Log: {activeType.name}</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveLog} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required className="rounded-xl" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Score (Correct)</Label>
                <Input type="number" min="0" value={score} onChange={e => setScore(e.target.value)} required className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Total Questions</Label>
                <Input type="number" min="1" value={total} onChange={e => setTotal(e.target.value)} required className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes / Tricks learned</Label>
              <Textarea placeholder="E.g. Pay attention to keywords in the second paragraph." value={notes} onChange={e => setNotes(e.target.value)} className="resize-none rounded-xl" />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setLogModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="rounded-xl text-white hover:opacity-90" style={{ backgroundColor: activeType.accent }}>Save Log</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}