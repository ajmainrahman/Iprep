#!/usr/bin/env python3
"""Home: add a third section, "Grow" (personal growth), next to Fly and Study.

  * New sidebar section at /grow with: Good Habits, Achievements, Night Journal, Know Myself.
    (They move out of the Fly sidebar. Old /fly/habits, /fly/achievements, /fly/journal and
    /fly/myself links redirect to the new place, so nothing breaks.)
  * Home page: the two small cards are replaced by one Grow card (same size and style as Fly and
    Study) with prayers today, night streak, achievements and notes to work on.
  * Home heading says "Three paths. One bright direction."
  * The journal banner now opens Grow > Night Journal.

Needs Good Habits, Achievements, Night Journal / Know Myself and the home cards already installed.
Safe to run twice.   Usage (project root):  python3 add_grow_section.py artifacts/ielts-tracker
"""
import os, re, sys
APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
problems = []
app_path = os.path.join(APP, "src/App.tsx")
css_path = os.path.join(APP, "src/index.css")
if not os.path.exists(app_path):
    sys.exit("Run this from the project root:  python3 add_grow_section.py artifacts/ielts-tracker")

def read(p):
    with open(p, encoding="utf-8") as f: return f.read()
def write(p, t):
    with open(p, "w", encoding="utf-8") as f: f.write(t)

s = read(app_path)
for need in ("JournalMoon", "SelfBrain", "homePrayersToday", "homeAchieved", "showJournalBanner", "'/fly/habits'"):
    if need not in s and "Become a little better every day" not in s:
        problems.append("App.tsx is missing something I expected (" + need + "). Install the earlier sections first.")
if problems:
    for x in problems: print("  -", x)
    sys.exit(1)

def step(label, marker, fn):
    """fn(s) -> new s or None when the anchor is not found exactly once."""
    global s
    if marker in s:
        print("already:", label); return
    out = fn(s)
    if out is None:
        problems.append(label + ": anchor not found exactly once"); print("MISSING:", label); return
    s = out; print("ok     :", label)

def insert_after_line(rx, add):
    def f(t):
        ms = list(re.finditer(rx, t, re.M))
        if len(ms) != 1: return None
        return t[:ms[0].end()] + add + t[ms[0].end():]
    return f
def insert_before_line(rx, add):
    def f(t):
        ms = list(re.finditer(rx, t, re.M))
        if len(ms) != 1: return None
        return t[:ms[0].start()] + add + t[ms[0].start():]
    return f

# 1. imports
step("icon + page imports", "GrowSprout", insert_after_line(
    r"^import \{ Moon as JournalMoon, Brain as SelfBrain \} from 'lucide-react';\n",
    "import { Sprout as GrowSprout } from 'lucide-react';\n"
    "import { GoodHabitsTab } from '@/pages/GoodHabits';\n"
    "import { AchievementsTab } from '@/pages/Achievements';\n"
    "import { NightJournalTab } from '@/pages/NightJournal';\n"
    "import { KnowMyselfTab } from '@/pages/KnowMyself';\n"))

# 2. type
step("GrowTab type", "type GrowTab", insert_after_line(
    r"^type StudyTab = [^\n]*\n", "type GrowTab  = 'habits' | 'achievements' | 'journal' | 'myself';\n"))

# 3. move the four tabs from FLY_TABS into GROW_TABS
GROW_TABS = """
const GROW_TABS: NavItem<GrowTab>[] = [
  { id: 'habits',       label: 'Good Habits',   icon: Leaf },
  { id: 'achievements', label: 'Achievements',  icon: Mountain },
  { id: 'journal',      label: 'Night Journal', icon: JournalMoon },
  { id: 'myself',       label: 'Know Myself',   icon: SelfBrain },
];
"""
def move_tabs(t):
    a = t.find("const FLY_TABS")
    if a == -1: return None
    b = t.find("\n];\n", a)
    if b == -1: return None
    block = t[a:b]
    block2 = re.sub(r"^  \{ id: '(habits|achievements|journal|myself)',[^\n]*\n", "", block + "\n", flags=re.M).rstrip("\n")
    return t[:a] + block2 + "\n];\n" + GROW_TABS + t[b + len("\n];\n"):]
step("sidebar tabs moved to Grow", "const GROW_TABS", move_tabs)

