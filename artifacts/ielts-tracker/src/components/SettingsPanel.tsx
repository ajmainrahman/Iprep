import React, { useState } from 'react';
import { useApp, Settings } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings as SettingsIcon, Download, Trash2, Moon, Sun } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function SettingsPanel() {
  const { settings, setSettings, resetAll, scores, studySessions, practiceLogs, vocabulary } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSettings: Settings = {
      ...settings,
      name: formData.get('name') as string,
      examDate: formData.get('examDate') as string,
      dailyGoal: Number(formData.get('dailyGoal')),
      targets: {
        Reading: Number(formData.get('targetReading')),
        Writing: Number(formData.get('targetWriting')),
        Speaking: Number(formData.get('targetSpeaking')),
        Listening: Number(formData.get('targetListening')),
      }
    };
    setSettings(newSettings);
    setIsOpen(false);
    toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
  };

  const toggleDarkMode = () => {
    setSettings({ ...settings, darkMode: !settings.darkMode });
  };

  const handleExport = () => {
    const data = { settings, scores, studySessions, practiceLogs, vocabulary };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ielts-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white rounded-full">
          <SettingsIcon className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading text-navy dark:text-white">Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-6 pt-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center gap-2">
              {settings.darkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
              <Label htmlFor="dark-mode" className="font-medium cursor-pointer">Dark Mode</Label>
            </div>
            <Switch id="dark-mode" checked={settings.darkMode} onCheckedChange={toggleDarkMode} />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Profile</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={settings.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDate">Exam Date</Label>
              <Input id="examDate" name="examDate" type="date" defaultValue={settings.examDate} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyGoal">Daily Study Goal (minutes)</Label>
              <Input id="dailyGoal" name="dailyGoal" type="number" min="5" defaultValue={settings.dailyGoal} required />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Target Band Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetReading" className="text-coral">Reading</Label>
                <Input id="targetReading" name="targetReading" type="number" step="0.5" min="0" max="9" defaultValue={settings.targets.Reading} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetListening" className="text-yellow-600">Listening</Label>
                <Input id="targetListening" name="targetListening" type="number" step="0.5" min="0" max="9" defaultValue={settings.targets.Listening} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetWriting" className="text-green-600">Writing</Label>
                <Input id="targetWriting" name="targetWriting" type="number" step="0.5" min="0" max="9" defaultValue={settings.targets.Writing} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetSpeaking" className="text-purple-600">Speaking</Label>
                <Input id="targetSpeaking" name="targetSpeaking" type="number" step="0.5" min="0" max="9" defaultValue={settings.targets.Speaking} required />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Button type="button" variant="outline" className="w-full justify-start hover:bg-gray-50 dark:hover:bg-gray-800" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export Data
            </Button>
            <Button type="button" variant="destructive" className="w-full justify-start bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-none dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40" onClick={() => { resetAll(); setIsOpen(false); }}>
              <Trash2 className="w-4 h-4 mr-2" /> Reset All Data
            </Button>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-teal text-white hover:bg-teal/90 shadow-sm">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}