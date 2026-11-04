#!/usr/bin/env python3
"""Homepage: replace the "Keep momentum / What's next" card with two cards,
Good Habits and Achievements & Goals, beside Fly and Study.
  * Good Habits: prayers done today (x / 5) and habits done in the last 7 days. Opens Fly > Good Habits.
  * Achievements: achieved count and goals still open. Opens Fly > Achievements.
Needs the Good Habits and Achievements sections to be installed already.
Safe to run twice.   Usage (project root):  python3 move_to_home.py artifacts/ielts-tracker
"""
import os, re, sys
APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
path = os.path.join(APP, "src/App.tsx")
if not os.path.exists(path):
    sys.exit("Run this from the project root:  python3 move_to_home.py artifacts/ielts-tracker")
s = open(path, encoding="utf-8").read()
problems = []

NEW = r'''<div className="flex flex-col gap-4 sm:gap-5">
              <button onClick={() => setLocation('/fly/habits')} className="land-card land-link group relative flex-1 overflow-hidden rounded-[22px] bg-white p-5 text-left">
                <div className="absolute top-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg,#42E6B8,#19C7B7)' }} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#E1FAF3] text-[#0F8F72]"><Leaf className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#64748B]">Fly · Daily</p><h3 className="mt-0.5 text-[16px] font-bold tracking-tight text-[#17243D]" style={{ fontFamily: 'Manrope, sans-serif' }}>Good Habits</h3></div></div>
                  <ArrowUpRight className="mt-1 h-4 w-4 text-[#0F8F72] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5"><p className="text-[19px] leading-none font-bold text-[#17243D]">{homePrayersToday}<span className="text-[12px] font-semibold text-[#64748B]"> / 5</span></p><p className="mt-1.5 text-[10px] text-[#64748B]">Prayers today</p></div>
                  <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5"><p className="text-[19px] leading-none font-bold text-[#17243D]">{homeHabitsWeek}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Done this week</p></div>
                </div>
              </button>
              <button onClick={() => setLocation('/fly/achievements')} className="land-card land-link group relative flex-1 overflow-hidden rounded-[22px] bg-white p-5 text-left">
                <div className="absolute top-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg,#F2C75C,#7C6CFF)' }} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#FDF8EB] text-[#B8860B]"><Mountain className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#64748B]">Fly · Journey</p><h3 className="mt-0.5 text-[16px] font-bold tracking-tight text-[#17243D]" style={{ fontFamily: 'Manrope, sans-serif' }}>Achievements &amp; Goals</h3></div></div>
                  <ArrowUpRight className="mt-1 h-4 w-4 text-[#B8860B] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5"><p className="text-[19px] leading-none font-bold text-[#17243D]">{homeAchieved}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Achieved</p></div>
                  <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5"><p className="text-[19px] leading-none font-bold text-[#17243D]">{homeOpenGoals}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Goals in progress</p></div>
                </div>
              </button>
            </div>'''

QUERIES = '''  const { data: homeHabitLogs = [] } = useQuery({ queryKey: ['home-habit-logs'], queryFn: api.getHabitLogs });
  const { data: homeAchItems = [] } = useQuery({ queryKey: ['home-achievements'], queryFn: api.getAchievements });
  const homeToday = localDateStr(new Date());
  const homeWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return localDateStr(d); })();
  const homePrayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const homePrayersToday = (homeHabitLogs as any[]).filter(l => l.date === homeToday && l.status === 'done' && homePrayerKeys.includes(l.habitKey)).length;
  const homeHabitsWeek = (homeHabitLogs as any[]).filter(l => l.date >= homeWeekStart && l.status === 'done' && !String(l.habitKey).startsWith('_')).length;
  const homeAchieved = (homeAchItems as any[]).filter(i => i.done).length;
  const homeOpenGoals = (homeAchItems as any[]).filter(i => !i.done).length;
'''

if "home-habit-logs" in s:
    print("already: home cards")
else:
    # 1. queries after the practiceLogs query
    ms = list(re.finditer(r"^  const \{ data: practiceLogs = \[\] \}[^\n]*\n", s, re.M))
    # 2. replace the aside
    a = s.find('<aside className="land-card flex flex-col rounded-[22px]')
    b = s.find('</aside>', a) + len('</aside>') if a != -1 else -1
    if len(ms) != 1 or a == -1 or b < a or s.count('<aside className="land-card flex flex-col rounded-[22px]') != 1 or 'Keep momentum' not in s[a:b]:
        problems.append("could not find the Keep momentum card / queries exactly once"); print("MISSING: home cards")
    else:
        s = s[:a] + NEW + s[b:]
        e = ms[0].end()
        s = s[:e] + QUERIES + s[e:]
        print("ok     : home cards")
open(path, "w", encoding="utf-8").write(s)
print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED:"); [print("  -", x) for x in problems]; sys.exit(1)
print("All edits applied.")
