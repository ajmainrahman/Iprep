path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Leaf, Mountain to imports
old_import = "  Rocket, ArrowUpRight, ListChecks, CircleCheckBig, ChevronDown, Zap, Linkedin, Youtube, Twitter,"
new_import = "  Rocket, ArrowUpRight, ListChecks, CircleCheckBig, ChevronDown, Zap, Linkedin, Youtube, Twitter, Leaf, Mountain,"
c1 = content.count(old_import)
content = content.replace(old_import, new_import)
print(f"[{c1}x] Leaf/Mountain import")

# 2. Tablet breakpoint on the 3-card grid
old_grid = '<div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1fr_0.85fr] gap-5">'
new_grid = '<div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_0.85fr] gap-5">'
c2 = content.count(old_grid)
content = content.replace(old_grid, new_grid)
print(f"[{c2}x] Grid tablet breakpoint")

# 3. Fly card: add overflow-hidden + decorative Plane icon, and per-stat colors
old_fly_open = """          <button
            onClick={onFly}
            className="group relative text-left rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-sm"
            style={{ background: 'linear-gradient(160deg, #FDEEE8 0%, #FBE9F0 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">"""
new_fly_open = """          <button
            onClick={onFly}
            className="group relative overflow-hidden text-left rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-sm"
            style={{ background: 'linear-gradient(160deg, #FDEEE8 0%, #FBE9F0 100%)' }}
          >
            <Plane className="absolute -right-5 -bottom-5 h-28 w-28 rotate-[18deg] opacity-[0.08] pointer-events-none" style={{ color: '#D6416A' }} />
            <div className="relative flex items-center gap-3 mb-4">"""
c3 = content.count(old_fly_open)
content = content.replace(old_fly_open, new_fly_open)
print(f"[{c3}x] Fly card decorative icon + overflow-hidden")

old_fly_stats = """            <p className="text-[13px] leading-relaxed text-muted-foreground mb-5">
              Manage your university applications, scholarships, deadlines, documents and everything in between.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl bg-white p-3">
                <FileText className="h-4 w-4 mb-1.5" style={{ color: '#D6416A' }} />
                <p className="text-lg font-black leading-none text-foreground">{appRows.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Applications</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <GraduationCap className="h-4 w-4 mb-1.5" style={{ color: '#D6416A' }} />
                <p className="text-lg font-black leading-none text-foreground">{(scholarships as any[]).length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Scholarships</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <CalendarClock className="h-4 w-4 mb-1.5" style={{ color: '#D6416A' }} />
                <p className="text-lg font-black leading-none text-foreground">{upcomingDeadlineCount}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Upcoming Deadlines</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <ClipboardCheck className="h-4 w-4 mb-1.5" style={{ color: '#D6416A' }} />
                <p className="text-lg font-black leading-none text-foreground">{docsTotal > 0 ? `${docsDone}/${docsTotal}` : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Documents Ready</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#D6416A' }}>
              Continue tracking
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>"""

new_fly_stats = """            <p className="relative text-[13px] leading-relaxed text-muted-foreground mb-5">
              Manage your university applications, scholarships, deadlines, documents and everything in between.
            </p>
            <div className="relative grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl bg-white p-3">
                <FileText className="h-4 w-4 mb-1.5" style={{ color: '#6B46C1' }} />
                <p className="text-lg font-black leading-none text-foreground">{appRows.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Applications</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <GraduationCap className="h-4 w-4 mb-1.5" style={{ color: '#EA6A1F' }} />
                <p className="text-lg font-black leading-none text-foreground">{(scholarships as any[]).length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Scholarships</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <CalendarClock className="h-4 w-4 mb-1.5" style={{ color: '#D6416A' }} />
                <p className="text-lg font-black leading-none text-foreground">{upcomingDeadlineCount}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Upcoming Deadlines</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <ClipboardCheck className="h-4 w-4 mb-1.5" style={{ color: '#108888' }} />
                <p className="text-lg font-black leading-none text-foreground">{docsTotal > 0 ? `${docsDone}/${docsTotal}` : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Documents Ready</p>
              </div>
            </div>
            <span className="relative flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#D6416A' }}>
              Continue tracking
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>"""

c4 = content.count(old_fly_stats)
content = content.replace(old_fly_stats, new_fly_stats)
print(f"[{c4}x] Fly card per-stat colors")

