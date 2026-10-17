#!/usr/bin/env python3
"""Same status list + order for Applications and Scholarships.

  1 Researching   2 Ready to Apply   3 Applied   4 Interview
  5 Offer Letter  6 Waitlist         7 Rejected  8 Not Applied

Affects the Application pulse, Scholarship pulse, every status dropdown (cards,
detail drawers, add/edit forms), filters and the kanban columns.
Old saved statuses are mapped to the new ones when shown - nothing in the
database is rewritten. Safe to run twice.

Usage (from the project root):  python3 update_statuses.py artifacts/ielts-tracker
"""
import os, re, sys

APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
if not os.path.isdir(os.path.join(APP, "src")):
    sys.exit("Cannot find " + APP + "/src - run this from the project root.")
problems = []


def load(rel):
    p = os.path.join(APP, rel)
    return p, open(p, encoding="utf-8").read()


def rep(text, old, new, label, count=1):
    # insertion-style edits (new contains old) are "done" once new is present;
    # all other edits are "done" once old is gone.
    if old in new:
        done = new in text
    else:
        done = old not in text
    if done:
        print("already:", label); return text
    n = text.count(old)
    if n != count:
        problems.append(f"{label}: expected {count}, found {n}"); print("MISSING:", label); return text
    print("ok     :", label); return text.replace(old, new)


def rx(text, pattern, new, label, count=1, flags=0):
    if new and new in text:
        print("already:", label); return text
    out, n = re.subn(pattern, lambda m: new, text, flags=flags)
    if n == 0 and (new == "" or new in text):
        print("already:", label); return text
    if n != count:
        problems.append(f"{label}: expected {count}, found {n}"); print("MISSING:", label); return text
    print("ok     :", label); return out


p, s = load("src/pages/HigherStudyPrep.tsx")

# ---------------------------------------------------------------- types
s = rep(s,
"""type AppStatus =
  | 'researching' | 'shortlisted' | 'supervisor_contact' | 'preparing'
  | 'ready_to_apply' | 'applied' | 'under_review' | 'interview'
  | 'offer' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred'
  | 'withdrawn' | 'missed_deadline';""",
"""type AppStatus =
  | 'researching' | 'ready_to_apply' | 'applied' | 'interview'
  | 'offer' | 'waitlisted' | 'rejected' | 'withdrawn'; // withdrawn = "Not Applied\"""",
"AppStatus type")
s = rep(s,
"""type ScholarshipStatus =
  | 'researching' | 'eligible' | 'shortlisted' | 'preparing' | 'applying'
  | 'applied' | 'under_review' | 'interview' | 'awarded'
  | 'rejected' | 'expired' | 'not_eligible';""",
"""// Stored keys are kept as they were: preparing = "Ready to Apply", awarded = "Offer Letter",
// not_eligible = "Not Applied". Older values are mapped in normalizeScholarshipStatus().
type ScholarshipStatus =
  | 'researching' | 'preparing' | 'applied' | 'interview'
  | 'awarded' | 'waitlisted' | 'rejected' | 'not_eligible';""",
"ScholarshipStatus type")

# ---------------------------------------------------------------- closed statuses
s = rep(s, "const SCH_CLOSED_STATUSES = ['awarded', 'rejected', 'expired', 'not_eligible'];",
        "const SCH_CLOSED_STATUSES = ['awarded', 'waitlisted', 'rejected', 'expired', 'not_eligible'];", "closed statuses")

