path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """          {/* Fly card */}
          <button
            onClick={onFly}
            className="group relative text-left bg-white rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 border-y border-r border-border shadow-sm"
            style={{ borderLeftWidth: 4, borderLeftColor: '#684888' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'linear-gradient(135deg, #D8B0F8, #F8B8F8)' }}>✈️</div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Fly — Higher Study</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground mb-5">
              Manage your university applications, scholarships, deadlines, documents and everything in between.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <p className="text-lg font-black leading-none" style={{ color: '#684888' }}>{appRows.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Applications</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none" style={{ color: '#684888' }}>{(scholarships as any[]).length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Scholarships</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none" style={{ color: '#684888' }}>{upcomingDeadlineCount}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Upcoming Deadlines</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none" style={{ color: '#684888' }}>{docsTotal > 0 ? `${docsDone}/${docsTotal}` : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Documents Ready</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#684888' }}>
              Continue tracking
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>

          {/* Study card */}
          <button
            onClick={onStudy}
            className="group relative text-left bg-white rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 border-y border-r border-border shadow-sm"
            style={{ borderLeftWidth: 4, borderLeftColor: '#108888' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: 'linear-gradient(135deg, #78F0E0, #C8FBF2)' }}>📚</div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Study Journey</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground mb-5">
              Prepare for IELTS with structured practice, progress tracking and smart insights.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <p className="text-lg font-black leading-none" style={{ color: '#108888' }}>{currentBand !== null ? currentBand.toFixed(1) : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Current Band</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none" style={{ color: '#108888' }}>{practiceThisWeek.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Practice Sessions This Week</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none" style={{ color: '#108888' }}>{minutesThisWeek}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Minutes This Week</p>
              </div>
              <div>
                <p className="text-lg font-black leading-none" style={{ color: '#108888' }}>{avgAccuracy !== null ? `${avgAccuracy}%` : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Avg Accuracy</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#108888' }}>
              Continue learning
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>

          {/* What's Next */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-border flex flex-col">
            <h3 className="text-[13px] font-bold text-foreground mb-3">What&rsquo;s Next</h3>
            {shownItems.length === 0 ? (
              <div className="flex-1 flex items-center gap-2 text-[13px] text-muted-foreground py-4">
                <CircleCheckBig className="h-4 w-4 text-emerald-500 shrink-0" /> All caught up.
              </div>
            ) : (
              <div className="flex-1 space-y-1">
                {shownItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0" style={{ backgroundColor: item.iconBg, color: item.iconColor }}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-foreground truncate">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.sub}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => setLocation('/study/planning')}
              className="mt-3 w-full rounded-xl py-2.5 text-[13px] font-bold text-white text-center transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #684888, #9B4FB8)' }}
            >
              View My Planner
            </button>
          </div>
        </div>"""

new_block = """          {/* Fly card */}
          <button
            onClick={onFly}
            className="group relative text-left rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-sm"
            style={{ background: 'linear-gradient(160deg, #FDEEE8 0%, #FBE9F0 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 bg-white">✈️</div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Fly — Higher Study</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground mb-5">
              Manage your university applications, scholarships, deadlines, documents and everything in between.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl bg-white p-3">
                <FileText className="h-4 w-4 mb-1.5" style={{ color: '#684888' }} />
                <p className="text-lg font-black leading-none text-foreground">{appRows.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Applications</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <GraduationCap className="h-4 w-4 mb-1.5" style={{ color: '#684888' }} />
                <p className="text-lg font-black leading-none text-foreground">{(scholarships as any[]).length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Scholarships</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <CalendarClock className="h-4 w-4 mb-1.5" style={{ color: '#684888' }} />
                <p className="text-lg font-black leading-none text-foreground">{upcomingDeadlineCount}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Upcoming Deadlines</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <ClipboardCheck className="h-4 w-4 mb-1.5" style={{ color: '#684888' }} />
                <p className="text-lg font-black leading-none text-foreground">{docsTotal > 0 ? `${docsDone}/${docsTotal}` : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Documents Ready</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#684888' }}>
              Continue tracking
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>

          {/* Study card */}
          <button
            onClick={onStudy}
            className="group relative text-left rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 shadow-sm"
            style={{ background: 'linear-gradient(160deg, #EAFBF5 0%, #E8F5F0 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 bg-white">📚</div>
              <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>Study Journey</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground mb-5">
              Prepare for IELTS with structured practice, progress tracking and smart insights.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-xl bg-white p-3">
                <BarChart3 className="h-4 w-4 mb-1.5" style={{ color: '#108888' }} />
                <p className="text-lg font-black leading-none text-foreground">{currentBand !== null ? currentBand.toFixed(1) : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Current Band</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <CalendarClock className="h-4 w-4 mb-1.5" style={{ color: '#108888' }} />
                <p className="text-lg font-black leading-none text-foreground">{practiceThisWeek.length}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Practice Sessions This Week</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <Clock className="h-4 w-4 mb-1.5" style={{ color: '#108888' }} />
                <p className="text-lg font-black leading-none text-foreground">{minutesThisWeek}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Minutes This Week</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <Target className="h-4 w-4 mb-1.5" style={{ color: '#108888' }} />
                <p className="text-lg font-black leading-none text-foreground">{avgAccuracy !== null ? `${avgAccuracy}%` : '—'}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Avg Accuracy</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: '#108888' }}>
              Continue learning
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>

          {/* What's Next */}
          <div className="rounded-2xl p-5 shadow-sm flex flex-col" style={{ background: 'linear-gradient(160deg, #F3EEFC 0%, #EFEAF9 100%)' }}>
            <h3 className="text-[13px] font-bold text-foreground mb-3">What&rsquo;s Next</h3>
            {shownItems.length === 0 ? (
              <div className="flex-1 flex items-center gap-2 text-[13px] text-muted-foreground py-4">
                <CircleCheckBig className="h-4 w-4 text-emerald-500 shrink-0" /> All caught up.
              </div>
            ) : (
              <div className="flex-1 space-y-1">
                {shownItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={i}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-white/60"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full shrink-0 bg-white" style={{ color: item.iconColor }}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-foreground truncate">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.sub}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => setLocation('/study/planning')}
              className="mt-3 w-full rounded-xl py-2.5 text-[13px] font-bold text-white text-center transition-transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #6B46C1, #FB923C)' }}
            >
              View My Planner
            </button>
          </div>
        </div>"""

count = content.count(old_block)
content = content.replace(old_block, new_block)
print(f"Three-card section: {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
