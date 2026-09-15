import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { StudyPageHeader, StudyEmptyState } from '@/components/illustrations/StudyPageHeader';
import { StudyLogBadge } from '@/components/illustrations/StudyIllustrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Flame, Clock, Trash2, Target, ArrowUpRight } from 'lucide-react';
import { MODULES, MODULE_STYLES, MODULE_COLORS } from '@/lib/moduleStyles';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

/* Return "YYYY-MM-DD" in the user's LOCAL timezone — never use toISOString() for this */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* Module → pastel design tokens (bg tint, accent color, text color, icon) now
   live in @/lib/moduleStyles so Study Log and Practice Tracker share one
   consistent palette instead of each keeping its own copy. */

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

  const [date, setDate] = useState(localDateStr(new Date()));
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

  // ── Streak & Map Calculation (all dates in LOCAL timezone) ──────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const studyDates = new Set(studySessions.map((s: any) => s.date));

  // Streak: allow grace if today has no session yet
  let currentStreak = 0;
  {
    const cursor = new Date(today);
    if (!studyDates.has(localDateStr(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (studyDates.has(localDateStr(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // 40-day Consistency Map
  const mapDays: { date: string; total: number; color: string }[] = [];
  for (let i = 39; i >= 0; i--) {
    const curr = new Date(today);
    curr.setDate(today.getDate() - i);
    const dateStr = localDateStr(curr);
    const dayTotal = (studySessions as any[])
      .filter((s: any) => s.date === dateStr)
      .reduce((sum: number, s: any) => sum + s.minutes, 0);
    const color =
      dayTotal === 0   ? 'bg-muted' :
      dayTotal <= 45   ? 'bg-[#9FD4B3] dark:bg-[#1D9E75]/70' :
                         'bg-[#E88FA0] dark:bg-[#D4537E]/80';
    mapDays.push({ date: dateStr, total: dayTotal, color });
  }

  // Weekly Chart Data — now broken down per module so the bar for each day
  // shows which skill the time actually went to, not just a single total.
  const weeklyData: Array<{ day: string; fullDate: string; minutes: number } & Record<string, number | string>> = [];
  let weekTotal = 0;
  const moduleWeekTotals: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const curr = new Date(today);
    curr.setDate(today.getDate() - i);
    const dateStr = localDateStr(curr);
    const shortDay = curr.toLocaleDateString(undefined, { weekday: 'short' });
    const daySessions = (studySessions as any[]).filter((s: any) => s.date === dateStr);
    const dayTotal = daySessions.reduce((sum: number, s: any) => sum + s.minutes, 0);
    weekTotal += dayTotal;

    const dayRow: Record<string, number | string> = { day: shortDay, fullDate: dateStr, minutes: dayTotal };
    MODULES.forEach(mod => {
      const modMinutes = daySessions.filter((s: any) => s.module === mod).reduce((sum: number, s: any) => sum + s.minutes, 0);
      dayRow[mod] = modMinutes;
      moduleWeekTotals[mod] = (moduleWeekTotals[mod] || 0) + modMinutes;
    });
    weeklyData.push(dayRow as any);
  }
  const moduleBreakdown = MODULES
    .map(mod => ({ module: mod, minutes: moduleWeekTotals[mod] || 0 }))
    .filter(m => m.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  const totalHours = Math.floor((studySessions as any[]).reduce((sum: number, s: any) => sum + s.minutes, 0) / 60);
  const targetWeekly = (settings?.dailyGoalMinutes || 60) * 7;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StudyPageHeader
        icon={<StudyLogBadge size={44} />}
        title="Study Log"
        subtitle="Track daily study time by skill"
      />

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-[20px] p-4" style={{ backgroundColor: '#DEEFE3' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center">
              <Flame className="w-4 h-4" style={{ color: '#1D9E75' }} />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#5F8C71' }} />
          </div>
          <p className="text-xs mb-1" style={{ color: '#5F8C71' }}>Current streak</p>
          <p className="text-2xl font-medium" style={{ color: '#2C4A36' }}>{currentStreak} days</p>
        </div>

        <div className="rounded-[20px] p-4" style={{ backgroundColor: '#FBEDD2' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center">
              <Clock className="w-4 h-4" style={{ color: '#BA7517' }} />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#9C7C48' }} />
          </div>
          <p className="text-xs mb-1" style={{ color: '#9C7C48' }}>Total studied</p>
          <p className="text-2xl font-medium" style={{ color: '#5C441F' }}>{totalHours} hours</p>
        </div>

        <div className="rounded-[20px] p-4" style={{ backgroundColor: '#E6E3F6' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center">
              <Target className="w-4 h-4" style={{ color: '#7F77DD' }} />
            </div>
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#7A73A8' }} />
          </div>
          <p className="text-xs mb-1" style={{ color: '#7A73A8' }}>Weekly target</p>
          <p className="text-2xl font-medium mb-2" style={{ color: '#3C3489' }}>{Math.round(weekTotal / 60 * 10) / 10} / {Math.round(targetWeekly / 60)} hrs</p>
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/50">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (weekTotal / targetWeekly) * 100)}%`, backgroundColor: '#7F77DD' }}
            />
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: '#7A73A8' }}>
            {weekTotal >= targetWeekly ? 'Target met!' : `${targetWeekly - weekTotal}m to go`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[20px] border-none shadow-none bg-white dark:bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Log a session</CardTitle>
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
                      <SelectItem value="Listening Practice">Listening Practice</SelectItem>
                      <SelectItem value="Speaking Practice">Speaking Practice</SelectItem>
                      <SelectItem value="Writing Practice">Writing Practice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label style={{ color: '#1D9E75' }}>What went well?</Label>
                  <Textarea placeholder="Reflect on your wins" value={well} onChange={e => setWell(e.target.value)} className="resize-none h-16 rounded-xl border-[#BEE3CB] dark:border-green-900 focus-visible:ring-[#1D9E75]" />
                </div>

                <div className="space-y-2">
                  <Label style={{ color: '#C94F4E' }}>What to improve?</Label>
                  <Textarea placeholder="Note your mistakes" value={improve} onChange={e => setImprove(e.target.value)} className="resize-none h-16 rounded-xl border-[#F4C4C4] dark:border-red-900 focus-visible:ring-[#C94F4E]" />
                </div>

                <Button type="submit" className="w-full text-white rounded-xl hover:opacity-90" style={{ backgroundColor: '#1D9E75' }} disabled={addSession.isPending}>
                  {addSession.isPending ? "Saving..." : "Save session"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Charts & History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[20px] border-none shadow-none bg-white dark:bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Consistency map (last 40 days)</CardTitle>
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
                  <div className="w-3 h-3 rounded-sm bg-[#9FD4B3]"></div>
                  <div className="w-3 h-3 rounded-sm bg-[#E88FA0]"></div>
                </div>
                <span>More</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[20px] border-none shadow-none bg-white dark:bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">This week by module</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
               <div className="h-[280px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                      <YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        cursor={{fill: 'rgba(0,0,0,0.04)'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.08)'}}
                        formatter={(value: number, name: string) => [`${value} min`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <ReferenceLine y={settings?.dailyGoalMinutes || 60} stroke="#c9c7c0" strokeDasharray="3 3" />
                      {MODULES.map((mod, i) => (
                        <Bar
                          key={mod}
                          dataKey={mod}
                          name={mod}
                          stackId="study"
                          fill={MODULE_COLORS[mod]}
                          radius={i === MODULES.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
               </div>

               {/* Per-module breakdown — exact minutes so it's clear which skill the time went to */}
               {moduleBreakdown.length > 0 && (
                 <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {moduleBreakdown.map(({ module, minutes }) => {
                     const pct = weekTotal > 0 ? Math.round((minutes / weekTotal) * 100) : 0;
                     const s = MODULE_STYLES[module];
                     const Icon = s.icon;
                     const hours = Math.round((minutes / 60) * 10) / 10;
                     return (
                       <div key={module} className="rounded-[20px] p-4" style={{ backgroundColor: s.bg }}>
                         <div className="flex items-center gap-2 mb-2.5">
                           <div className="w-[26px] h-[26px] rounded-full bg-white/60 flex items-center justify-center shrink-0">
                             <Icon className="w-3.5 h-3.5" style={{ color: s.bar }} />
                           </div>
                           <span className="text-xs" style={{ color: s.bar }}>{module}</span>
                         </div>
                         <p className="text-[17px] font-medium mb-2.5" style={{ color: s.text }}>{hours}h this week</p>
                         <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/50">
                           <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.bar }} />
                         </div>
                       </div>
                     );
                   })}
                 </div>
               )}
            </CardContent>
          </Card>
          
          <Card className="rounded-[20px] border-none shadow-none bg-white dark:bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent sessions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               {studySessions.length === 0 ? (
                 <StudyEmptyState
                   icon={<StudyLogBadge size={56} />}
                   title="No sessions logged yet"
                   subtitle="Log your first study session above to start tracking time by skill."
                 />
               ) : (
                 <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                   {[...studySessions].sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((s: any) => {
                     const st = MODULE_STYLES[s.module] || MODULE_STYLES.Mixed;
                     const SIcon = st.icon;
                     return (
                     <div key={s.id} className="rounded-[16px] p-3.5" style={{ backgroundColor: st.bg }}>
                       <div className="flex items-start justify-between gap-2">
                         <div className="flex items-start gap-3 flex-1 min-w-0">
                           <div className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center shrink-0 mt-0.5">
                             <SIcon className="w-4 h-4" style={{ color: st.bar }} />
                           </div>
                           <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                             <span className="font-medium" style={{ color: st.text }}>{s.module}</span>
                             <span className="text-xs px-2 py-0.5 rounded-full bg-white/60" style={{ color: st.bar }}>{s.minutes} min</span>
                           </div>
                           <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                             <span>{s.date}</span>
                             <span>•</span>
                             <span>{s.activityType}</span>
                           </div>
                           {(s.wentWell || s.improve) && (
                             <div className="mt-2 space-y-1">
                               {s.wentWell && (
                                 <p className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
                                   <span className="font-semibold">✓ Well:</span> {s.wentWell}
                                 </p>
                               )}
                               {s.improve && (
                                 <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                                   <span className="font-semibold">↑ Improve:</span> {s.improve}
                                 </p>
                               )}
                             </div>
                           )}
                           </div>
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => deleteSession(s.id)} disabled={deleteSessionReq.isPending} className="text-muted-foreground hover:text-red-500 shrink-0">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                       </div>
                     </div>
                     );
                   })}
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}