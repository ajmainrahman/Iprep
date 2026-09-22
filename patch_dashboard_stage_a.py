path = "artifacts/ielts-tracker/src/pages/Dashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add useLocation import from wouter
old_imports = "import { DashboardHeroIllustration } from '@/components/illustrations/HigherStudyIllustrations';"
new_imports = "import { DashboardHeroIllustration } from '@/components/illustrations/HigherStudyIllustrations';\nimport { useLocation } from 'wouter';"
c1 = content.count(old_imports)
content = content.replace(old_imports, new_imports)
print(f"[{c1}x] useLocation import")

# 2. Add a standalone streak helper (same proven logic as StreakTracker, reusable for the stat card)
old_anchor = """function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}"""
new_anchor = """function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function calcCurrentStreak(sessions: any[]): number {
  const dayMap: Record<string, number> = {};
  sessions.forEach((session: any) => {
    const date = String(session.date || '');
    if (date) dayMap[date] = (dayMap[date] || 0) + Number(session.minutes || 0);
  });
  const activeDays = new Set(Object.keys(dayMap).filter(date => dayMap[date] > 0));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateStr(today);
  const yesterday = addDays(today, -1);
  const streakStart = activeDays.has(todayKey) ? today : yesterday;
  let currentStreak = 0;
  let cursor = streakStart;
  while (activeDays.has(localDateStr(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }
  return currentStreak;
}"""
c2 = content.count(old_anchor)
content = content.replace(old_anchor, new_anchor)
print(f"[{c2}x] calcCurrentStreak helper")

# 3. Compute currentStreak inside Dashboard() and add useLocation hook
old_hook_anchor = "export function Dashboard() {\n  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });"
new_hook_anchor = "export function Dashboard() {\n  const [, setLocation] = useLocation();\n  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ['settings'], queryFn: api.getSettings });"
c3 = content.count(old_hook_anchor)
content = content.replace(old_hook_anchor, new_hook_anchor)
print(f"[{c3}x] useLocation hook + streak setup")

# 4. Insert the 4-card stat row right after the Hero block, before "Top cards"
old_top_cards_comment = """      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">"""
new_top_cards_comment = """      {/* Quick stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setLocation('/study/study')} className="text-left rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(160deg, #FDEEE8 0%, #FBE9F0 100%)' }}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><Flame className="h-4 w-4" style={{ color: '#EA6A1F' }} /></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground mt-3">Study Streak</p>
          <p className="text-2xl font-black leading-none mt-1" style={{ color: '#14142B' }}>{calcCurrentStreak(sessions as any[])} {calcCurrentStreak(sessions as any[]) === 1 ? 'day' : 'days'}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Keep it up!</p>
        </button>

        <button onClick={() => setLocation('/study/scores')} className="text-left rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(160deg, #F3EEFC 0%, #EFEAF9 100%)' }}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><Target className="h-4 w-4" style={{ color: '#6B46C1' }} /></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground mt-3">IELTS Exam</p>
          <p className="text-2xl font-black leading-none mt-1" style={{ color: '#14142B' }}>{!hasExamDate ? 'Not set' : daysRemaining < 0 ? 'Passed' : `${daysRemaining} days`}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Left to apply</p>
        </button>

        <button onClick={() => setLocation('/study/scores')} className="text-left rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(160deg, #EAFBF5 0%, #E8F5F0 100%)' }}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><BookOpen className="h-4 w-4" style={{ color: '#108888' }} /></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground mt-3">Modules</p>
          <p className="text-2xl font-black leading-none mt-1" style={{ color: '#14142B' }}>{totalScores.length} / 4</p>
          <p className="text-[11px] text-muted-foreground mt-1">Completed</p>
        </button>

        <button onClick={() => setLocation('/study/scores')} className="text-left rounded-2xl p-5 transition-transform hover:-translate-y-0.5" style={{ background: 'linear-gradient(160deg, #DCEFFB 0%, #E4F0FB 100%)' }}>
          <div className="flex items-start justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white"><TrendingUp className="h-4 w-4" style={{ color: '#1D6FA5' }} /></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 mt-1" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground mt-3">Target Band</p>
          <p className="text-2xl font-black leading-none mt-1" style={{ color: '#14142B' }}>{overallTarget.toFixed(1)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Overall</p>
        </button>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">"""
c4 = content.count(old_top_cards_comment)
content = content.replace(old_top_cards_comment, new_top_cards_comment)
print(f"[{c4}x] 4-card stat row inserted")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