# 4. Study card: overflow-hidden + decorative Leaf icon
old_study_open = """          <button
            onClick={onStudy}
            className="group relative text-left rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-sm"
            style={{ background: 'linear-gradient(160deg, #EAFBF5 0%, #E8F5F0 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 bg-white">📚</div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Study Journey</h2>
            </div>"""
new_study_open = """          <button
            onClick={onStudy}
            className="group relative overflow-hidden text-left rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-sm"
            style={{ background: 'linear-gradient(160deg, #EAFBF5 0%, #E8F5F0 100%)' }}
          >
            <Leaf className="absolute -right-4 -bottom-6 h-28 w-28 rotate-[-12deg] opacity-[0.08] pointer-events-none" style={{ color: '#108888' }} />
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 bg-white">📚</div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Study Journey</h2>
            </div>"""
c5 = content.count(old_study_open)
content = content.replace(old_study_open, new_study_open)
print(f"[{c5}x] Study card decorative icon + overflow-hidden")

old_study_rest = """            <p className="text-[13px] leading-relaxed text-muted-foreground mb-5">
              Prepare for IELTS with structured practice, progress tracking and smart insights.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">"""
new_study_rest = """            <p className="relative text-[13px] leading-relaxed text-muted-foreground mb-5">
              Prepare for IELTS with structured practice, progress tracking and smart insights.
            </p>
            <div className="relative grid grid-cols-2 gap-3 mb-5">"""
c6 = content.count(old_study_rest)
content = content.replace(old_study_rest, new_study_rest)
print(f"[{c6}x] Study card relative wrap")

old_study_cta = """            <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#108888' }}>
              Continue learning
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>"""
new_study_cta = """            <span className="relative flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#108888' }}>
              Continue learning
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>"""
c7 = content.count(old_study_cta)
content = content.replace(old_study_cta, new_study_cta)
print(f"[{c7}x] Study card CTA relative wrap")

# 5. What's Next: span full width on tablet, overflow-hidden + decorative Mountain icon
old_next_open = """          {/* What's Next */}
          <div className="rounded-2xl p-5 shadow-sm flex flex-col" style={{ background: 'linear-gradient(160deg, #F3EEFC 0%, #EFEAF9 100%)' }}>
            <h3 className="text-[13px] font-bold text-foreground mb-3">What&rsquo;s Next</h3>"""
new_next_open = """          {/* What's Next */}
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm flex flex-col md:col-span-2 lg:col-span-1" style={{ background: 'linear-gradient(160deg, #F3EEFC 0%, #EFEAF9 100%)' }}>
            <Mountain className="absolute -right-5 -bottom-4 h-24 w-24 opacity-[0.08] pointer-events-none" style={{ color: '#6B46C1' }} />
            <h3 className="relative text-[13px] font-bold text-foreground mb-3">What&rsquo;s Next</h3>"""
c8 = content.count(old_next_open)
content = content.replace(old_next_open, new_next_open)
print(f"[{c8}x] What's Next decorative icon + span")

old_next_body = """            {shownItems.length === 0 ? (
              <div className="flex-1 flex items-center gap-2 text-[13px] text-muted-foreground py-4">
                <CircleCheckBig className="h-4 w-4 text-emerald-500 shrink-0" /> All caught up.
              </div>
            ) : (
              <div className="flex-1 space-y-1">"""
new_next_body = """            {shownItems.length === 0 ? (
              <div className="relative flex-1 flex items-center gap-2 text-[13px] text-muted-foreground py-4">
                <CircleCheckBig className="h-4 w-4 text-emerald-500 shrink-0" /> All caught up.
              </div>
            ) : (
              <div className="relative flex-1 space-y-1">"""
c9 = content.count(old_next_body)
content = content.replace(old_next_body, new_next_body)
print(f"[{c9}x] What's Next body relative wrap")

old_next_btn = """            <button
              onClick={() => setLocation('/study/planning')}
              className="mt-3 w-full rounded-xl py-2.5 text-[13px] font-bold text-white text-center transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #6B46C1, #FB923C)' }}
            >
              View My Planner
            </button>
          </div>
        </div>"""
new_next_btn = """            <button
              onClick={() => setLocation('/study/planning')}
              className="relative mt-3 w-full rounded-xl py-2.5 text-[13px] font-bold text-white text-center transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #6B46C1, #FB923C)' }}
            >
              View My Planner
            </button>
          </div>
        </div>"""
c10 = content.count(old_next_btn)
content = content.replace(old_next_btn, new_next_btn)
print(f"[{c10}x] What's Next button relative wrap")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
