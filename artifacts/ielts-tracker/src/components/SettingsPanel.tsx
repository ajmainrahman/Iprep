import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings as SettingsIcon, Download, Trash2, Moon, Sun } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });
  
  const updateSettings = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] })
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSettings = {
      ...settings,
      name: formData.get('name') as string,
      examDate: formData.get('examDate') as string,
      dailyGoalMinutes: Number(formData.get('dailyGoalMinutes')),
      targetReading: Number(formData.get('targetReading')),
      targetWriting: Number(formData.get('targetWriting')),
      targetSpeaking: Number(formData.get('targetSpeaking')),
      targetListening: Number(formData.get('targetListening')),
    };
    updateSettings.mutate(newSettings, {
      onSuccess: () => {
        setIsOpen(false);
        toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
      }
    });
  };

  const toggleDarkMode = () => {
    const newVal = settings?.darkMode === 'true' ? 'false' : 'true';
    if (newVal === 'true') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateSettings.mutate({ ...settings, darkMode: newVal });
  };

  const handleExport = () => {
    // We would need to fetch all data or pass it from parent, but simplified for React Query:
    toast({ title: 'Export feature not fully implemented', description: 'Need to fetch all entities first.' });
  };

  if (isLoading || !settings) {
    return (
      <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent rounded-full">
        <SettingsIcon className="w-5 h-5 animate-pulse" />
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-full">
          <SettingsIcon className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading text-foreground">Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-6 pt-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              {settings.darkMode === 'true' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
              <Label htmlFor="dark-mode" className="font-medium cursor-pointer">Dark Mode</Label>
            </div>
            <Switch id="dark-mode" checked={settings.darkMode === 'true'} onCheckedChange={toggleDarkMode} />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Profile</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={settings.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDate">Exam Date</Label>
              <Input id="examDate" name="examDate" type="date" defaultValue={settings.examDate ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyGoalMinutes">Daily Study Goal (minutes)</Label>
              <Input id="dailyGoalMinutes" name="dailyGoalMinutes" type="number" min="5" defaultValue={settings.dailyGoalMinutes} required />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Target Band Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetReading" className="text-coral">Reading</Label>
                <Input id="targetReading" name="targetReading" type="number" step="0.5" min="0" max="9" defaultValue={settings.targetReading} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetListening" className="text-yellow-600">Listening</Label>
                <Input id="targetListening" name="targetListening" type="number" step="0.5" min="0" max="9" defaultValue={settings.targetListening} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetWriting" className="text-green-600">Writing</Label>
                <Input id="targetWriting" name="targetWriting" type="number" step="0.5" min="0" max="9" defaultValue={settings.targetWriting} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetSpeaking" className="text-purple-600">Speaking</Label>
                <Input id="targetSpeaking" name="targetSpeaking" type="number" step="0.5" min="0" max="9" defaultValue={settings.targetSpeaking} required />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Button type="button" variant="outline" className="w-full justify-start hover:bg-muted" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export Data
            </Button>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}