# 4. layout
LAYOUT = r'''/* ─── GROW LAYOUT (personal growth: habits, achievements, journal, self-notes) ─── */
function GrowLayout() {
  const params = useParams<{ tab?: string }>();
  const [, setLocation] = useLocation();
  const tab = (GROW_TABS.some(t => t.id === params.tab) ? params.tab : 'habits') as GrowTab;
  function setTab(next: GrowTab) { setLocation(`/grow/${next}`); }
  function onBack() { setLocation('/'); }

  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const pageTitle = GROW_TABS.find(t => t.id === tab)?.label ?? 'Good Habits';

  const bottomWidget = (
    <div className="flex flex-col gap-2">
      <div className="px-1 flex items-center justify-between gap-2 min-w-0">
        <p className="text-[12px] text-sidebar-foreground/60 truncate">{user?.name}</p>
        <button onClick={logout} aria-label="Sign out" title="Sign out" className="text-sidebar-foreground/45 hover:text-sidebar-foreground transition-colors shrink-0">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="grow-mode h-screen overflow-hidden bg-background text-foreground font-sans flex">
      <AppSidebar
        tabs={GROW_TABS}
        activeTab={tab}
        onTab={(nextTab) => setTab(nextTab as GrowTab)}
        onBack={onBack}
        productName="Grow"
        productSubtitle="Personal Growth"
        productIcon={GrowSprout}
        bottomWidget={bottomWidget}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <MobileNavDrawer
        open={mobileNavOpen}
        onOpenChange={setMobileNavOpen}
        tabs={GROW_TABS}
        activeTab={tab}
        onTab={(nextTab) => setTab(nextTab as GrowTab)}
        onBack={onBack}
        productName="Grow"
        productSubtitle="Personal Growth"
        productIcon={GrowSprout}
        bottomWidget={bottomWidget}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <AppHeader
          title={pageTitle}
          subtitle="Personal growth · Within a Few Weeks"
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {tab === 'habits'       && <GoodHabitsTab />}
            {tab === 'achievements' && <AchievementsTab />}
            {tab === 'journal'      && <NightJournalTab />}
            {tab === 'myself'       && <KnowMyselfTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

'''
step("Grow layout", "function GrowLayout", insert_before_line(r"^/\* ─── MAIN APP", LAYOUT))

# 5. routes
step("routes", 'path="/grow/:tab"', insert_after_line(
    r'^      <Route path="/fly"><Redirect to="/fly/overview" /></Route>\n',
    '      <Route path="/fly/habits"><Redirect to="/grow/habits" /></Route>\n'
    '      <Route path="/fly/achievements"><Redirect to="/grow/achievements" /></Route>\n'
    '      <Route path="/fly/journal"><Redirect to="/grow/journal" /></Route>\n'
    '      <Route path="/fly/myself"><Redirect to="/grow/myself" /></Route>\n'
    '      <Route path="/grow"><Redirect to="/grow/habits" /></Route>\n'
    '      <Route path="/grow/:tab"><GrowLayout /></Route>\n'))
# the redirects must come before "/fly/:tab/:id?" - they do, because they are inserted right after "/fly".

# 6. home data
step("home data", "homeNightStreak", insert_after_line(
    r"^  const showJournalBanner = [^\n]*\n",
    """  const { data: homeSelfNotes = [] } = useQuery({ queryKey: ['self-notes'], queryFn: api.getSelfNotes });
  const homeToWorkOn = (homeSelfNotes as any[]).filter(n => n.kind !== 'strength' && n.status !== 'resolved').length;
  const homeNightStreak = (() => {
    const d = new Date();
    if (!homeJournalDays.has(localDateStr(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (homeJournalDays.has(localDateStr(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  })();
"""))

