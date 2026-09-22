path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_nav = """      {/* Top nav bar */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-3.5 bg-white border-b border-border">
        <div className="flex items-center gap-3">
          <img src="/images/logo-mark.png" alt="Within a Few Weeks" width="34" height="34" className="shrink-0" />
          <span className="font-bold text-[16px] tracking-tight text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Within a Few Weeks
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-[13px] font-medium text-muted-foreground">{user?.name}</span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #684888, #9B4FB8)' }}
          >
            {initials}
          </span>
          <button
            onClick={logout}
            className="text-[13px] font-medium px-4 py-1.5 rounded-full transition-colors hover:bg-muted bg-white border border-border text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </nav>"""

new_nav = """      {/* Top nav bar */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-3.5 bg-white border-b border-border">
        <div className="flex items-center gap-3">
          <img src="/images/logo-mark.png" alt="Within a Few Weeks" width="34" height="34" className="shrink-0" />
          <span className="font-bold text-[16px] tracking-tight text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Within a Few Weeks
          </span>
        </div>
        <div className="hidden md:flex items-center gap-7">
          <span className="text-[13.5px] font-semibold pb-1 border-b-2" style={{ color: '#FB923C', borderColor: '#FB923C' }}>Home</span>
          <button onClick={onStudy} className="text-[13.5px] font-medium text-foreground/70 hover:text-foreground transition-colors pb-1 border-b-2 border-transparent">My Study</button>
          <span title="Coming soon" className="text-[13.5px] font-medium text-muted-foreground/50 cursor-not-allowed pb-1 border-b-2 border-transparent">Resources</span>
          <span title="Coming soon" className="text-[13.5px] font-medium text-muted-foreground/50 cursor-not-allowed pb-1 border-b-2 border-transparent">Community</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-[13px] font-medium text-muted-foreground">{user?.name}</span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #684888, #9B4FB8)' }}
          >
            {initials}
          </span>
          <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
          <button
            onClick={logout}
            className="text-[13px] font-semibold px-4 py-1.5 rounded-full text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#14142B' }}
          >
            Sign out
          </button>
        </div>
      </nav>"""

count = content.count(old_nav)
content = content.replace(old_nav, new_nav)
print(f"Nav bar: {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
