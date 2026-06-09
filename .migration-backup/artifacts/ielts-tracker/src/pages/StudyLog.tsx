import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BookOpen, Flame, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export function StudyLog() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  const { data: studySessions = [], isLoading: sessionsLoading } = useQuery({ queryKey: ['study-sessions'], queryFn: api.getStudySessions });
  
  const addSession = useMutation({
    mutationFn: api.addStudySession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-sessions'] })
  });

  const deleteSessionReq = useMutation({
    mutationFn: (id: number) => api.deleteStudySession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study-sessions'] })
  });

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [module, setModule] = useState('Reading');
  const [duration, setDuration] = useState('30');
  const [activityType, setActivityType] = useState('Question Type Drill');
  const [well, setWell] = useState('');
  const [improve, setImprove] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    addSession.mutate({
      date,
      module,
      minutes: Number(duration),
      activityType,
      wentWell: well,
      improve
    }, {
      onSuccess: () => {
        setDuration('30');
        setWell('');
        setImprove('');
        toast({ title: "Session logged", description: `Great job! Added ${duration} minutes to your study log.` });
      }
    });
  };

  const deleteSession = (id: number) => {
    if (confirm('Delete this session?')) {
      deleteSessionReq.mutate(id);
    }
  };

  if (settingsLoading || sessionsLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  // Streak & Map Calculation
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const studyDates = new Set(studySessions.map((s: any) => s.date));
  let currentStreak = 0;
  let d = new Date(today);
  
  // Calculate streak backwards from today
  while (true) {
    const dStr = d.toISOString().split('T')[0];
    if (studyDates.has(dStr)) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else if (d.getTime() === today.getTime()) {
      // It's okay if today is missing, check yesterday
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // 40 Day Activity Map
  const mapDays = [];
  const startMap = new Date(today);
  startMap.setDate(today.getDate() - 39);
  
  for (let i = 0; i < 40; i++) {
    const curr = new Date(startMap);
    curr.setDate(startMap.getDate() + i);
    const dateStr = curr.toISOString().split('T')[0];
    
    const daySessions = studySessions.filter((s: any) => s.date === dateStr);
    const dayTotal = daySessions.reduce((sum: number, s: any) => sum + s.minutes, 0);
    
    let color = 'bg-muted'; // none
    if (dayTotal > 0 && dayTotal <= 45) color = 'bg-teal/60 dark:bg-teal/80'; // studied
    if (dayTotal > 45) color = 'bg-coral dark:bg-coral'; // intensive
    
    mapDays.push({ date: dateStr, total: dayTotal, color });
  }

  // Weekly Chart Data
  const weeklyData = [];
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  
  let weekTotal = 0;
  for (let i = 0; i < 7; i++) {
    const curr = new Date(weekStart);
    curr.setDate(weekStart.getDate() + i);
    const dateStr = curr.toISOString().split('T')[0];
    const shortDay = curr.toLocaleDateString(undefined, { weekday: 'short' });
    
    const dayTotal = studySessions.filter((s: any) => s.date === dateStr).reduce((sum: number, s: any) => sum + s.minutes, 0);
    weekTotal += dayTotal;
    weeklyData.push({ day: shortDay, minutes: dayTotal, fullDate: dateStr });
  }

  const totalHours = Math.floor(studySessions.reduce((sum: number, s: any) => sum + s.minutes, 0) / 60);
  const targetWeekly = (settings?.dailyGoalMinutes || 60) * 7;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-8 h-8 text-navy dark:text-blue-400" />
        <h1 className="text-3xl font-heading font-bold text-navy dark:text-white">Study Log</h1>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/40 border-none shadow-sm rounded-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Current Streak</p>
              <h3 className="text-3xl font-bold text-orange-700 dark:text-orange-300">{currentStreak} <span className="text-lg font-normal">days</span></h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 border-none shadow-sm rounded-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Time Studied</p>
              <h3 className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalHours} <span className="text-lg font-normal">hours</span></h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-none shadow-sm rounded-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Weekly Target ({targetWeekly}m)</p>
              <p className="text-sm font-bold text-foreground">{weekTotal}m</p>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-teal transition-all" 
                style={{ width: `${Math.min(100, (weekTotal / targetWeekly) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {weekTotal >= targetWeekly ? 'Target met! 🎉' : `${targetWeekly - weekTotal}m to go`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-t-4 border-t-navy dark:border-t-blue-500 shadow-sm">
            <CardHeader className="pb-3 bg-gradient-to-r from-navy/5 dark:from-blue-500/10 to-transparent border-b border-border/50">
              <CardTitle className="text-lg">Log a Session</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="Vocabulary">Vocabulary</SelectItem>
                        <SelectItem value="Mixed">Mixed Practice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Minutes</Label>
                    <Input type="number" min="5" value={duration} onChange={e => setDuration(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Activity Type</Label>
                  <Select value={activityType} onValueChange={setActivityType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Question Type Drill">Question Type Drill</SelectItem>
                      <SelectItem value="Full Passage">Full Passage</SelectItem>
                      <SelectItem value="Mock Test">Mock Test</SelectItem>
                      <SelectItem value="Vocabulary">Vocabulary</SelectItem>
                      <SelectItem value="Speaking Practice">Speaking Practice</SelectItem>
                      <SelectItem value="Writing Practice">Writing Practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-green-600 dark:text-green-400">What went well?</Label>
                  <Textarea placeholder="Reflect on your wins" value={well} onChange={e => setWell(e.target.value)} className="resize-none h-16 border-green-200 dark:border-green-900 focus-visible:ring-green-500" />
                </div>

                <div className="space-y-2">
                  <Label className="text-coral">What to improve?</Label>
                  <Textarea placeholder="Note your mistakes" value={improve} onChange={e => setImprove(e.target.value)} className="resize-none h-16 border-red-200 dark:border-red-900 focus-visible:ring-coral" />
                </div>

                <Button type="submit" className="w-full bg-navy text-white hover:bg-navy/90 dark:bg-blue-600 dark:hover:bg-blue-700" disabled={addSession.isPending}>
                  {addSession.isPending ? "Saving..." : "Save Session"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Charts & History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-lg">Consistency Map (Last 40 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-1.5 pt-2">
                {mapDays.map((day, i) => (
                  <div 
                    key={i} 
                    className={`w-6 h-6 rounded-sm ${day.color} hover:ring-2 ring-navy/20 cursor-pointer transition-all`}
                    title={`${day.date}: ${day.total} mins`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-muted"></div>
                  <div className="w-3 h-3 rounded-sm bg-teal/60"></div>
                  <div className="w-3 h-3 rounded-sm bg-coral"></div>
                </div>
                <span>More</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="text-lg">This Week's Study Time</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
               <div className="h-[250px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                      <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <ReferenceLine y={settings?.dailyGoalMinutes || 60} stroke="#FFD166" strokeDasharray="3 3" />
                      <Bar dataKey="minutes" fill="#1B2A4A" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-2 bg-muted/50 border-b">
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {studySessions.length === 0 ? (
                 <div className="text-center py-8 text-muted-foreground">No sessions yet.</div>
               ) : (
                 <div className="divide-y max-h-[300px] overflow-y-auto">
                   {[...studySessions].sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((s: any) => (
                     <div key={s.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="font-bold text-foreground">{s.module}</span>
                           <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">{s.minutes} min</span>
                         </div>
                         <div className="text-sm text-muted-foreground flex items-center gap-2">
                           <span>{new Date(s.date).toLocaleDateString()}</span>
                           <span>•</span>
                           <span>{s.activityType}</span>
                         </div>
                       </div>
                       <Button variant="ghost" size="icon" onClick={() => deleteSession(s.id)} disabled={deleteSessionReq.isPending} className="text-muted-foreground hover:text-red-500">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   ))}
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}