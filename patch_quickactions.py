path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Zap to imports
old_import = "  Rocket, ArrowUpRight, ListChecks, CircleCheckBig, ChevronDown,"
new_import = "  Rocket, ArrowUpRight, ListChecks, CircleCheckBig, ChevronDown, Zap,"
c1 = content.count(old_import)
content = content.replace(old_import, new_import)
print(f"Zap import: {c1} occurrence(s)")

# 2. Redesign Quick Actions bar with icon circles
old_qa = """      {/* Quick Actions bar — overlaps the bottom of the hero */}
      <div className="px-5 sm:px-8 -mt-6 relative z-10">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl px-5 sm:px-7 py-4 flex flex-wrap items-center gap-x-7 gap-y-3" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <span className="text-[13px] font-bold text-foreground shrink-0">Quick Actions</span>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <button onClick={() => setLocation('/fly/applications')} className="flex items-center gap-2 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <FileText className="h-4 w-4" style={{ color: '#684888' }} /> Add Application
          </button>
          <button onClick={() => setLocation('/study/study')} className="flex items-center gap-2 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <BookOpen className="h-4 w-4" style={{ color: '#108888' }} /> Log Study Session
          </button>
          <button onClick={() => setLocation('/study/practice')} className="flex items-center gap-2 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <Target className="h-4 w-4" style={{ color: '#108888' }} /> Practice Test
          </button>
          <button onClick={() => setLocation('/study/vocab')} className="flex items-center gap-2 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <BookMarked className="h-4 w-4" style={{ color: '#108888' }} /> Vocabulary
          </button>
          <button onClick={() => setLocation('/study/planning')} className="flex items-center gap-2 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <CalendarClock className="h-4 w-4" style={{ color: '#684888' }} /> View Planner
          </button>
        </div>
      </div>"""

new_qa = """      {/* Quick Actions bar — overlaps the bottom of the hero */}
      <div className="px-5 sm:px-8 -mt-6 relative z-10">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl px-5 sm:px-7 py-4 flex flex-wrap items-center gap-x-7 gap-y-3" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <span className="flex items-center gap-2 text-[13px] font-bold text-foreground shrink-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FFE3C7' }}>
              <Zap className="h-3.5 w-3.5" style={{ color: '#EA6A1F' }} />
            </span>
            Quick Actions
          </span>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <button onClick={() => setLocation('/fly/applications')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#EAD4FB' }}>
              <FileText className="h-3.5 w-3.5" style={{ color: '#684888' }} />
            </span>
            Add Application
          </button>
          <button onClick={() => setLocation('/study/study')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#C8FBF2' }}>
              <BookOpen className="h-3.5 w-3.5" style={{ color: '#108888' }} />
            </span>
            Log Study Session
          </button>
          <button onClick={() => setLocation('/study/practice')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FBD9E0' }}>
              <Target className="h-3.5 w-3.5" style={{ color: '#D6416A' }} />
            </span>
            Practice Test
          </button>
          <button onClick={() => setLocation('/study/vocab')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#DCEFFB' }}>
              <BookMarked className="h-3.5 w-3.5" style={{ color: '#1D6FA5' }} />
            </span>
            Vocabulary
          </button>
          <button onClick={() => setLocation('/study/planning')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FFE3C7' }}>
              <CalendarClock className="h-3.5 w-3.5" style={{ color: '#EA6A1F' }} />
            </span>
            View Planner
          </button>
        </div>
      </div>"""

c2 = content.count(old_qa)
content = content.replace(old_qa, new_qa)
print(f"Quick Actions bar: {c2} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