# ---------------------------------------------------------------- APP_STATUS_META
APP_META = """const APP_STATUS_META: Record<AppStatus, { label: string; color: string; bg: string }> = {
  researching:    { label: 'Researching',    color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-800' },
  ready_to_apply: { label: 'Ready to Apply', color: 'text-[#176B73]',   bg: 'bg-[#DDF4F7] dark:bg-[#42E6B8]/30' },
  applied:        { label: 'Applied',        color: 'text-[#233B63]',   bg: 'bg-[#DDF4F7] dark:bg-[#233B63]/30' },
  interview:      { label: 'Interview',      color: 'text-[#6A5CE0]',   bg: 'bg-[#F2F0FF] dark:bg-[#7C6CFF]/30' },
  offer:          { label: 'Offer Letter',   color: 'text-[#176B73]',   bg: 'bg-[#DDF4F7] dark:bg-[#42E6B8]/30' },
  waitlisted:     { label: 'Waitlist',       color: 'text-[#B8860B]',   bg: 'bg-[#FDF8EB] dark:bg-[#F2C75C]/30' },
  rejected:       { label: 'Rejected',       color: 'text-[#D95757]',   bg: 'bg-[#FBEEEE] dark:bg-[#D95757]/30' },
  withdrawn:      { label: 'Not Applied',    color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800' },
};

// Statuses saved before this list was simplified are shown as the closest current one.
const LEGACY_APP_STATUS: Record<string, AppStatus> = {
  shortlisted: 'researching', supervisor_contact: 'researching', preparing: 'ready_to_apply',
  under_review: 'applied', accepted: 'offer', deferred: 'waitlisted', missed_deadline: 'withdrawn',
};
function normalizeAppStatus(raw: unknown): AppStatus {
  const value = String(raw || 'researching');
  if (Object.prototype.hasOwnProperty.call(APP_STATUS_META, value)) return value as AppStatus;
  return LEGACY_APP_STATUS[value] ?? 'researching';
}
// Applied to every query result so the whole page only ever sees the current statuses.
const normalizeAppRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, status: normalizeAppStatus(row?.status) }));
const normalizeSchRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, status: normalizeScholarshipStatus(row?.status) }));
"""
s = rx(s, r"const APP_STATUS_META: Record<AppStatus, \{ label: string; color: string; bg: string \}> = \{.*?\n\};\n",
       APP_META, "APP_STATUS_META (8 statuses, new order)", flags=re.S)

# ---------------------------------------------------------------- SCH_STATUS_META
SCH_META = """const SCH_STATUS_META: Record<ScholarshipStatus, { label: string; color: string; bg: string }> = {
  researching:   { label: 'Researching',    color: 'text-[#182238] dark:text-[#182238]',   bg: 'bg-[#E3EAF0] dark:bg-[#E3EAF0]/20' },
  preparing:     { label: 'Ready to Apply', color: 'text-[#176B73] dark:text-[#176B73]',   bg: 'bg-[#DDF4F7] dark:bg-[#DDF4F7]/20' },
  applied:       { label: 'Applied',        color: 'text-[#233B63] dark:text-[#233B63]',   bg: 'bg-[#DDF4F7] dark:bg-[#DDF4F7]/20' },
  interview:     { label: 'Interview',      color: 'text-[#6A5CE0] dark:text-[#6A5CE0]',   bg: 'bg-[#F2F0FF] dark:bg-[#F2F0FF]/20' },
  awarded:       { label: 'Offer Letter',   color: 'text-[#176B73] dark:text-[#176B73]',   bg: 'bg-[#DDF4F7] dark:bg-[#DDF4F7]/20' },
  waitlisted:    { label: 'Waitlist',       color: 'text-[#B8860B] dark:text-[#B8860B]',   bg: 'bg-[#FDF8EB] dark:bg-[#FDF8EB]/20' },
  rejected:      { label: 'Rejected',       color: 'text-[#D95757] dark:text-[#D95757]',   bg: 'bg-[#FBEEEE] dark:bg-[#FBEEEE]/20' },
  not_eligible:  { label: 'Not Applied',    color: 'text-slate-500 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800' },
};
"""
s = rx(s, r"const SCH_STATUS_META: Record<ScholarshipStatus, \{ label: string; color: string; bg: string \}> = \{.*?\n\};\n",
       SCH_META, "SCH_STATUS_META (8 statuses, new order)", flags=re.S)

