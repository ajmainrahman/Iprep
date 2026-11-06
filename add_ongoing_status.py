#!/usr/bin/env python3
"""Applications + Scholarships: new status "Ongoing".

Status order (both lists):  Researching, Ongoing, Ready to Apply, Applied, Interview, Offer Letter,
Waitlist, Rejected, Not Applied.

AUTOMATIC: when an item's start date arrives (today or earlier) and its deadline has not passed, an item
that is still Researching or Ready to Apply shows as Ongoing by itself. Example: an application whose
start date is 7 November becomes Ongoing on 7 November. Items you already moved to Applied, Interview,
Offer, Waitlist, Rejected or Not Applied are left alone. If the deadline passes, an Ongoing item goes back
to Researching. You can also pick Ongoing by hand.
Ongoing also appears in every filter, status dropdown, board column and the "Ongoing now" card.

Safe to run twice.   Usage (project root):  python3 add_ongoing_status.py artifacts/ielts-tracker
"""
import os, sys
APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
path = os.path.join(APP, "src/pages/HigherStudyPrep.tsx")
if not os.path.exists(path):
    sys.exit("Run this from the project root:  python3 add_ongoing_status.py artifacts/ielts-tracker")
s = open(path, encoding="utf-8").read()
problems = []

def rep(old, new, label, marker=None):
    global s
    if (marker or new) in s:
        print("already:", label); return
    if s.count(old) != 1:
        problems.append(f"{label}: expected 1 match, found {s.count(old)}"); print("MISSING:", label); return
    s = s.replace(old, new); print("ok     :", label)

rep("  | 'researching' | 'ready_to_apply' | 'applied' | 'interview'\n",
    "  | 'researching' | 'ongoing' | 'ready_to_apply' | 'applied' | 'interview'\n", "application status type")
rep("  | 'researching' | 'preparing' | 'applied' | 'interview'\n  | 'awarded'",
    "  | 'researching' | 'ongoing' | 'preparing' | 'applied' | 'interview'\n  | 'awarded'", "scholarship status type")

APP_R = "  researching:    { label: 'Researching',    color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-800' },\n"
rep(APP_R, APP_R + "  ongoing:        { label: 'Ongoing',        color: 'text-[#0F8F72]',   bg: 'bg-[#E1FAF3] dark:bg-[#42E6B8]/20' },\n",
    "application status label", marker="  ongoing:        { label: 'Ongoing',")
SCH_R = "  researching:   { label: 'Researching',    color: 'text-[#182238] dark:text-[#182238]',   bg: 'bg-[#E3EAF0] dark:bg-[#E3EAF0]/20' },\n"
rep(SCH_R, SCH_R + "  ongoing:       { label: 'Ongoing',        color: 'text-[#0F8F72] dark:text-[#0F8F72]',   bg: 'bg-[#E1FAF3] dark:bg-[#E1FAF3]/20' },\n",
    "scholarship status label", marker="  ongoing:       { label: 'Ongoing',")

OLD_NORM = """const normalizeAppRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, status: normalizeAppStatus(row?.status) }));
const normalizeSchRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, status: normalizeScholarshipStatus(row?.status) }));
"""
NEW_NORM = """/* Automatic Ongoing: once the start date has arrived (and the deadline has not passed), an item that is
   still Researching / Ready to Apply shows as Ongoing by itself. Nothing is rewritten in the database until
   you save the item. If the deadline passes, Ongoing goes back to Researching. */
function startReached(row: any): boolean {
  const untilStart = daysOrNull(row?.startDate);
  return untilStart !== null && untilStart <= 0;
}
function deadlinePassed(row: any): boolean {
  const untilDeadline = daysOrNull(row?.deadline);
  return untilDeadline !== null && untilDeadline < 0;
}
function autoOngoing(status: string, row: any, beforeApply: string[]): string {
  if (status === 'ongoing') return deadlinePassed(row) ? 'researching' : 'ongoing';
  if (beforeApply.includes(status) && startReached(row) && !deadlinePassed(row)) return 'ongoing';
  return status;
}
const normalizeAppRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, status: autoOngoing(normalizeAppStatus(row?.status), row, ['researching', 'ready_to_apply']) }));
const normalizeSchRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, status: autoOngoing(normalizeScholarshipStatus(row?.status), row, ['researching', 'preparing']) }));
"""
rep(OLD_NORM, NEW_NORM, "automatic Ongoing", marker="function autoOngoing(")

rep("  if (closedStatuses.includes(String(item.status || ''))) return false;\n  const untilStart = daysOrNull(item.startDate);\n",
    "  if (closedStatuses.includes(String(item.status || ''))) return false;\n  if (String(item.status || '') === 'ongoing') return !deadlinePassed(item);\n  const untilStart = daysOrNull(item.startDate);\n",
    "Ongoing now card counts Ongoing items", marker="return !deadlinePassed(item);")

rep("  if (app.status === 'researching') return 'Review programme fit';\n",
    "  if (app.status === 'ongoing') return openReqs ? `Finish ${openReqs} document${openReqs === 1 ? '' : 's'}` : 'Submit application';\n  if (app.status === 'researching') return 'Review programme fit';\n",
    "application next action", marker="if (app.status === 'ongoing')")
rep("  if (status === 'researching') return 'Research eligibility criteria';\n",
    "  if (status === 'ongoing') return openReqs ? `Finish ${openReqs} requirement${openReqs === 1 ? '' : 's'}` : 'Submit application';\n  if (status === 'researching') return 'Research eligibility criteria';\n",
    "scholarship next action", marker="if (status === 'ongoing') return openReqs")
rep("  const stageIdx = READINESS_STAGES.indexOf(status);\n",
    "  const stageIdx = status === 'ongoing' ? 0.5 : READINESS_STAGES.indexOf(status); // Ongoing sits between Researching and Ready to Apply\n",
    "readiness", marker="status === 'ongoing' ? 0.5")
rep("                  researching:    'bg-slate-400',\n",
    "                  researching:    'bg-slate-400',\n                  ongoing:        'bg-[#0F8F72]',\n", "timeline dot", marker="ongoing:        'bg-[#0F8F72]'")
rep("  'researching', 'preparing', 'applied', 'interview', 'awarded',\n];",
    "  'researching', 'ongoing', 'preparing', 'applied', 'interview', 'awarded',\n];", "scholarship pipeline")

open(path, "w", encoding="utf-8").write(s)
print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your file differs from what I expected):")
    for x in problems: print("  -", x)
    sys.exit(1)
print("All edits applied.")
