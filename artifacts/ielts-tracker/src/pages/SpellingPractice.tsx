import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, RotateCcw, Ear, BookText, SpellCheck } from 'lucide-react';

type Mode = 'dictation' | 'definition';
type VocabWord = { id: number; word: string; pos: string; definition: string; example: string; topic: string };

export function SpellingPractice() {
  const [mode, setMode] = useState<Mode>('dictation');
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false); // dictation mode: word shown briefly, then hidden
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [results, setResults] = useState<{ word: string; correct: boolean }[]>([]);

  const { data: session = [], isLoading, refetch } = useQuery<VocabWord[]>({
    queryKey: ['spelling-session'],
    queryFn: () => api.getSpellingSession({ count: 10 }) as Promise<VocabWord[]>,
    enabled: false,
  });

  const { data: stats } = useQuery({
    queryKey: ['spelling-stats'],
    queryFn: api.getSpellingStats,
  });

  const logAttempt = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.logSpellingAttempt(body),
  });

  const current = session[index];
  const isLastWord = index >= session.length - 1;

  async function startSession() {
    setIndex(0); setAnswer(''); setFeedback(null); setResults([]); setRevealed(mode === 'definition');
    const { data } = await refetch();
    setStarted(true);
    if (mode === 'dictation' && data && data.length > 0) {
      setRevealed(true);
      setTimeout(() => setRevealed(false), 2500);
    }
  }

  function submitAnswer() {
    if (!current || feedback) return;
    const correct = answer.trim().toLowerCase() === current.word.trim().toLowerCase();
    setFeedback(correct ? 'correct' : 'incorrect');
    setResults(prev => [...prev, { word: current.word, correct }]);
    logAttempt.mutate({
      vocabWordId: current.id,
      mode,
      wasCorrect: correct,
      typedAnswer: answer,
    });
  }

  function nextWord() {
    if (isLastWord) {
      setStarted(false);
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setAnswer('');
    setFeedback(null);
    if (mode === 'dictation') {
      setRevealed(true);
      setTimeout(() => setRevealed(false), 2500);
    } else {
      setRevealed(true);
    }
  }

  const correctCount = results.filter(r => r.correct).length;
  const sessionDone = started === false && results.length > 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-bold text-lg flex items-center gap-2">
          <SpellCheck className="w-5 h-5 text-indigo" />
          Spelling Practice
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Practice spelling your saved vocabulary — from memory, or from the definition.
        </p>
      </div>

      {stats != null && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black">{(stats as any).accuracy ?? 0}%</p><p className="text-[11px] text-muted-foreground mt-1">Accuracy</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black">{(stats as any).wordsPracticed ?? 0}</p><p className="text-[11px] text-muted-foreground mt-1">Words practiced</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-black">{(stats as any).masteredCount ?? 0}</p><p className="text-[11px] text-muted-foreground mt-1">Mastered</p></CardContent></Card>
        </div>
      )}

      {!started && !sessionDone && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm font-semibold">Choose a mode</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('dictation')}
                className={`rounded-xl border p-4 text-left transition-colors ${mode === 'dictation' ? 'border-indigo bg-indigo/5' : 'border-border'}`}
              >
                <Ear className="w-5 h-5 text-indigo mb-2" />
                <p className="font-semibold text-sm">Dictation</p>
                <p className="text-xs text-muted-foreground mt-1">See the word briefly, then spell it from memory.</p>
              </button>
              <button
                onClick={() => setMode('definition')}
                className={`rounded-xl border p-4 text-left transition-colors ${mode === 'definition' ? 'border-indigo bg-indigo/5' : 'border-border'}`}
              >
                <BookText className="w-5 h-5 text-indigo mb-2" />
                <p className="font-semibold text-sm">Definition Recall</p>
                <p className="text-xs text-muted-foreground mt-1">Read the definition, type the matching word.</p>
              </button>
            </div>
            <Button onClick={startSession} disabled={isLoading} className="w-full bg-navy hover:bg-navy/90 dark:bg-indigo text-white">
              Start Session
            </Button>
          </CardContent>
        </Card>
      )}

      {started && session.length === 0 && !isLoading && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          No vocabulary words found yet. Add some words in Vocabulary Bank first.
        </CardContent></Card>
      )}

      {started && current && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Word {index + 1} of {session.length}</span>
              <span>{correctCount} correct so far</span>
            </div>
            <Progress value={((index) / session.length) * 100} />

            {mode === 'dictation' ? (
              <div className="text-center py-4">
                {revealed ? (
                  <p className="text-3xl font-black tracking-wide">{current.word}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Now type the word you just saw…</p>
                )}
              </div>
            ) : (
              <div className="py-2 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{current.pos}</p>
                <p className="text-base font-semibold">{current.definition}</p>
                {current.example && <p className="text-sm italic text-muted-foreground">"{current.example}"</p>}
              </div>
            )}

            {!feedback ? (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Type the word…"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                />
                <Button onClick={submitAnswer} className="bg-navy hover:bg-navy/90 dark:bg-indigo text-white shrink-0">Check</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-semibold ${feedback === 'correct' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {feedback === 'correct' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                  {feedback === 'correct' ? 'Correct!' : (
                    <span>Not quite — the correct spelling is <strong>{current.word}</strong></span>
                  )}
                </div>
                <Button onClick={nextWord} className="w-full bg-navy hover:bg-navy/90 dark:bg-indigo text-white">
                  {isLastWord ? 'Finish Session' : 'Next Word'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {sessionDone && (
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-2xl font-black">{correctCount} / {results.length}</p>
            <p className="text-sm text-muted-foreground">words spelled correctly this session.</p>
            <Button onClick={() => { setResults([]); }} variant="ghost" className="gap-2">
              <RotateCcw className="w-4 h-4" /> Practice Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
