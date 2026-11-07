#!/usr/bin/env python3
"""Fly Overview update.

1. Total Applied card: number only (no subtext).
2. Applications / Scholarships cards: totals that do NOT count "Not Applied".
3. Docs / requirements: unchanged logic.
4. Due in 30 days: now a clickable card. It opens a list of exactly which targets are due
   (only ones that still need action: not "Not Applied", not already submitted/closed), soonest first.
5. Ongoing now: "Show all N" / "Show fewer" button so every ongoing item can be seen.
6. "Priority actions" block removed; replaced by an Insights section:
   - Pipeline by status (applications vs scholarships)
   - Deadlines by month (next 6 months + how many already passed without applying)
   - Document readiness by country
   - Key numbers (applied progress, response rate, offers/awards, funding secured, priority mix)

Needs add_ongoing_status.py installed first. Safe to run twice.
Usage (project root):  python3 update_overview.py artifacts/ielts-tracker
"""
import os, sys
APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
path = os.path.join(APP, "src/pages/HigherStudyPrep.tsx")
if not os.path.exists(path):
    sys.exit("Run this from the project root:  python3 update_overview.py artifacts/ielts-tracker")
s = open(path, encoding="utf-8").read()
problems = []
if "function isOngoingRecord(" not in s:
    sys.exit("Install add_ongoing_status.py first (it adds the Ongoing status).")

def rep(old, new, label, marker=None):
    global s
    if (marker or new) in s:
        print("already:", label); return
    if s.count(old) != 1:
        problems.append(f"{label}: expected 1 match, found {s.count(old)}"); print("MISSING:", label); return
    s = s.replace(old, new); print("ok     :", label)

def region(start, end, new, label, marker):
    """Replace text from `start` up to (not including) `end`."""
    global s
    if marker in s:
        print("already:", label); return
    if s.count(start) != 1:
        problems.append(f"{label}: start anchor found {s.count(start)}x"); print("MISSING:", label); return
    a = s.index(start)
    b = s.index(end, a)
    s = s[:a] + new + s[b:]; print("ok     :", label)

# ---- state -------------------------------------------------------------------------------
rep("  const [collapsedCountries, setCollapsedCountries] = useState<Record<string, boolean>>({});\n",
    "  const [collapsedCountries, setCollapsedCountries] = useState<Record<string, boolean>>({});\n"
    "  const [dueOpen, setDueOpen] = useState(false);\n"
    "  const [ongoingAll, setOngoingAll] = useState(false);\n",
    "overview state", marker="const [dueOpen, setDueOpen]")

# ---- due in 30 days: only things that still need action ----------------------------------
rep("  const next30Days = upcomingDeadlines.filter(record => (daysUntil(record.deadline || '') ?? 999) <= 30);\n",
"""  // "Due" = still needs action: not Not Applied and not already submitted / finished.
  const baseStatus = (value: unknown) => String(value || '').replace(/_manual$/, '');
  const SUBMITTED_APP = ['applied', 'interview', 'offer', 'accepted', 'waitlisted', 'rejected', 'deferred', 'withdrawn', 'missed_deadline'];
  const SUBMITTED_SCH = ['applied', 'interview', 'awarded', 'waitlisted', 'rejected', 'expired', 'not_eligible'];
  const needsAction = (record: UnifiedRecord) => {
    const appOpen = !!record.app && !SUBMITTED_APP.includes(normalizeAppStatus(baseStatus(record.app.status)));
    const schOpen = !!record.scholarship && !SUBMITTED_SCH.includes(normalizeScholarshipStatus(baseStatus(record.scholarship.status)));
    return appOpen || schOpen;
  };
  const next30Days = upcomingDeadlines.filter(record => (daysUntil(record.deadline || '') ?? 999) <= 30 && needsAction(record));
""", "due in 30 days logic", marker="const needsAction = (record: UnifiedRecord)")

# ---- remove priorityActions computation -----------------------------------------------------
region("  const priorityActions = unifiedRecords\n", "  function TypeMark(", "", "remove priorityActions computation",
       marker="@@never-present@@") if "  const priorityActions = unifiedRecords\n" in s else print("already: remove priorityActions computation")

