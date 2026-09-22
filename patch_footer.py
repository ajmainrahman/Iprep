path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add social icons to imports
old_import = "  Rocket, ArrowUpRight, ListChecks, CircleCheckBig, ChevronDown, Zap,"
new_import = "  Rocket, ArrowUpRight, ListChecks, CircleCheckBig, ChevronDown, Zap, Linkedin, Youtube, Twitter,"
c1 = content.count(old_import)
content = content.replace(old_import, new_import)
print(f"Social icon imports: {c1} occurrence(s)")

# 2. Feature strip + footer redesign
old_block = """        {/* Value strip */}
        <div className="max-w-6xl mx-auto mt-5 bg-white rounded-2xl px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-5 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 shrink-0" style={{ color: '#684888' }} />
            <div><p className="text-[13px] font-bold text-foreground">Structured Preparation</p><p className="text-[11px] text-muted-foreground">Step-by-step academic growth</p></div>
          </div>
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 shrink-0" style={{ color: '#684888' }} />
            <div><p className="text-[13px] font-bold text-foreground">Stay Organized</p><p className="text-[11px] text-muted-foreground">All your tasks in one place</p></div>
          </div>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 shrink-0" style={{ color: '#108888' }} />
            <div><p className="text-[13px] font-bold text-foreground">Track Progress</p><p className="text-[11px] text-muted-foreground">Smart analytics &amp; insights</p></div>
          </div>
          <div className="flex items-center gap-3">
            <Plane className="h-5 w-5 shrink-0" style={{ color: '#108888' }} />
            <div><p className="text-[13px] font-bold text-foreground">Achieve Your Goals</p><p className="text-[11px] text-muted-foreground">Your future starts today</p></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
          Within a Few Weeks <span className="mx-2 text-muted-foreground/40">·</span> Erasmus <span className="mx-2 text-muted-foreground/40">·</span> Europe <span className="mx-2 text-muted-foreground/40">·</span> Beyond
        </p>
      </footer>"""

new_block = """        {/* Value strip */}
        <div className="max-w-6xl mx-auto mt-5 bg-white rounded-2xl px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-5 shadow-sm border border-border">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: '#C8FBF2' }}>
              <GraduationCap className="h-4 w-4" style={{ color: '#108888' }} />
            </span>
            <div><p className="text-[13px] font-bold text-foreground">Structured Preparation</p><p className="text-[11px] text-muted-foreground">Step-by-step academic growth</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: '#FFE3C7' }}>
              <Target className="h-4 w-4" style={{ color: '#EA6A1F' }} />
            </span>
            <div><p className="text-[13px] font-bold text-foreground">Stay Organized</p><p className="text-[11px] text-muted-foreground">All your tasks in one place</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: '#DCEFFB' }}>
              <TrendingUp className="h-4 w-4" style={{ color: '#1D6FA5' }} />
            </span>
            <div><p className="text-[13px] font-bold text-foreground">Track Progress</p><p className="text-[11px] text-muted-foreground">Smart analytics &amp; insights</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: '#EAD4FB' }}>
              <Rocket className="h-4 w-4" style={{ color: '#684888' }} />
            </span>
            <div><p className="text-[13px] font-bold text-foreground">Achieve Your Goals</p><p className="text-[11px] text-muted-foreground">Your future starts today</p></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative overflow-hidden mt-4" style={{ backgroundColor: '#14142B' }}>
        <svg className="absolute -left-12 -bottom-16 w-72 h-72 opacity-25 pointer-events-none" viewBox="0 0 200 200" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="footerWaveGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="100%" stopColor="#6B46C1" />
            </linearGradient>
          </defs>
          <path d="M0,110 C50,190 150,30 200,110 L200,200 L0,200 Z" fill="url(#footerWaveGradient)" />
        </svg>
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">
            Within a Few Weeks <span className="mx-2 text-white/30">·</span> Erasmus <span className="mx-2 text-white/30">·</span> Europe <span className="mx-2 text-white/30">·</span> Beyond
          </p>
          <div className="flex items-center gap-2.5">
            <a href="#" aria-label="LinkedIn" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <Linkedin className="h-4 w-4 text-white" />
            </a>
            <a href="#" aria-label="YouTube" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <Youtube className="h-4 w-4 text-white" />
            </a>
            <a href="#" aria-label="X" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <Twitter className="h-4 w-4 text-white" />
            </a>
          </div>
        </div>
      </footer>"""

c2 = content.count(old_block)
content = content.replace(old_block, new_block)
print(f"Feature strip + footer: {c2} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
