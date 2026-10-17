#!/usr/bin/env python3
"""Overview card: "Applications + Scholarships" -> "Total Applied".

Counts only what you have actually applied to (Applied and every later stage:
Interview, Offer Letter, Waitlist, Rejected) across Applications AND Scholarships.
Researching, Ready to Apply and Not Applied are not counted.
Example: 4 applications applied + 2 scholarships applied -> Total Applied 6.

Safe to run twice.   Usage (project root):  python3 update_total_applied.py artifacts/ielts-tracker
"""
import os, sys

APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
path = os.path.join(APP, "src/pages/HigherStudyPrep.tsx")
if not os.path.exists(path):
    sys.exit("Cannot find " + path + " - run this from the project root.")
s = open(path, encoding="utf-8").read()
problems = []


def rep(old, new, label):
    global s
    if new in s:
        print("already:", label); return
    if s.count(old) != 1:
        problems.append(f"{label}: expected 1, found {s.count(old)}"); print("MISSING:", label); return
    s = s.replace(old, new); print("ok     :", label)


if "normalizeAppStatus" not in s:
    sys.exit("This needs the status update first (update_statuses.py). Run that, then run this again.")

rep(
"  const activeApplicationCount = applicationRows.filter(app => !isAppNotApplied(app.status)).length;\n"
"  const activeScholarshipCount = scholarshipRows.filter(item => !isSchNotApplied(item.status)).length;\n"
"  const totalTargetCount = activeApplicationCount + activeScholarshipCount;\n"
"  const notAppliedCount = (applicationRows.length - activeApplicationCount) + (scholarshipRows.length - activeScholarshipCount);\n",
"  // \"Applied\" = actually submitted: Applied and every stage after it.\n"
"  const APPLIED_APP_STAGES = ['applied', 'interview', 'offer', 'waitlisted', 'rejected'];\n"
"  const APPLIED_SCHOLARSHIP_STAGES = ['applied', 'interview', 'awarded', 'waitlisted', 'rejected'];\n"
"  const appliedApplicationCount = applicationRows.filter(app => APPLIED_APP_STAGES.includes(normalizeAppStatus(app.status))).length;\n"
"  const appliedScholarshipCount = scholarshipRows.filter(item => APPLIED_SCHOLARSHIP_STAGES.includes(normalizeScholarshipStatus(item.status))).length;\n"
"  const totalAppliedCount = appliedApplicationCount + appliedScholarshipCount;\n"
"  const notYetAppliedCount = (applicationRows.length - appliedApplicationCount) + (scholarshipRows.length - appliedScholarshipCount);\n",
"counts: only items you actually applied to")

rep("{totalTargetCount}</p>", "{totalAppliedCount}</p>", "card number")
rep(">Applications + Scholarships</p>", ">Total Applied</p>", "card label")
rep("{activeApplicationCount} application{activeApplicationCount === 1 ? '' : 's'} · {activeScholarshipCount} scholarship{activeScholarshipCount === 1 ? '' : 's'}",
    "{appliedApplicationCount} application{appliedApplicationCount === 1 ? '' : 's'} · {appliedScholarshipCount} scholarship{appliedScholarshipCount === 1 ? '' : 's'}",
    "card breakdown line")
rep("{notAppliedCount > 0 && <p className=\"mt-2 text-[10px] text-white/50\">{notAppliedCount} Not Applied not counted</p>}",
    "{notYetAppliedCount > 0 && <p className=\"mt-2 text-[10px] text-white/50\">{notYetAppliedCount} not applied yet</p>}",
    "card footnote")

open(path, "w", encoding="utf-8").write(s)
print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your file differs from what I expected):")
    for x in problems: print("  -", x)
    sys.exit(1)
print("All edits applied.")