# ---- analytics data -------------------------------------------------------------------------
ANALYTICS = """  const notYetAppliedCount = (applicationRows.length - appliedApplicationCount) + (scholarshipRows.length - appliedScholarshipCount);
"""
rep(ANALYTICS, """  // Not Applied items are left out of every overview total.
  const activeApplicationCount = applicationRows.filter(app => !isAppNotApplied(app.status)).length;
  const activeScholarshipCount = scholarshipRows.filter(item => !isSchNotApplied(item.status)).length;

  // ---- Insights ----
  const PIPE_STAGES = [
    { key: 'researching', label: 'Researching' },
    { key: 'ongoing', label: 'Ongoing' },
    { key: 'ready', label: 'Ready to Apply' },
    { key: 'applied', label: 'Applied' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer / Awarded' },
    { key: 'waitlisted', label: 'Waitlist' },
    { key: 'rejected', label: 'Rejected' },
  ] as const;
  const pipeKeyApp = (value: unknown): string => {
    const st = normalizeAppStatus(baseStatus(value));
    return st === 'ready_to_apply' ? 'ready' : st;
  };
  const pipeKeySch = (value: unknown): string => {
    const st = normalizeScholarshipStatus(baseStatus(value));
    return st === 'preparing' ? 'ready' : st === 'awarded' ? 'offer' : st;
  };
  const pipeRows = PIPE_STAGES.map(stage => ({
    ...stage,
    apps: applicationRows.filter(app => pipeKeyApp(app.status) === stage.key).length,
    schs: scholarshipRows.filter(item => pipeKeySch(item.status) === stage.key).length,
  }));
  const pipeMax = Math.max(1, ...pipeRows.map(row => row.apps + row.schs));

  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      key,
      label: d.toLocaleString('en', { month: 'short' }),
      count: unifiedRecords.filter(record => needsAction(record) && (record.deadline || '').startsWith(key) && (daysUntil(record.deadline || '') ?? -1) >= 0).length,
    };
  });
  const monthMax = Math.max(1, ...monthBuckets.map(m => m.count));
  const pastDueCount = unifiedRecords.filter(record => needsAction(record) && (daysUntil(record.deadline || '') ?? 0) < 0).length;

  const countryReadiness = Object.values(
    unifiedRecords.reduce<Record<string, { country: string; done: number; total: number }>>((acc, record) => {
      const reqs = activeRequirementsFor(record);
      if (!reqs.length) return acc;
      const row = acc[record.country] || (acc[record.country] = { country: record.country, done: 0, total: 0 });
      row.total += reqs.length;
      row.done += reqs.filter(item => item.done).length;
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total).slice(0, 6);

  const respondedCount =
    applicationRows.filter(app => ['interview', 'offer'].includes(pipeKeyApp(app.status))).length +
    scholarshipRows.filter(item => ['interview', 'offer'].includes(pipeKeySch(item.status))).length;
  const offerCount =
    applicationRows.filter(app => pipeKeyApp(app.status) === 'offer').length +
    scholarshipRows.filter(item => pipeKeySch(item.status) === 'offer').length;
  const responsePercent = totalAppliedCount ? Math.round((respondedCount / totalAppliedCount) * 100) : 0;
  const activeTargetCount = activeApplicationCount + activeScholarshipCount;
  const appliedPercent = activeTargetCount ? Math.round((totalAppliedCount / activeTargetCount) * 100) : 0;
  const fundingSecured = Object.entries(
    scholarshipRows.filter(item => pipeKeySch(item.status) === 'offer' && Number(item.amount) > 0).reduce<Record<string, number>>((acc, item) => {
      const cur = String(item.currency || '').trim() || '—';
      acc[cur] = (acc[cur] || 0) + Number(item.amount);
      return acc;
    }, {}),
  ).map(([cur, amount]) => `${amount.toLocaleString()} ${cur}`).join(' + ');
  const activeRecordsForPriority = unifiedRecords.filter(record => !isDisabledRecord(record));
  const priorityMix = (['high', 'medium', 'low'] as const).map(p => ({ p, n: activeRecordsForPriority.filter(record => record.priority === p).length }));
""", "analytics data", marker="const PIPE_STAGES = [")

