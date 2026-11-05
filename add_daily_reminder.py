#!/usr/bin/env python3
"""Add a "Daily reminder" card with your six Quran / Hadith quotes.
Shown on: the Home page (above "Your workspace"), the Study (IELTS) Dashboard, and the Fly Overview.
It shows one quote per day (changes at midnight); the arrows let you read the others.
Quote 6 is marked as Bengali so the right font is used.
Safe to run twice.   Usage (project root):  python3 add_daily_reminder.py artifacts/ielts-tracker
"""
import os, re, sys
APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
problems = []
COMPONENT = r"""import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

interface Reminder { text: string; source: string; lang?: string }

export const REMINDERS: Reminder[] = [
  { text: 'Allah will not change the condition of a people until they change what is within themselves.', source: 'Quran 13:11' },
  { text: 'Be keen on what benefits you, seek help from Allah, and do not lose heart.', source: 'Sahih Muslim 2664' },
  { text: 'Once you have made a decision, put your trust in Allah.', source: 'Quran 3:159' },
  { text: 'Each of you is a guardian, and each of you is responsible for those under your care.', source: 'Sahih al-Bukhari 7138' },
  { text: 'Nobody has ever eaten better food than that which they have earned through their own hands.', source: 'Sahih al-Bukhari 2072' },
  { text: 'মুমিনের প্রতিটি অবস্থাই কল্যাণকর। সুখের সময় সে কৃতজ্ঞতা প্রকাশ করে, আর দুঃখ-কষ্টের সময় ধৈর্য ধারণ করে।', source: 'Sahih Muslim 2999', lang: 'bn' },
];

/** One reminder per day (changes at midnight); the arrows let you read the others. */
export function reminderIndexForToday(count: number, now = new Date()) {
  const day = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  return ((day % count) + count) % count;
}

export function DailyReminder({ className = '' }: { className?: string }) {
  const [offset, setOffset] = useState(0);
  const n = REMINDERS.length;
  const idx = (reminderIndexForToday(n) + offset) % n;
  const r = REMINDERS[idx];
  const step = (d: number) => setOffset(o => (((o + d) % n) + n) % n);
  return (
    <figure data-testid="daily-reminder" className={`relative overflow-hidden rounded-2xl border border-[#D5EEF2] px-5 py-4 sm:px-6 ${className}`} style={{ background: 'linear-gradient(120deg, #EAF8FA 0%, #F4F2FF 100%)' }}>
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: 'linear-gradient(180deg, #19C7B7, #7C6CFF)' }} />
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#176B73] shadow-sm"><Quote className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">Daily reminder</p>
          <blockquote lang={r.lang} aria-live="polite" className="mt-1 text-[15px] font-medium leading-7 text-[#17243D] sm:text-base" style={{ fontFamily: 'Manrope, Inter, sans-serif' }}>
            “{r.text}”
          </blockquote>
          <figcaption className="mt-1.5 text-xs font-semibold text-[#64748B]">{r.source}</figcaption>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label="Previous reminder" onClick={() => step(-1)} className="rounded-full p-1.5 text-[#475569] hover:bg-white/80"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" aria-label="Next reminder" onClick={() => step(1)} className="rounded-full p-1.5 text-[#475569] hover:bg-white/80"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </figure>
  );
}
"""
def read(p):
    with open(p, encoding="utf-8") as f: return f.read()
def write(p, t):
    with open(p, "w", encoding="utf-8") as f: f.write(t)
if not os.path.exists(os.path.join(APP, "src/App.tsx")):
    sys.exit("Run this from the project root:  python3 add_daily_reminder.py artifacts/ielts-tracker")
cp = os.path.join(APP, "src/components/DailyReminder.tsx")
if os.path.exists(cp) and read(cp) == COMPONENT: print("already: DailyReminder component")
else: write(cp, COMPONENT); print("ok     : DailyReminder component")

def edit(rel, label, marker, regex, add, after=True):
    path = os.path.join(APP, rel)
    s = read(path)
    if marker in s: print("already:", label); return
    ms = list(re.finditer(regex, s, re.M))
    if len(ms) != 1:
        problems.append(label + ": anchor not found exactly once"); print("MISSING:", label); return
    m = ms[0]
    i = m.end() if after else m.start()
    s = s[:i] + add + s[i:]
    write(path, s); print("ok     :", label)

def import_line(rel, label, imp):
    path = os.path.join(APP, rel)
    s = read(path)
    if "DailyReminder" in s and imp.strip() in s: print("already:", label); return
    ms = list(re.finditer(r"^import React[^\n]*\n", s, re.M))
    if len(ms) != 1:
        problems.append(label + ": import anchor"); print("MISSING:", label); return
    s = s[:ms[0].end()] + imp + s[ms[0].end():]
    write(path, s); print("ok     :", label)

IMP = "import { DailyReminder } from '@/components/DailyReminder';\n"
# Home page
import_line("src/App.tsx", "home import", IMP)
edit("src/App.tsx", "home card", "<DailyReminder className=\"mb-6\" />",
     r'^        <section className="max-w-\[1360px\] mx-auto pt-10 sm:pt-12 pb-8">\n',
     '          <DailyReminder className="mb-6" />\n')
# IELTS dashboard
import_line("src/pages/Dashboard.tsx", "dashboard import", IMP)
edit("src/pages/Dashboard.tsx", "dashboard card", "<DailyReminder />",
     r'^    <div className="study-dashboard space-y-6 sm:space-y-8">\n', '      <DailyReminder />\n')
# Fly overview
import_line("src/pages/HigherStudyPrep.tsx", "fly import", IMP)
edit("src/pages/HigherStudyPrep.tsx", "fly overview card", "<DailyReminder />",
     r"^    <div className=\"space-y-5 pb-4\" style=\{\{ color: 'var\(--apps-text-primary\)' \}\}>\n", '      <DailyReminder />\n')
print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED:")
    for x in problems: print("  -", x)
    sys.exit(1)
print("All edits applied.")
