import re, sys

PATH = "artifacts/ielts-tracker/src/pages/HigherStudyPrep.tsx"
with open(PATH, encoding="utf-8") as f:
    src = f.read()
failed = []

def sub_text(old, new, label):
    global src
    if new in src:
        print(f"[skip] {label} (already applied)")
        return
    n = src.count(old)
    if n != 1:
        print(f"[FAIL] {label}: {n} matches, expected 1")
        failed.append(label)
        return
    src = src.replace(old, new)
    print(f"[ok]   {label}")

def sub_re(pattern, make_new, marker, label):
    global src
    if marker in src:
        print(f"[skip] {label} (already applied)")
        return
    found = list(re.finditer(pattern, src, flags=re.S))
    if len(found) != 1:
        print(f"[FAIL] {label}: {len(found)} matches, expected 1")
        failed.append(label)
        return
    m = found[0]
    src = src[:m.start()] + make_new(m) + src[m.end():]
    print(f"[ok]   {label}")

HELPERS = r"""// Ongoing = the portal is open right now: start date reached (or none set),
// deadline still ahead, and the status is not a finished/closed one.
const APP_CLOSED_STATUSES = ['accepted', 'offer', 'rejected', 'waitlisted', 'deferred', 'withdrawn', 'missed_deadline'];
const SCH_CLOSED_STATUSES = ['awarded', 'rejected', 'expired', 'not_eligible'];

function daysOrNull(value: unknown): number | null {
  const raw = String(value || '');
  if (!raw) return null;
  const d = daysUntil(raw);
  return typeof d === 'number' && Number.isFinite(d) ? d : null;
}

function isOngoingItem(item: Record<string, unknown> | undefined, closedStatuses: string[]): boolean {
  if (!item) return false;
  if (closedStatuses.includes(String(item.status || ''))) return false;
  const untilDeadline = daysOrNull(item.deadline);
  const untilStart = daysOrNull(item.startDate);
  if (untilDeadline !== null && untilDeadline < 0) return false;
  if (untilStart !== null && untilStart > 0) return false;
  return untilDeadline !== null || untilStart !== null;
}

function isOngoingRecord(record: { app?: Record<string, unknown>; scholarship?: Record<string, unknown> }): boolean {
  return isOngoingItem(record.app, APP_CLOSED_STATUSES) || isOngoingItem(record.scholarship, SCH_CLOSED_STATUSES);
}

function OngoingTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 ring-1 ring-emerald-200">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      Ongoing
    </span>
  );
}

"""
sub_text("function reqStatus(item: ReqItem): DocStatus {",
         HELPERS + "function reqStatus(item: ReqItem): DocStatus {",
         "helpers + OngoingTag")

# ---- Applications form: state, edit, payload, input ----
sub_text("priority: 'medium', deadline: '', appliedDate: '', notes: '',",
         "priority: 'medium', deadline: '', startDate: '', appliedDate: '', notes: '',",
         "application emptyBase")
sub_re(r"websiteUrl:\s+String\(app\.websiteUrl \|\| ''\),",
       lambda m: "startDate: String(app.startDate || ''),\n      " + m.group(0),
       "String(app.startDate", "application startEdit")
sub_re(r"deadline:\s+formBase\.deadline \|\| null,",
       lambda m: m.group(0) + "\n      startDate: formBase.startDate || null,",
       "formBase.startDate || null", "application payload")

APP_START_INPUT = r"""<div className="space-y-1">
                <Label>Start Date (portal opens)</Label>
                <Input
                  data-testid="input-application-start-date"
                  type="date"
                  value={formBase.startDate}
                  onChange={e => setFormBase(p => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              """
sub_re(r'<div className="space-y-1">\s*<Label>Application Deadline</Label>\s*<Input\s*data-testid="input-application-deadline"',
       lambda m: APP_START_INPUT + m.group(0),
       "input-application-start-date", "application form input")

# ---- Scholarships form: state, edit, payload, input ----
sub_text("currency: 'USD', deadline: '', status: 'researching', priority: 'medium',",
         "currency: 'USD', deadline: '', startDate: '', status: 'researching', priority: 'medium',",
         "scholarship emptyForm")
sub_re(r"portalUrl:\s+String\(s\.portalUrl \|\| ''\),",
       lambda m: "startDate: String(s.startDate || ''),\n      " + m.group(0),
       "String(s.startDate", "scholarship startEdit")
sub_re(r"deadline:\s+form\.deadline \|\| null,",
       lambda m: m.group(0) + "\n      startDate: form.startDate || null,",
       "form.startDate || null", "scholarship payload")