# ---- stat cards ----------------------------------------------------------------------------
rep("""              <p className="mt-1 text-[10px] text-white/70">{appliedApplicationCount} application{appliedApplicationCount === 1 ? '' : 's'} · {appliedScholarshipCount} scholarship{appliedScholarshipCount === 1 ? '' : 's'}</p>
""", "", "Total Applied: remove subtext", marker="@@never-present@@") if "{appliedApplicationCount} application{appliedApplicationCount" in s else print("already: Total Applied: remove subtext")
rep("""          {notYetAppliedCount > 0 && <p className="mt-2 text-[10px] text-white/50">{notYetAppliedCount} not applied yet</p>}
""", "", "Total Applied: remove 'not applied yet'", marker="@@never-present@@") if "not applied yet</p>}" in s else print("already: Total Applied: remove 'not applied yet'")

STAT_START = "        {[\n          { label: 'Applications'"
STAT_END = '      <div data-testid="overview-ongoing-card"'
region(STAT_START, STAT_END, """        {[
          { label: 'Applications', value: activeApplicationCount, icon: GraduationCap, tone: '#DDF4F7', ink: '#176B73', testId: 'total-applications' },
          { label: 'Scholarships', value: activeScholarshipCount, icon: Trophy, tone: '#FDF8EB', ink: '#B8860B', testId: 'total-scholarships' },
          { label: 'Docs / requirements', value: `${completedRequirementItems}/${totalRequirementItems}`, icon: ClipboardList, tone: '#F2F0FF', ink: '#7C6CFF', testId: 'completed-requirements' },
          { label: 'Due in 30 days', value: next30Days.length, icon: CalendarClock, tone: '#FBEEEE', ink: '#D95757', testId: 'upcoming-deadlines', onClick: () => setDueOpen(true), hint: 'Tap to see which' },
        ].map(stat => {
          const cls = 'rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(35, 59, 99, 0.04)]';
          const body = (
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-heading text-2xl font-bold" style={{ color: 'var(--apps-text-primary)' }}>{stat.value}</p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">{stat.label}</p>
                {stat.hint && <p className="mt-0.5 text-[10px] font-semibold text-[#D95757]">{stat.hint}</p>}
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: stat.tone, color: stat.ink }}><stat.icon className="h-4 w-4" /></span>
            </div>
          );
          return stat.onClick ? (
            <button key={stat.label} type="button" data-testid={`unified-stat-${stat.testId}`} onClick={stat.onClick} className={`${cls} min-h-[44px] cursor-pointer text-left transition-all hover:-translate-y-0.5 hover:shadow-md`} style={{ borderColor: 'var(--apps-border)' }}>{body}</button>
          ) : (
            <div key={stat.label} data-testid={`unified-stat-${stat.testId}`} className={cls} style={{ borderColor: 'var(--apps-border)' }}>{body}</div>
          );
        })}
      </div>

""", "stat cards", marker="onClick: () => setDueOpen(true)")

# ---- ongoing: show all ----------------------------------------------------------------------
rep("{ongoingRecords.slice(0, 6).map(record => {", "{(ongoingAll ? ongoingRecords : ongoingRecords.slice(0, 6)).map(record => {", "ongoing: list all", marker="(ongoingAll ? ongoingRecords")
rep("""            {ongoingRecords.length > 6 && <p className="px-1 text-[11px] text-[#176B73] sm:col-span-3">+{ongoingRecords.length - 6} more ongoing. Open Applications or Scholarships to see them all.</p>}
""", """            {ongoingRecords.length > 6 && (
              <button type="button" data-testid="button-ongoing-toggle" onClick={() => setOngoingAll(value => !value)} className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#176B73] bg-white/60 px-3 py-2 text-xs font-bold text-[#176B73] transition-colors hover:bg-white sm:col-span-2 xl:col-span-3">
                {ongoingAll ? <><ChevronUp className="h-3.5 w-3.5" />Show fewer</> : <><ChevronDown className="h-3.5 w-3.5" />Show all {ongoingRecords.length} ongoing (+{ongoingRecords.length - 6} more)</>}
              </button>
            )}
""", "ongoing: show all button", marker='data-testid="button-ongoing-toggle"')

