#!/usr/bin/env python3
"""Resources menu: add "LOR - 2027" and "SOP/LOM - 2027" (Google Docs links).

They open in a new tab and get a document icon; the YouTube links keep the video icon.
Safe to run twice.   Usage (project root):  python3 update_resources.py artifacts/ielts-tracker
"""
import os, re, sys

APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
path = os.path.join(APP, "src/App.tsx")
if not os.path.exists(path):
    sys.exit("Cannot find " + path + " - run this from the project root.")
s = open(path, encoding="utf-8").read()
problems = []

LOR = "https://docs.google.com/document/d/18YQTDLG0vxSzGDUJs5ePc8PKHOZKPyPad4LP4xCCqLs/edit?usp=sharing"
SOP = "https://docs.google.com/document/d/1G2nQMoe6bMsuWlOUqPwvt4WWODUyLg_WezcRmOSWPek/edit?usp=sharing"

# 1. allow a "kind" on each link (doc = document icon, default = video icon)
old = "const RESOURCE_LINKS: { label: string; href: string }[] = ["
new = "const RESOURCE_LINKS: { label: string; href: string; kind?: 'video' | 'doc' }[] = ["
if new in s:
    print("already: link type")
elif s.count(old) == 1:
    s = s.replace(old, new); print("ok     : link type")
else:
    problems.append("link type: RESOURCE_LINKS declaration not found"); print("MISSING: link type")

# 2. the two new links, right after "Iprep 2027"
if LOR in s and SOP in s:
    print("already: new links")
else:
    pat = r"(\n  \{ label: 'Iprep 2027'[^\n]*\n)"
    add = ("  { label: 'LOR - 2027', href: '" + LOR + "', kind: 'doc' },\n"
           "  { label: 'SOP/LOM - 2027', href: '" + SOP + "', kind: 'doc' },\n")
    s2, n = re.subn(pat, lambda m: m.group(1) + add, s, count=1)
    if n == 1:
        s = s2; print("ok     : new links")
    else:
        problems.append("new links: the 'Iprep 2027' line was not found"); print("MISSING: new links")

# 3. icon follows the link kind
old = '<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEEEE] text-[#D95757]"><Youtube className="h-4 w-4" /></span>'
new = ('{l.kind === \'doc\'\n'
       '                ? <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DDF4F7] text-[#176B73]"><FileText className="h-4 w-4" /></span>\n'
       '                : <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEEEE] text-[#D95757]"><Youtube className="h-4 w-4" /></span>}')
if "l.kind === 'doc'" in s:
    print("already: icons")
elif s.count(old) == 1:
    s = s.replace(old, new); print("ok     : icons")
else:
    problems.append("icons: the video icon line was not found"); print("MISSING: icons")

open(path, "w", encoding="utf-8").write(s)
print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your file differs from what I expected):")
    for x in problems: print("  -", x)
    sys.exit(1)
print("All edits applied.")
