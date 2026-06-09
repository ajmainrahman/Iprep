import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { IELTS_VOCAB } from '@/lib/vocab-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Book, Plus, CheckCircle2, Trash2, Search, Layers, ChevronLeft, ChevronRight, Shuffle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TOPICS = [
  'Environment', 'Technology', 'Health', 'Society', 'Education',
  'Economy', 'Politics', 'Science', 'Arts & Media', 'History'
];

/* ═══════════════════════════════════════════════════════════════════════════
   FLASHCARD MODE
═══════════════════════════════════════════════════════════════════════════ */
function FlashcardMode({ words, onClose, onToggle }: {
  words: any[];
  onClose: () => void;
  onToggle: (id: number) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'unknown' | string>('all');
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [deck, setDeck] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const buildDeck = useCallback((f: 'all' | 'unknown' | string, topic: string) => {
    let filtered = [...words];
    if (f === 'unknown') filtered = filtered.filter(w => w.known !== 'true');
    if (topic) filtered = filtered.filter(w => w.topic === topic);
    return filtered;
  }, [words]);

  useEffect(() => {
    const d = buildDeck(filter, topicFilter);
    setDeck(d);
    setIdx(0);
    setFlipped(false);
  }, [filter, topicFilter, buildDeck]);

  const shuffle = () => {
    setDeck(d => {
      const copy = [...d];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
    setIdx(0);
    setFlipped(false);
  };

  const prev = () => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); };
  const next = () => { setIdx(i => Math.min(deck.length - 1, i + 1)); setFlipped(false); };

  const card = deck[idx];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-gray-900 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          <span className="font-bold text-lg text-foreground">Flashcard Mode</span>
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {deck.length === 0 ? '0 / 0' : `${idx + 1} / ${deck.length}`}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 px-4 pb-4">
        {(['all', 'unknown'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setTopicFilter(''); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${filter === f && !topicFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-900 border-border text-muted-foreground hover:border-indigo-400'}`}
          >
            {f === 'all' ? 'All words' : 'Unknown only'}
          </button>
        ))}
        <select
          className="px-3 py-1 rounded-full text-xs font-semibold border bg-white dark:bg-gray-900 border-border text-muted-foreground"
          value={topicFilter}
          onChange={e => { setTopicFilter(e.target.value); setFilter('all'); }}
        >
          <option value="">By Topic…</option>
          {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={shuffle}
          className="px-3 py-1 rounded-full text-xs font-semibold border bg-white dark:bg-gray-900 border-border text-muted-foreground hover:border-indigo-400 flex items-center gap-1"
        >
          <Shuffle className="w-3 h-3" /> Shuffle
        </button>
      </div>

      {/* Card area */}
      {deck.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8">
          <span className="text-5xl">📭</span>
          <p className="text-muted-foreground font-medium">No cards match this filter.</p>
          <Button variant="outline" onClick={() => { setFilter('all'); setTopicFilter(''); }}>Show all cards</Button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          {/* Flip card */}
          <div
            className="w-full max-w-lg cursor-pointer select-none"
            style={{ perspective: '1000px' }}
            onClick={() => setFlipped(f => !f)}
          >
            <div
              className="relative transition-transform duration-500"
              style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: 260 }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 rounded-2xl bg-white dark:bg-gray-900 border-2 border-indigo-200 dark:border-indigo-800 shadow-xl p-8 flex flex-col items-center justify-center gap-3"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Word</span>
                <h2 className="text-4xl font-black text-center text-indigo-700 dark:text-indigo-300">{card?.word}</h2>
                <span className="italic text-purple-500 text-sm font-medium">{card?.pos}</span>
                <span className="text-xs text-muted-foreground mt-4">Tap to reveal definition →</span>
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 rounded-2xl bg-indigo-600 dark:bg-indigo-700 border-2 border-indigo-500 shadow-xl p-8 flex flex-col items-start justify-center gap-4"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">Definition</span>
                <p className="text-white text-lg font-semibold leading-relaxed">{card?.definition}</p>
                {card?.example && (
                  <div className="bg-white/10 rounded-lg p-3 border-l-4 border-white/40 w-full">
                    <p className="text-indigo-100 text-sm italic">"{card.example}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Known badge */}
          {card?.known === 'true' && (
            <div className="flex items-center gap-1.5 text-green-600 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Marked as Known
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={prev} disabled={idx === 0} className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              onClick={() => { onToggle(card.id); }}
              variant={card?.known === 'true' ? 'outline' : 'default'}
              className={`px-6 rounded-xl ${card?.known === 'true' ? 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              {card?.known === 'true' ? '✓ Known' : 'Mark as Known'}
            </Button>
            <Button variant="outline" size="icon" onClick={next} disabled={idx === deck.length - 1} className="rounded-xl">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="w-full max-w-lg">
            <Progress value={deck.length > 0 ? ((idx + 1) / deck.length) * 100 : 0} className="h-1.5 [&>div]:bg-indigo-500 bg-indigo-100" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export function VocabularyBank() {
  const { toast } = useToast();
  const { data: words = [], isLoading } = useQuery({ queryKey: ['vocab'], queryFn: api.getVocab });
  const qc = useQueryClient();
  const [flashcardMode, setFlashcardMode] = useState(false);

  useEffect(() => {
    if (!isLoading && words.length === 0 && !localStorage.getItem('vocab_seeded')) {
      api.bulkVocab(IELTS_VOCAB.map(w => ({ ...w, known: 'false' }))).then(() => {
        localStorage.setItem('vocab_seeded', 'true');
        qc.invalidateQueries({ queryKey: ['vocab'] });
      });
    }
  }, [words, isLoading, qc]);

  const toggleKnown = useMutation({
    mutationFn: (id: number) => api.toggleVocab(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  const deleteWord = useMutation({
    mutationFn: (id: number) => api.deleteVocab(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  const addWord = useMutation({
    mutationFn: api.addVocab,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  const [activeTopic, setActiveTopic] = useState(TOPICS[0]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newWord, setNewWord] = useState('');
  const [newPos, setNewPos] = useState('noun');
  const [newDef, setNewDef] = useState('');
  const [newExample, setNewExample] = useState('');
  const [newTopic, setNewTopic] = useState(TOPICS[0]);

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    addWord.mutate({
      word: newWord, pos: newPos, definition: newDef, example: newExample, topic: newTopic, known: 'false'
    }, {
      onSuccess: () => {
        setAddModalOpen(false);
        setNewWord(''); setNewDef(''); setNewExample('');
        setActiveTopic(newTopic);
        toast({ title: "Word Added", description: `Added "${newWord}" to ${newTopic}` });
      }
    });
  };

  const removeWord = (id: number) => {
    if (confirm('Remove this word from your bank?')) {
      deleteWord.mutate(id, { onSuccess: () => toast({ description: "Word removed" }) });
    }
  };

  const totalWords = words.length;
  const learnedWords = (words as any[]).filter(w => w.known === 'true').length;
  const progressPercent = totalWords === 0 ? 0 : (learnedWords / totalWords) * 100;
  const currentTopicWords = (words as any[]).filter(w => w.topic === activeTopic && w.word.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      {flashcardMode && (
        <FlashcardMode
          words={words as any[]}
          onClose={() => setFlashcardMode(false)}
          onToggle={(id) => toggleKnown.mutate(id)}
        />
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Book className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-heading font-bold text-navy dark:text-white">Vocabulary Bank</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setFlashcardMode(true)}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 whitespace-nowrap"
            >
              <Layers className="w-4 h-4 mr-2" /> Flashcard Mode
            </Button>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search words..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
            </div>
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 text-white hover:bg-purple-700 shadow-sm whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-2" /> Add New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Vocabulary</DialogTitle></DialogHeader>
                <form onSubmit={handleAddWord} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Word or Phrase</Label>
                      <Input value={newWord} onChange={e => setNewWord(e.target.value)} required autoFocus />
                    </div>
                    <div className="space-y-2">
                      <Label>Part of Speech</Label>
                      <Select value={newPos} onValueChange={setNewPos}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="noun">Noun</SelectItem>
                          <SelectItem value="verb">Verb</SelectItem>
                          <SelectItem value="adjective">Adjective</SelectItem>
                          <SelectItem value="adverb">Adverb</SelectItem>
                          <SelectItem value="phrase">Phrase / Idiom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Topic</Label>
                    <Select value={newTopic} onValueChange={setNewTopic}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TOPICS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Definition</Label>
                    <Textarea value={newDef} onChange={e => setNewDef(e.target.value)} required className="resize-none" />
                  </div>
                  <div className="space-y-2">
                    <Label>Example Sentence</Label>
                    <Textarea placeholder="Write a sentence demonstrating how to use it..." value={newExample} onChange={e => setNewExample(e.target.value)} required className="resize-none" />
                  </div>
                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={addWord.isPending}>
                    {addWord.isPending ? "Saving..." : "Save Word"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Bar */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex gap-8 flex-shrink-0 w-full sm:w-auto justify-around sm:justify-start">
              <div className="text-center sm:text-left">
                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mb-1">Total</p>
                <p className="text-3xl font-heading font-bold text-navy dark:text-white">{totalWords}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Learned</p>
                <p className="text-3xl font-heading font-bold text-navy dark:text-white">{learnedWords}</p>
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-1">Remaining</p>
                <p className="text-3xl font-heading font-bold text-navy dark:text-white">{totalWords - learnedWords}</p>
              </div>
            </div>
            <div className="w-full flex-1">
              <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                <span>Mastery Progress</span>
                <span className="text-purple-600">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-3 [&>div]:bg-purple-500 bg-purple-100" />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTopic} onValueChange={setActiveTopic} className="w-full">
          <div className="overflow-x-auto pb-2 scrollbar-hide">
            <TabsList className="bg-transparent border-b w-max min-w-full justify-start rounded-none h-12 p-0 space-x-6">
              {TOPICS.map(topic => (
                <TabsTrigger
                  key={topic}
                  value={topic}
                  className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600 data-[state=active]:shadow-none rounded-none px-2 font-medium text-muted-foreground bg-transparent"
                >
                  {topic}
                  <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {(words as any[]).filter(w => w.topic === topic).length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {TOPICS.map(topic => (
            <TabsContent key={topic} value={topic} className="pt-6 outline-none">
              {isLoading ? (
                <div className="h-32 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
              ) : currentTopicWords.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
                  <p>No words found in {topic}.</p>
                  {!searchTerm && (
                    <Button variant="link" className="text-purple-600 mt-2" onClick={() => { setNewTopic(topic); setAddModalOpen(true); }}>
                      Add the first word
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {currentTopicWords.map((w: any) => (
                    <Card
                      key={w.id}
                      className={`relative overflow-hidden transition-all duration-300 rounded-xl ${w.known === 'true' ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-card border-border hover:shadow-md hover:-translate-y-1'}`}
                    >
                      {w.known === 'true' && <div className="absolute top-0 right-0 w-16 h-16 bg-green-500 rounded-bl-full -mr-8 -mt-8 opacity-20 pointer-events-none" />}
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-xl font-bold text-foreground leading-tight">{w.word}</h3>
                            <span className="text-xs font-medium text-purple-600 italic">{w.pos}</span>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => removeWord(w.id)}
                            disabled={deleteWord.isPending}
                            className="text-muted-foreground hover:text-red-500 h-8 w-8 -mt-1 -mr-2 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-3 mb-6 flex-1">
                          <p className="text-sm text-foreground">{w.definition}</p>
                          <div className="bg-muted p-3 rounded-lg border-l-4 border-l-purple-300">
                            <p className="text-sm text-muted-foreground italic">"{w.example}"</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => toggleKnown.mutate(w.id)}
                          disabled={toggleKnown.isPending}
                          variant={w.known === 'true' ? "outline" : "default"}
                          className={`w-full mt-auto ${w.known === 'true' ? 'border-green-500 text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400' : 'bg-navy text-white hover:bg-navy/90'}`}
                        >
                          {w.known === 'true' ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Learned ✓</> : "Mark as Learned"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