# ---- replace priority actions block with insights --------------------------------------------
INSIGHTS = """      <div data-testid="overview-insights" className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#176B73]">Insights</p><h3 className="mt-1 text-xl font-bold tracking-tight">How your plan is shaping up</h3></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <section data-testid="insight-pipeline" className="min-w-0 rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--apps-border)' }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold">Pipeline by status</h4>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#176B73]" />Applications</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F2C75C]" />Scholarships</span>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {pipeRows.map(row => (
                <div key={row.key} data-testid={`pipeline-row-${row.key}`} className="grid grid-cols-[6.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{row.label}</span>
                  <div className="flex h-3 overflow-hidden rounded-full bg-[#EDF0F4]">
                    <div className="h-full bg-[#176B73] transition-all" style={{ width: `${(row.apps / pipeMax) * 100}%` }} />
                    <div className="h-full bg-[#F2C75C] transition-all" style={{ width: `${(row.schs / pipeMax) * 100}%` }} />
                  </div>
                  <strong className="text-right">{row.apps + row.schs}</strong>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">Not Applied items are not counted.</p>
          </section>

          <section data-testid="insight-deadlines" className="min-w-0 rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--apps-border)' }}>
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold">Deadlines by month</h4>
              <span className="text-[10px] text-muted-foreground">next 6 months</span>
            </div>
            <div className="mt-4 grid h-32 grid-cols-6 items-end gap-2">
              {monthBuckets.map(month => (
                <div key={month.key} data-testid={`deadline-month-${month.key}`} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-bold">{month.count}</span>
                  <div className="w-full rounded-t-lg bg-[#176B73]" style={{ height: `${Math.max(month.count ? 8 : 3, (month.count / monthMax) * 80)}%`, opacity: month.count ? 1 : 0.2 }} />
                  <span className="text-[10px] text-muted-foreground">{month.label}</span>
                </div>
              ))}
            </div>
            <p data-testid="text-past-due" className={`mt-3 text-[11px] ${pastDueCount ? 'font-semibold text-[#D95757]' : 'text-muted-foreground'}`}>
              {pastDueCount ? `${pastDueCount} deadline${pastDueCount === 1 ? '' : 's'} already passed without applying` : 'No missed deadlines'}
            </p>
          </section>

          <section data-testid="insight-readiness" className="min-w-0 rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--apps-border)' }}>
            <h4 className="text-sm font-bold">Document readiness by country</h4>
            {countryReadiness.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Add documents or requirements to your targets to see readiness here.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {countryReadiness.map(row => {
                  const pct = Math.round((row.done / row.total) * 100);
                  return (
                    <div key={row.country} data-testid={`readiness-${row.country}`}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="truncate font-semibold">{row.country}</span><span className="shrink-0 text-muted-foreground">{row.done}/{row.total} · {pct}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#EDF0F4]"><div className="h-full rounded-full bg-[#7C6CFF] transition-all" style={{ width: `${pct}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section data-testid="insight-numbers" className="min-w-0 rounded-2xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--apps-border)' }}>
            <h4 className="text-sm font-bold">Key numbers</h4>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#DDF4F7] p-3"><p data-testid="text-applied-percent" className="font-heading text-xl font-bold text-[#176B73]">{appliedPercent}%</p><p className="mt-0.5 text-[10px] text-[#176B73]">of targets applied ({totalAppliedCount}/{activeTargetCount})</p></div>
              <div className="rounded-xl bg-[#F2F0FF] p-3"><p data-testid="text-response-rate" className="font-heading text-xl font-bold text-[#7C6CFF]">{responsePercent}%</p><p className="mt-0.5 text-[10px] text-[#7C6CFF]">response rate (interview or offer)</p></div>
              <div className="rounded-xl bg-[#FDF8EB] p-3"><p data-testid="text-offer-count" className="font-heading text-xl font-bold text-[#B8860B]">{offerCount}</p><p className="mt-0.5 text-[10px] text-[#B8860B]">offers / awards</p></div>
              <div className="rounded-xl bg-[#FBEEEE] p-3"><p data-testid="text-funding-secured" className="font-heading text-base font-bold leading-7 text-[#D95757]">{fundingSecured || '—'}</p><p className="mt-0.5 text-[10px] text-[#D95757]">funding secured</p></div>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Priority mix</p>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-[#EDF0F4]">
                {priorityMix.map(item => item.n > 0 && <div key={item.p} title={`${item.n} ${item.p}`} className={item.p === 'high' ? 'bg-[#D95757]' : item.p === 'medium' ? 'bg-[#F2C75C]' : 'bg-slate-400'} style={{ width: `${(item.n / Math.max(1, activeRecordsForPriority.length)) * 100}%` }} />)}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 text-[10px] text-muted-foreground">{priorityMix.map(item => <span key={item.p}>{item.n} {item.p}</span>)}</div>
            </div>
          </section>
        </div>
      </div>

"""
region('      <div data-testid="overview-priority-actions"', '      <div className="rounded-2xl border bg-white p-3 shadow-[0_1px_2px_rgba(35, 59, 99, 0.04)]"', INSIGHTS, "insights replace priority actions", marker='data-testid="overview-insights"')

