import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings as SettingsIcon, Moon, Sun, User, Calendar, Target, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  const target = new Date(y, mo - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });

  const [form, setForm] = useState({
    name: '',
    examDate: '',
    dailyGoalMinutes: 60,
    targetReading: 7,
    targetListening: 7,
    targetWriting: 7,
    targetSpeaking: 7,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        name: (settings as any).name ?? '',
        examDate: (settings as any).examDate ?? '',
        dailyGoalMinutes: (settings as any).dailyGoalMinutes ?? 60,
        targetReading: (settings as any).targetReading ?? 7,
        targetListening: (settings as any).targetListening ?? 7,
        targetWriting: (settings as any).targetWriting ?? 7,
        targetSpeaking: (settings as any).targetSpeaking ?? 7,
      });
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setIsOpen(false);
      toast({ title: '✅ Settings saved', description: 'Your profile and targets have been updated.' });
    },
    onError: () => {
      toast({ title: 'Save failed', variant: 'destructive' });
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({
      ...(settings as any),
      ...form,
      examDate: form.examDate || null,
    });
  };

  const toggleDarkMode = () => {
    const newVal = (settings as any)?.darkMode === 'true' ? 'false' : 'true';
    document.documentElement.classList.toggle('dark', newVal === 'true');
    updateSettings.mutate({ ...(settings as any), darkMode: newVal });
  };

  const overallTarget = ((form.targetReading + form.targetListening + form.targetWriting + form.targetSpeaking) / 4).toFixed(1);
  const examDays = daysUntil(form.examDate);

  if (isLoading || !settings) {
    return (
      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full text-white/50 hover:bg-white/10">
        <SettingsIcon className="w-4 h-4 animate-pulse" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-teal/5 to-indigo-500/5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <SettingsIcon className="w-5 h-5 text-teal" />
            Settings
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">Your profile, exam date &amp; study targets</p>
        </DialogHeader>

        <form onSubmit={handleSave} className="divide-y divide-border">

          {/* ── Dark mode toggle ── */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              {(settings as any).darkMode === 'true'
                ? <Moon className="w-4 h-4 text-indigo-400" />
                : <Sun className="w-4 h-4 text-yellow-500" />}
              <span className="text-sm font-medium">Dark Mode</span>
            </div>
            <Switch
              checked={(settings as any).darkMode === 'true'}
              onCheckedChange={toggleDarkMode}
            />
          </div>

          {/* ── Profile ── */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Profile
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Your Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Alex"
                required
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="examDate" className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal" />
                IELTS Exam Date
                {examDays !== null && (
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                    examDays > 30 ? 'bg-green-100 text-green-700' :
                    examDays > 7  ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-600'
                  }`}>
                    {examDays > 0 ? `${examDays} days left` : examDays === 0 ? 'Today!' : `${Math.abs(examDays)}d ago`}
                  </span>
                )}
              </Label>
              <Input
                id="examDate"
                type="date"
                value={form.examDate}
                onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))}
                className="h-10"
              />
              <p className="text-[11px] text-muted-foreground">Used for the countdown timer on your dashboard.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dailyGoalMinutes" className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Daily Study Goal (minutes)
              </Label>
              <Input
                id="dailyGoalMinutes"
                type="number"
                min="5"
                max="720"
                value={form.dailyGoalMinutes}
                onChange={e => setForm(f => ({ ...f, dailyGoalMinutes: Number(e.target.value) }))}
                className="h-10"
                required
              />
            </div>
          </div>

          {/* ── Target Band Scores ── */}
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Target Band Scores
              </p>
              <span className="text-sm font-bold text-teal bg-teal/10 px-2.5 py-0.5 rounded-full">
                Overall: {overallTarget}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'targetListening', label: 'Listening', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                { key: 'targetReading',   label: 'Reading',   color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-200' },
                { key: 'targetWriting',   label: 'Writing',   color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
                { key: 'targetSpeaking',  label: 'Speaking',  color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
              ].map(({ key, label, color, bg, border }) => (
                <div key={key} className={`rounded-xl p-3 border ${bg} ${border}`}>
                  <Label htmlFor={key} className={`text-xs font-semibold ${color} mb-2 block`}>{label}</Label>
                  <Input
                    id={key}
                    type="number"
                    step="0.5"
                    min="0"
                    max="9"
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    className="h-9 text-center font-bold text-base border-0 bg-transparent focus-visible:ring-1"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="px-6 py-4 flex justify-end gap-2 bg-muted/30">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal text-white hover:bg-teal/90 min-w-[110px]"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