s = rx(s, r"function normalizeScholarshipStatus\(raw: unknown\): ScholarshipStatus \{.*?\n\}\n",
"""function normalizeScholarshipStatus(raw: unknown): ScholarshipStatus {
  const value = String(raw || 'researching');
  if (Object.prototype.hasOwnProperty.call(SCH_STATUS_META, value)) return value as ScholarshipStatus;
  const legacy: Record<string, ScholarshipStatus> = {
    planning: 'researching', eligible: 'researching', shortlisted: 'researching',
    ready_to_apply: 'preparing', applying: 'preparing', under_review: 'applied', expired: 'not_eligible',
  };
  return legacy[value] ?? 'researching';
}
""", "normalizeScholarshipStatus (maps old values)", flags=re.S)

# ---------------------------------------------------------------- queries: normalise every status on read
s = rep(s, "queryKey: ['applications'], queryFn: api.getApplications })",
           "queryKey: ['applications'], queryFn: api.getApplications, select: normalizeAppRows })", "queries: applications normalised", count=4)
s = rep(s, "queryKey: ['scholarships'], queryFn: api.getScholarships })",
           "queryKey: ['scholarships'], queryFn: api.getScholarships, select: normalizeSchRows })", "queries: scholarships normalised", count=3)

# ---------------------------------------------------------------- dropdowns / pulse / kanban: show every status, no hidden ones
s = rx(s, r"\s*\.filter\(\(\[status\]\) => !\(\[[^\]]*\] as AppStatus\[\]\)\.includes\(status\)\)", "", "application lists: remove hidden-status filters", count=5)
s = rx(s, r"\s*\.filter\(\(\[status\]\) => !\(\[[^\]]*\] as ScholarshipStatus\[\]\)\.includes\(status\)\)", "", "scholarship pulse: remove hidden-status filter", count=1)
s = rep(s, "<div className=\"mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5\">", "<div className=\"mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4\">", "application pulse layout (2 rows of 4)")
s = rep(s, "<div className=\"grid min-w-[1120px] grid-cols-7 gap-3\">", "<div className=\"grid min-w-[1280px] grid-cols-8 gap-3\">", "kanban: 8 columns")

# ---------------------------------------------------------------- logic that named removed statuses
s = rep(s, "  if (app.status === 'shortlisted') return 'Confirm programme requirements';\n  if (app.status === 'supervisor_contact') return 'Find potential supervisors';\n  if (app.status === 'preparing') return openReqs ? `Finish ${openReqs} document${openReqs === 1 ? '' : 's'}` : 'Review application';\n", "", "next action: drop old application steps")
s = rep(s, "  if (app.status === 'applied' || app.status === 'under_review') return 'Watch for updates';", "  if (app.status === 'applied') return 'Watch for updates';", "next action: applied")
s = rep(s, "  if (app.status === 'accepted') return 'Plan your next steps';\n", "", "next action: drop accepted")
s = rep(s, "  if (app.status === 'missed_deadline') return 'Review alternate deadlines';\n", "", "next action: drop missed deadline")
s = rep(s, "  if (app.status === 'offer') return 'Review offer details';", "  if (app.status === 'offer') return 'Review your offer letter';", "next action: offer letter wording")
s = rep(s, "!['awarded', 'rejected', 'expired', 'not_eligible'].includes(status)) {\n    return days === 0",
           "!['awarded', 'waitlisted', 'rejected', 'not_eligible'].includes(status)) {\n    return days === 0", "scholarship deadline nudge")