# ---- due dialog (end of component) -----------------------------------------------------------
DIALOG = """      <Dialog open={dueOpen} onOpenChange={setDueOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] max-w-lg overflow-x-hidden overflow-y-auto" data-testid="dialog-due-30">
          <DialogHeader><DialogTitle>Due in the next 30 days ({next30Days.length})</DialogTitle></DialogHeader>
          <p className="-mt-2 min-w-0 text-xs text-muted-foreground">Soonest first. Only targets that still need action are listed; Not Applied and already submitted ones are left out.</p>
          {next30Days.length === 0 ? (
            <div data-testid="due-empty" className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Nothing is due in the next 30 days.</div>
          ) : (
            <div className="min-w-0 space-y-2">
              {next30Days.map(record => (
                <button type="button" key={record.key} data-testid={`due-item-${record.key}`} onClick={() => { setDueOpen(false); onTabChange(record.app ? 'applications' : 'scholarships'); }} className="flex w-full min-w-0 items-center gap-3 rounded-xl border bg-white p-3 text-left transition-colors hover:bg-[#DDF4F7]" style={{ borderColor: 'var(--apps-border)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><TypeMark type={record.type} /><span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{record.country}</span></div>
                    <p className="mt-1.5 truncate text-sm font-bold">{recordTitle(record)}</p>
                    <p className="truncate text-xs text-muted-foreground">{record.app ? statusLabel(record.app.status, 'application') : statusLabel(record.scholarship?.status, 'scholarship')} · {recordSubtitle(record)}</p>
                    <div className="mt-1.5"><DeadlineLabel deadline={record.deadline} /></div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
"""
rep("""        </aside>
      </div>
    </div>
  );
}

function OverviewTab(""", """        </aside>
      </div>
""" + DIALOG + """    </div>
  );
}

function OverviewTab(""", "due dialog", marker='data-testid="dialog-due-30"')

# ---- phone fix: the deadline stream was wider than the screen ---------------------------------
rep('<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,0.65fr)]">',
    '<div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,0.65fr)]">',
    "phone: stream grid width", marker='grid grid-cols-[minmax(0,1fr)] items-start gap-5')

if problems:
    print("\nNOT APPLIED — nothing written:"); [print(" -", p) for p in problems]; sys.exit(1)
open(path, "w", encoding="utf-8").write(s)
print("\nDone. Overview updated.")
