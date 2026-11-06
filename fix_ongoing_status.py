#!/usr/bin/env python3
"""Fix: choosing another status on an Ongoing item did not stick.

Cause: the automatic rule saw "start date reached" again and pulled the item straight back to Ongoing.
Fix: when you move an item that is currently open (start date reached, deadline not passed) to Researching
or Ready to Apply, that choice is remembered (saved as "researching_manual" / "ready_to_apply_manual" /
"preparing_manual") and the automatic Ongoing leaves it alone. You still see the normal status name
everywhere. Moving it to Applied, Interview, Offer, etc. always worked and still does. Picking Ongoing
again by hand (or clearing the choice by changing the status) works as before.

Needs add_ongoing_status.py to be installed first. Safe to run twice.
Usage (project root):  python3 fix_ongoing_status.py artifacts/ielts-tracker
"""
import os, sys
APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
path = os.path.join(APP, "src/pages/HigherStudyPrep.tsx")
if not os.path.exists(path):
    sys.exit("Run this from the project root:  python3 fix_ongoing_status.py artifacts/ielts-tracker")
s = open(path, encoding="utf-8").read()
problems = []

def rep(old, new, label, marker=None):
    global s
    if (marker or new) in s:
        print("already:", label); return
    if s.count(old) != 1:
        problems.append(f"{label}: expected 1 match, found {s.count(old)}"); print("MISSING:", label); return
    s = s.replace(old, new); print("ok     :", label)

if "function autoOngoing(" not in s:
    sys.exit("Install add_ongoing_status.py first (it adds the Ongoing status).")

OLD = """const normalizeAppRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, status: autoOngoing(normalizeAppStatus(row?.status), row, ['researching', 'ready_to_apply']) }));
const normalizeSchRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => ({ ...row, status: autoOngoing(normalizeScholarshipStatus(row?.status), row, ['researching', 'preparing']) }));
"""
NEW = """/* A status you chose yourself while the portal was open is saved with this suffix, so the automatic
   Ongoing does not pull the item back. The suffix is never shown. */
const MANUAL_SUFFIX = '_manual';
function splitManual(raw: unknown): { base: string; manual: boolean } {
  const v = String(raw || '');
  return v.endsWith(MANUAL_SUFFIX) ? { base: v.slice(0, -MANUAL_SUFFIX.length), manual: true } : { base: v, manual: false };
}
function lockStatusForSave(data: Record<string, unknown>, existing: any, beforeApply: string[]): Record<string, unknown> {
  if (data.status === undefined) return data;
  const { base } = splitManual(data.status);
  if (!beforeApply.includes(base)) return { ...data, status: base };
  const merged = { ...(existing || {}), ...data };
  return startReached(merged) && !deadlinePassed(merged) ? { ...data, status: base + MANUAL_SUFFIX } : { ...data, status: base };
}
const normalizeAppRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => {
  const { base, manual } = splitManual(row?.status);
  const st = normalizeAppStatus(base);
  return { ...row, status: manual ? st : autoOngoing(st, row, ['researching', 'ready_to_apply']) };
});
const normalizeSchRows = (rows: any[]): any[] => (Array.isArray(rows) ? rows : []).map(row => {
  const { base, manual } = splitManual(row?.status);
  const st = normalizeScholarshipStatus(base);
  return { ...row, status: manual ? st : autoOngoing(st, row, ['researching', 'preparing']) };
});
"""
rep(OLD, NEW, "remember your own status choice", marker="function lockStatusForSave(")

rep("    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateApplication(id, data),",
    "    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateApplication(id, lockStatusForSave(data, (qc.getQueryData(['applications']) as any[] | undefined)?.find(r => r.id === id), ['researching', 'ready_to_apply'])),",
    "applications save", marker="api.updateApplication(id, lockStatusForSave(")
rep("    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateScholarship(id, data),",
    "    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.updateScholarship(id, lockStatusForSave(data, (qc.getQueryData(['scholarships']) as any[] | undefined)?.find(r => r.id === id), ['researching', 'preparing'])),",
    "scholarships save", marker="api.updateScholarship(id, lockStatusForSave(")

open(path, "w", encoding="utf-8").write(s)
print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your file differs from what I expected):")
    for x in problems: print("  -", x)
    sys.exit(1)
print("All edits applied.")