SCH_START_INPUT = r"""<div className="space-y-1">
                <Label>Start Date (portal opens)</Label>
                <Input data-testid="input-scholarship-start-date" type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              """
sub_re(r'<div className="space-y-1">\s*<Label>Application Deadline</Label>\s*<Input data-testid="input-scholarship-deadline"',
       lambda m: SCH_START_INPUT + m.group(0),
       "input-scholarship-start-date", "scholarship form input")

# ---- Overview: ongoing list + tag on record cards + replace Deadline radar ----
OLD_N30 = "const next30Days = upcomingDeadlines.filter(record => (daysUntil(record.deadline || '') ?? 999) <= 30);"
sub_text(OLD_N30,
         OLD_N30 + "\n  const ongoingRecords = unifiedRecords\n    .filter(record => isOngoingRecord(record))\n    .sort((a, b) => (daysUntil(a.deadline || '') ?? 9999) - (daysUntil(b.deadline || '') ?? 9999));",
         "ongoingRecords list")

sub_text("""<h3 className="mt-2 truncate text-base font-bold tracking-tight" style={{ color: 'var(--apps-text-primary)' }}>{recordTitle(record)}</h3>""",
         """<div className="mt-2 flex min-w-0 items-center gap-2"><h3 className="truncate text-base font-bold tracking-tight" style={{ color: 'var(--apps-text-primary)' }}>{recordTitle(record)}</h3>{isOngoingRecord(record) && <OngoingTag />}</div>""",
         "Ongoing tag on record cards")

NEWCARD = r"""<div data-testid="overview-ongoing-card" className="rounded-2xl border border-[#bfe8d6] bg-[#f3fcf8] p-4 shadow-[0_10px_28px_rgba(16,140,110,0.08)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex min-w-0 items-start gap-3 lg:w-[31%]">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a6e6cd]">
              <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative h-3 w-3 rounded-full bg-emerald-600" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f7a5c]">Ongoing now</p>
              <h3 className="mt-1 text-lg font-bold tracking-tight text-[#0f3d2e]">{ongoingRecords.length ? `${ongoingRecords.length} portal${ongoingRecords.length === 1 ? '' : 's'} open right now` : 'Nothing ongoing right now'}</h3>
              <p className="mt-1 text-xs text-[#4f8a75]">{ongoingRecords.length ? 'Applications and scholarships that have opened and are still before their deadline.' : 'Add a start date and deadline to a target and it will appear here while it is open.'}</p>
            </div>
          </div>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            {ongoingRecords.slice(0, 6).map(record => {
              const days = daysUntil(record.deadline || '');
              return (
                <button type="button" data-testid={`button-ongoing-${record.key}`} key={record.key} onClick={() => onTabChange(record.app ? 'applications' : 'scholarships')} className="min-w-0 rounded-xl border border-[#cdeee0] bg-white/80 p-3 text-left transition-colors hover:bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <TypeMark type={record.type} />
                    <span className={`text-xs font-bold ${days !== null && days <= 7 ? 'text-red-600' : 'text-emerald-700'}`}>{days === null ? 'Open' : days === 0 ? 'Today' : `${days}d left`}</span>
                  </div>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-[#0f3d2e]">{recordTitle(record)}</p>
                    <OngoingTag />
                  </div>
                  <p className="mt-1 truncate text-[10px] text-[#4f8a75]">{record.deadline ? `Closes ${fmtDate(record.deadline)}` : 'No deadline set'}</p>
                </button>
              );
            })}
            {ongoingRecords.length > 6 && <p className="px-1 text-[11px] text-[#4f8a75] sm:col-span-3">+{ongoingRecords.length - 6} more ongoing. Open Applications or Scholarships to see them all.</p>}
            {ongoingRecords.length === 0 && <div className="flex items-center justify-center rounded-xl border border-dashed border-[#cdeee0] p-4 text-xs text-[#4f8a75] sm:col-span-3">Nothing open right now.</div>}
          </div>
        </div>
      </div>"""
sub_re(r'<div className="rounded-2xl border border-\[#f2d7a2\] bg-\[#fffaf0\].*?Add a deadline to see it here\.</div>\}\s*</div>\s*</div>\s*</div>',
       lambda m: NEWCARD,
       "overview-ongoing-card", "replace Deadline radar card")

if failed:
    print("\nNOTHING WRITTEN because of:", failed)
    sys.exit(1)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("\nAll patches applied and written.")
