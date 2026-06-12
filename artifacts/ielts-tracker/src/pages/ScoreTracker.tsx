import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trash2, TrendingUp, Award, Edit2, X, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ScoreTracker({ triggerConfetti }: { triggerConfetti: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  
  const { data: scores = [], isLoading: scoresLoading } = useQuery({ queryKey: ['scores'], queryFn: api.getScores });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  
  const addScore = useMutation({
    mutationFn: api.addScore,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scores'] })
  });

  const updateScoreReq = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateScore(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scores'] });
      setEditingScore(null);
      toast({ title: 'Score updated!' });
    }
  });
  
  const deleteScoreReq = useMutation({
    mutationFn: (id: number) => api.deleteScore(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scores'] })
  });

  const [date, setDate] = useState(localDateStr(new Date()));
  const [module, setModule] = useState('Reading');
  const [scoreVal, setScoreVal] = useState('');
  const [band, setBand] = useState('');
  const [notes, setNotes] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [editingScore, setEditingScore] = useState<null | { id: number; date: string; module: string; band: string; score: string; notes: string }>(null);

  const handleAddScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreVal && !band) return;

    const b = Number(band) || 0;
    
    // Check if personal best
    const existingScores = scores.filter((s: any) => s.module === module);
    const isPB = existingScores.length > 0 && existingScores.every((s: any) => s.band < b);
    if (isPB) triggerConfetti();

    addScore.mutate({
      date,
      module,
      score: scoreVal ? Number(scoreVal) : null,
      band: b,
      notes
    }, {
      onSuccess: () => {
        setScoreVal('');
        setBand('');
        setNotes('');
        toast({
          title: "Score Added!",
          description: isPB ? "Congratulations! That's a new personal best! 🎉" : "Your practice score has been logged.",
        });
      }
    });
  };

  const handleUpdateScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScore) return;
    updateScoreReq.mutate({
      id: editingScore.id,
      data: {
        date: editingScore.date,
        module: editingScore.module,
        band: Number(editingScore.band),
        score: editingScore.score ? Number(editingScore.score) : null,
        notes: editingScore.notes || null,
      }
    });
  };

  const deleteScore = (id: number) => {
    if (confirm('Delete this score entry?')) {
      deleteScoreReq.mutate(id);
    }
  };

  const startEditScore = (s: any) => {
    setEditingScore({
      id: s.id,
      date: s.date,
      module: s.module,
      band: String(s.band),
      score: s.score ? String(s.score) : '',
      notes: s.notes || '',
    });
  };

  // Compute best scores
  const bestScores: Record<string, number> = {};
  ['Reading', 'Writing', 'Speaking', 'Listening', 'Full Mock'].forEach(mod => {
    const modScores = scores.filter((s: any) => s.module === mod);
    bestScores[mod] = modScores.length > 0 ? Math.max(...modScores.map((s: any) => s.band)) : 0;
  });

  // Prepare chart data (group by date)
  const chartDataMap = new Map<string, any>();
  [...scores].sort((a: any,b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach((s: any) => {
    if (!chartDataMap.has(s.date)) chartDataMap.set(s.date, { date: s.date });
    const entry = chartDataMap.get(s.date);
    entry[s.module] = s.band;
  });
  const chartData = Array.from(chartDataMap.values());

  const getModuleBadgeColor = (mod: string) => {
    switch(mod) {
      case 'Reading': return 'bg-coral/10 text-coral border-coral/20';
      case 'Writing': return 'bg-green-100 text-green-700 border-green-200';
      case 'Speaking': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Listening': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-navy/10 text-navy border-navy/20 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  if (scoresLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-8 h-8 text-teal" />
        <h1 className="text-3xl font-heading font-bold text-navy dark:text-white">Score Tracker</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Best Scores */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-t-4 border-t-teal shadow-sm">
            <CardHeader className="pb-3 bg-gradient-to-r from-teal/5 to-transparent">
              <CardTitle className="text-lg">Log a Score</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleAddScore} className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select value={module} onValueChange={setModule}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Reading">Reading</SelectItem>
                      <SelectItem value="Listening">Listening</SelectItem>
                      <SelectItem value="Writing">Writing</SelectItem>
                      <SelectItem value="Speaking">Speaking</SelectItem>
                      <SelectItem value="Full Mock">Full Mock Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Raw Score</Label>
                    <Input placeholder="e.g. 34/40" value={scoreVal} onChange={e => setScoreVal(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Band Score</Label>
                    <Input type="number" step="0.5" min="0" max="9" placeholder="e.g. 7.5" value={band} onChange={e => setBand(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes / Mistakes</Label>
                  <Textarea placeholder="What did you learn?" value={notes} onChange={e => setNotes(e.target.value)} className="resize-none h-20" />
                </div>

                <Button type="submit" className="w-full bg-teal text-white hover:bg-teal/90" disabled={addScore.isPending}>
                  {addScore.isPending ? "Adding..." : "Add Score"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Personal Bests
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3">
                {['Reading', 'Listening', 'Writing', 'Speaking'].map(mod => (
                  <div key={mod} className="bg-muted p-3 rounded-xl border flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{mod}</span>
                    <span className="text-2xl font-bold text-foreground">{bestScores[mod] > 0 ? bestScores[mod].toFixed(1) : '-'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Chart & History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-lg">Progress Over Time</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[300px] w-full mt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})} />
                      <YAxis domain={[0, 9]} ticks={[0, 4, 5, 6, 7, 8, 9]} tick={{fontSize: 12}} />
                      <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Line type="monotone" dataKey="Reading" stroke="#FF6B6B" strokeWidth={3} dot={{r: 4, fill: '#FF6B6B'}} activeDot={{r: 6}} connectNulls />
                      <Line type="monotone" dataKey="Listening" stroke="#FFD166" strokeWidth={3} dot={{r: 4, fill: '#FFD166'}} activeDot={{r: 6}} connectNulls />
                      <Line type="monotone" dataKey="Writing" stroke="#06D6A0" strokeWidth={3} dot={{r: 4, fill: '#06D6A0'}} activeDot={{r: 6}} connectNulls />
                      <Line type="monotone" dataKey="Speaking" stroke="#7B5EA7" strokeWidth={3} dot={{r: 4, fill: '#7B5EA7'}} activeDot={{r: 6}} connectNulls />
                      <Line type="monotone" dataKey="Full Mock" stroke="#1B2A4A" strokeWidth={3} strokeDasharray="5 5" dot={{r: 5}} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
                    Add some scores to see your progress chart
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {editingScore && (
            <Card className="shadow-sm border-2 border-teal/30">
              <CardHeader className="pb-3 bg-teal/5">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Edit Score</span>
                  <button onClick={() => setEditingScore(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleUpdateScore} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input type="date" value={editingScore.date} onChange={e => setEditingScore(p => p && ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Module</Label>
                    <Select value={editingScore.module} onValueChange={v => setEditingScore(p => p && ({ ...p, module: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Reading','Listening','Writing','Speaking','Full Mock'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Band Score</Label>
                    <Input type="number" step="0.5" min="0" max="9" value={editingScore.band} onChange={e => setEditingScore(p => p && ({ ...p, band: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Raw Score</Label>
                    <Input placeholder="e.g. 34/40" value={editingScore.score} onChange={e => setEditingScore(p => p && ({ ...p, score: e.target.value }))} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Notes</Label>
                    <Input value={editingScore.notes} onChange={e => setEditingScore(p => p && ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                    <Button type="submit" size="sm" disabled={updateScoreReq.isPending} className="bg-teal text-white hover:bg-teal/90">
                      <Check className="w-4 h-4 mr-1" /> Save Changes
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingScore(null)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2 bg-muted/50 border-b">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">Recent History</CardTitle>
                {scores.length > 0 && (
                  <Select value={filterDate} onValueChange={setFilterDate}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="All dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All dates</SelectItem>
                      {[...new Set((scores as any[]).map((s: any) => s.date))].sort((a, b) => b.localeCompare(a)).map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {scores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No scores yet — add your first one!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Band</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="max-w-[200px]">Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...scores]
                        .filter((s: any) => !filterDate || s.date === filterDate)
                        .sort((a: any, b: any) => b.date.localeCompare(a.date))
                        .map((s: any) => (
                        <TableRow key={s.id} className="hover:bg-muted/50">
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground font-medium">{s.date}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-sm ${getModuleBadgeColor(s.module)}`}>
                              {s.module}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold text-foreground">{s.band.toFixed(1)}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{s.score || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={s.notes}>
                            {s.notes || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => startEditScore(s)} className="h-8 w-8 text-muted-foreground hover:text-teal hover:bg-teal/10">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" disabled={deleteScoreReq.isPending} onClick={() => deleteScore(s.id)} className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}