s = rep(s,
"""  if (status === 'eligible') return 'Shortlist or start preparing';
  if (status === 'shortlisted') return 'Confirm eligibility & start prep';
  if (status === 'preparing') return openReqs ? `Finish ${openReqs} requirement${openReqs === 1 ? '' : 's'}` : 'Move to applying';
  if (status === 'applying') return openReqs ? `Finish ${openReqs} requirement${openReqs === 1 ? '' : 's'}` : 'Submit application';
  if (status === 'applied' || status === 'under_review') return 'Watch for updates';
  if (status === 'interview') return 'Prepare for interview';
  if (status === 'awarded') return 'Confirm award details';
  if (status === 'expired') return 'Archive or revisit next cycle';
""",
"""  if (status === 'preparing') return openReqs ? `Finish ${openReqs} requirement${openReqs === 1 ? '' : 's'}` : 'Submit application';
  if (status === 'applied') return 'Watch for updates';
  if (status === 'interview') return 'Prepare for interview';
  if (status === 'awarded') return 'Review your offer letter';
  if (status === 'waitlisted') return 'Check for updates';
""", "scholarship next actions")
s = rep(s, "const READINESS_STAGES: AppStatus[] = [\n  'researching', 'shortlisted', 'supervisor_contact', 'preparing',\n  'ready_to_apply', 'applied', 'under_review', 'interview', 'offer', 'accepted',\n];",
           "const READINESS_STAGES: AppStatus[] = [\n  'researching', 'ready_to_apply', 'applied', 'interview', 'offer',\n];", "readiness stages")
s = rep(s, "const status = String(app.status || 'researching') as AppStatus;\n  const stageIdx = READINESS_STAGES.indexOf(status);",
           "const status = normalizeAppStatus(app.status);\n  const stageIdx = READINESS_STAGES.indexOf(status);", "readiness uses normalised status")
s = rep(s, "const PIPELINE_STATUSES: ScholarshipStatus[] = [\n  'researching', 'eligible', 'preparing', 'applying', 'applied', 'under_review', 'awarded',\n];",
           "const PIPELINE_STATUSES: ScholarshipStatus[] = [\n  'researching', 'preparing', 'applied', 'interview', 'awarded',\n];", "scholarship stage bar")
s = rep(s, "                  waitlisted:     'bg-[#F2C75C]',\n                  deferred:       'bg-[#F2C75C]',\n", "                  waitlisted:     'bg-[#F2C75C]',\n", "timeline dot colours")
open(p, "w", encoding="utf-8").write(s)

# ---------------------------------------------------------------- flyStyles (labels kept in sync)
p, s = load("src/lib/flyStyles.ts")
s = rep(s, "  | 'expired' | 'not_eligible';", "  | 'expired' | 'not_eligible' | 'waitlisted';", "flyStyles key list")
s = rep(s, "  preparing:    { label: 'Preparing',    ...FLY_PASTELS.amber },", "  preparing:    { label: 'Ready to Apply', ...FLY_PASTELS.amber },", "flyStyles Ready to Apply")
s = rep(s, "  awarded:      { label: 'Awarded',      ...FLY_PASTELS.green },", "  awarded:      { label: 'Offer Letter', ...FLY_PASTELS.green },", "flyStyles Offer Letter")
s = rep(s, "  not_eligible: { label: 'Not Applied', ...FLY_PASTELS.slate },", "  not_eligible: { label: 'Not Applied', ...FLY_PASTELS.slate },\n  waitlisted:   { label: 'Waitlist',     ...FLY_PASTELS.amber },", "flyStyles Waitlist")
open(p, "w", encoding="utf-8").write(s)

# ---------------------------------------------------------------- Home page: older saved values also count as Not Applied
p, s = load("src/App.tsx")
s = rep(s, "    if (a.status === 'withdrawn') return; // Not Applied: documents not counted", "    if (a.status === 'withdrawn' || a.status === 'missed_deadline') return; // Not Applied: documents not counted", "home: docs")
s = rep(s, "a.status !== 'withdrawn' && a.days !== null", "a.status !== 'withdrawn' && a.status !== 'missed_deadline' && a.days !== null", "home: deadlines")
s = rep(s, "s.status !== 'not_eligible' && s.days !== null", "s.status !== 'not_eligible' && s.status !== 'expired' && s.days !== null", "home: scholarship deadline")
open(p, "w", encoding="utf-8").write(s)

print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your file differs from what I expected):")
    for x in problems: print("  -", x)
    sys.exit(1)
print("All edits applied.")
