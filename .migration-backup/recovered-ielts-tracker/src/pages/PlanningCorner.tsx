import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, X, Check, FileText, Target, DollarSign, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type NoteType = 'note' | 'plan' | 'budget' | 'link';

interface PlanningNote {
  id: number;
  section: string;
  type: NoteType;
  title: string;
  content?: string | null;
  url?: string | null;
  createdAt: string;
}

const TYPE_META: Record<NoteType, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  note:   { label: 'Note',   icon: FileText,   color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
  plan:   { label: 'Plan',   icon: Target,     color: 'text-green-600',  bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' },
  budget: { label: 'Budget', icon: DollarSign, color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' },
  link:   { label: 'Link',   icon: LinkIcon,   color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' },
};

export function PlanningCorner() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: notes = [], isLoading } = useQuery<PlanningNote[]>({
    queryKey: ['planning-notes', 'study'],
    queryFn: () => api.getPlanningNotes('study') as Promise<PlanningNote[]>,
  });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<NoteType | 'all'>('all');

  const emptyForm = { type: 'note' as NoteType, title: '', content: '', url: '' };
  const [form, setForm] = useState(emptyForm);

  const addMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.addPlanningNote(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-notes', 'study'] });
      setShowForm(false); setEditId(null); setForm(emptyForm);
      toast({ title: '✅ Saved!' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updatePlanningNote(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-notes', 'study'] });
      setShowForm(false); setEditId(null); setForm(emptyForm);
      toast({ title: '✅ Updated!' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deletePlanningNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planning-notes', 'study'] }),
  });

  function startEdit(n: PlanningNote) {
    setForm({ type: n.type, title: n.title, content: n.content || '', url: n.url || '' });
    setEditId(n.id);
    setShowForm(true);
  }

  function handleSave() {
    if (!form.title.trim()) return;
    const payload = {
      section: 'study',
      type: form.type,
      title: form.title.trim(),
      content: form.content?.trim() || null,
      url: form.url?.trim() || null,
    };
    if (editId) updateMutation.mutate({ id: editId, data: payload });
    else addMutation.mutate(payload);
  }

  const filtered = filterType === 'all' ? notes : notes.filter(n => n.type === filterType);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-8 h-8 text-teal" />
        <div>
          <h1 className="text-3xl font-heading font-bold text-navy dark:text-white">Planning</h1>
          <p className="text-sm text-muted-foreground">Plans, notes, budgets &amp; useful links for your IELTS journey</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'note', 'plan', 'budget', 'link'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                filterType === t
                  ? 'bg-teal text-white border-teal'
                  : 'bg-background border-border text-muted-foreground hover:border-teal/50'
              }`}
            >
              {t === 'all' ? 'All' : TYPE_META[t].label + 's'}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }}
          className="bg-teal hover:bg-teal/90 text-white"
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-teal/25">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editId ? 'Edit Entry' : 'New Entry'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as NoteType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_META) as [NoteType, typeof TYPE_META[NoteType]][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g. Monthly budget plan, YouTube channels…"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Content / Details</Label>
              <Textarea
                rows={3}
                placeholder="Add notes, numbers, or details…"
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              />
            </div>
            {(form.type === 'link') && (
              <div className="space-y-1">
                <Label>URL</Label>
                <Input
                  type="url"
                  placeholder="https://…"
                  value={form.url}
                  onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" disabled={!form.title.trim()} onClick={handleSave} className="bg-teal hover:bg-teal/90 text-white">
                <Check className="w-4 h-4 mr-1" /> {editId ? 'Update' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">Nothing here yet</p>
          <p className="text-sm mt-1">Add plans, notes, budgets or useful links to keep your IELTS journey organized.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.note;
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={`group border transition-shadow hover:shadow-md ${meta.bg}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                      <div className="min-w-0">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                        <p className="font-semibold text-sm text-foreground leading-tight mt-0.5">{n.title}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(n)} className="p-1 rounded hover:bg-background/60 text-muted-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(n.id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {n.content && (
                    <p className="text-sm text-foreground/75 mt-2 whitespace-pre-wrap line-clamp-4">{n.content}</p>
                  )}
                  {n.url && (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 text-xs mt-2 underline underline-offset-2 ${meta.color}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {n.url.replace(/^https?:\/\//, '').slice(0, 40)}{n.url.length > 40 ? '…' : ''}
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
