import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';

const MODES = [
  { label: 'Task 1', minutes: 20, desc: 'Describe a graph, chart, or diagram (150+ words)' },
  { label: 'Task 2', minutes: 40, desc: 'Write a discursive essay responding to a point of view (250+ words)' },
];

export function ExamTimer() {
  const [modeIdx, setModeIdx] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(MODES[1].minutes * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [flash, setFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const total = MODES[modeIdx].minutes * 60;
  const progress = Math.max(0, secondsLeft / total);

  const selectMode = (idx: number) => {
    setModeIdx(idx);
    setSecondsLeft(MODES[idx].minutes * 60);
    setRunning(false);
    setFinished(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const beep = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    } catch {}
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            setRunning(false);
            setFinished(true);
            beep();
            setFlash(true);
            setTimeout(() => setFlash(false), 3000);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, beep]);

  const reset = () => {
    setSecondsLeft(MODES[modeIdx].minutes * 60);
    setRunning(false);
    setFinished(false);
    setFlash(false);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const urgency = secondsLeft <= 120 && !finished;
  const timeColor = finished
    ? 'text-green-500'
    : urgency
    ? 'text-red-500'
    : secondsLeft <= 300
    ? 'text-orange-500'
    : 'text-indigo-600 dark:text-indigo-400';

  const ringColor = finished
    ? '#22c55e'
    : urgency
    ? '#ef4444'
    : secondsLeft <= 300
    ? '#f97316'
    : '#6366f1';

  const circumference = 2 * Math.PI * 110;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className={`space-y-8 animate-in fade-in duration-500 transition-colors ${flash ? 'bg-red-100 dark:bg-red-900/30 rounded-2xl' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Timer className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-3xl font-heading font-bold text-navy dark:text-white">Exam Timer</h1>
          <p className="text-sm text-muted-foreground">Practise under real IELTS Writing exam conditions</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-3 justify-center">
        {MODES.map((m, i) => (
          <button
            key={m.label}
            onClick={() => selectMode(i)}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
              modeIdx === i
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40'
                : 'bg-white dark:bg-gray-900 text-muted-foreground border-border hover:border-indigo-400'
            }`}
          >
            {m.label}
            <span className={`ml-2 text-xs font-normal ${modeIdx === i ? 'text-indigo-200' : 'text-muted-foreground'}`}>
              {m.minutes} min
            </span>
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-center text-sm text-muted-foreground max-w-md mx-auto">
        {MODES[modeIdx].desc}
      </p>

      {/* Ring timer */}
      <div className="flex flex-col items-center gap-8">
        <div className="relative" style={{ width: 280, height: 280 }}>
          <svg width="280" height="280" className="-rotate-90">
            <circle cx="140" cy="140" r="110" fill="none" stroke="#e5e7eb" strokeWidth="14" className="dark:stroke-gray-800" />
            <circle
              cx="140" cy="140" r="110"
              fill="none"
              stroke={ringColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {finished ? (
              <div className="text-center">
                <div className="text-5xl mb-1">⏰</div>
                <p className="text-lg font-bold text-green-600">Time's up!</p>
              </div>
            ) : (
              <>
                <span className={`text-6xl font-black font-mono tabular-nums leading-none ${timeColor} ${urgency ? 'animate-pulse' : ''}`}>
                  {mm}:{ss}
                </span>
                <span className="text-xs text-muted-foreground mt-2 font-medium uppercase tracking-widest">
                  remaining
                </span>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-md">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{MODES[modeIdx].label}</span>
            <span>{Math.round(progress * 100)}% remaining</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${progress * 100}%`, backgroundColor: ringColor }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setRunning(r => !r)}
            disabled={finished}
            size="lg"
            className={`px-10 py-6 text-base font-bold rounded-xl shadow-lg ${
              running
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {running ? <><Pause className="w-5 h-5 mr-2" />Pause</> : <><Play className="w-5 h-5 mr-2" />{finished ? 'Done' : secondsLeft === total ? 'Start' : 'Resume'}</>}
          </Button>
          <Button
            onClick={reset}
            variant="outline"
            size="lg"
            className="px-6 py-6 text-base rounded-xl border-2"
          >
            <RotateCcw className="w-5 h-5 mr-2" />Reset
          </Button>
        </div>
      </div>

      {/* Tips */}
      <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
        {[
          { emoji: '✍️', tip: 'Plan your answer before writing (2–3 min)' },
          { emoji: '📝', tip: 'Write clearly — examiners appreciate legible text' },
          { emoji: '⏱️', tip: 'Check your word count at the halfway mark' },
          { emoji: '✅', tip: 'Leave 2 minutes to review grammar & spelling' },
        ].map(({ emoji, tip }) => (
          <div key={tip} className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
            <span className="text-lg">{emoji}</span>
            <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