# 7. home card (replaces the two small cards)
CARD = '''<button onClick={() => setLocation('/grow/habits')} className="land-card land-link group relative overflow-hidden rounded-[22px] bg-white p-5 sm:p-6 text-left">
              <div className="absolute top-0 left-0 h-1 w-full" style={{ background: 'linear-gradient(90deg,#42E6B8,#7C6CFF)' }} />
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#E1FAF3] text-[#0F8F72]"><GrowSprout className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#64748B]">Grow · Personal</p><h3 className="mt-0.5 text-[17px] font-bold tracking-tight text-[#17243D]" style={{ fontFamily: 'Manrope, sans-serif' }}>Become a little better every day</h3></div></div>
                <ArrowUpRight className="mt-1 h-4 w-4 text-[#0F8F72] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="mt-4 mb-5 max-w-lg text-[12px] leading-5 text-[#64748B]">Keep your habits, achievements, night journal and honest notes about yourself in one calm place.</p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><Leaf className="mb-2 h-4 w-4 text-[#0F8F72]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{homePrayersToday}<span className="text-[12px] font-semibold text-[#64748B]"> / 5</span></p><p className="mt-1.5 text-[10px] text-[#64748B]">Prayers today</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><JournalMoon className="mb-2 h-4 w-4 text-[#233B63]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{homeNightStreak}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Night streak</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><Mountain className="mb-2 h-4 w-4 text-[#B8860B]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{homeAchieved}</p><p className="mt-1.5 text-[10px] text-[#64748B]">Achieved</p></div>
                <div className="rounded-xl bg-[#F8FAFC] px-3.5 py-3"><SelfBrain className="mb-2 h-4 w-4 text-[#7C6CFF]" /><p className="text-[19px] leading-none font-bold text-[#17243D]">{homeToWorkOn}</p><p className="mt-1.5 text-[10px] text-[#64748B]">To work on</p></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Good Habits', 'Achievements', 'Night Journal', 'Know Myself'].map(x => <span key={x} className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[10px] font-semibold text-[#475569]">{x}</span>)}
              </div>
              <div className="mt-5 flex items-center gap-2 text-[12px] font-semibold text-[#176B73]">Continue growing <ArrowUpRight className="h-3.5 w-3.5" /></div>
            </button>
'''
def replace_cards(t):
    a = t.find('<div className="flex flex-col gap-4 sm:gap-5">\n              <button onClick={() => setLocation(\'/fly/habits\')}')
    if a == -1 or t.count("setLocation('/fly/habits')") != 1: return None
    tail = "              </button>\n            </div>\n"
    b = t.find(tail, t.find("setLocation('/fly/achievements')", a))
    if b == -1: return None
    return t[:a] + CARD + t[b + len(tail):]
step("home Grow card", "Become a little better every day", replace_cards)

def grid3(t):
    old = 'grid grid-cols-1 lg:grid-cols-[1fr_1fr_.82fr] gap-4 sm:gap-5'
    if t.count(old) != 1: return None
    return t.replace(old, 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5')
step("home grid", "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5", grid3)

def heading(t):
    if t.count("Two paths. One bright direction.") != 1: return None
    return t.replace("Two paths. One bright direction.", "Three paths. One bright direction.")
step("home heading", "Three paths. One bright direction.", heading)

step("journal banner link", "setLocation('/grow/journal')", lambda t: t.replace("setLocation('/fly/journal')", "setLocation('/grow/journal')") if t.count("setLocation('/fly/journal')") == 1 else None)
write(app_path, s)

# 8. sidebar colour for Grow
if os.path.exists(css_path):
    c = read(css_path)
    if ".grow-mode" in c:
        print("already: Grow colours")
    else:
        ms = list(re.finditer(r"^/\* ── SHARED DESIGN TOKENS", c, re.M))
        if len(ms) != 1:
            problems.append("index.css anchor"); print("MISSING: Grow colours")
        else:
            add = """/* ── GROW MODE (Aurora Green navigation for the personal-growth section) ── */
.grow-mode {
  --sidebar: 219 45% 16%;
  --sidebar-foreground: 0 0% 100%;
  --sidebar-border: 218 48% 26%;
  --sidebar-primary: 162 76% 52%;    /* Aurora Green — Grow's brand accent */
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 218 48% 26%;
  --sidebar-accent-foreground: 0 0% 100%;
  --sidebar-ring: 162 76% 52%;
}
.grow-mode.dark {
  --sidebar: 219 50% 10%;
  --sidebar-border: 218 40% 20%;
  --sidebar-accent: 218 40% 20%;
}

"""
            write(css_path, c[:ms[0].start()] + add + c[ms[0].start():]); print("ok     : Grow colours")
else:
    problems.append("index.css not found")

print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your files differ from what I expected):")
    for x in problems: print("  -", x)
    sys.exit(1)
print("All edits applied.")
