path = "artifacts/ielts-tracker/src/pages/HigherStudyPrep.tsx"
with open(path, encoding="utf-8") as f:
    content = f.read()

old = """                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-[#0f3d2e]">{recordTitle(record)}</p>
                    <OngoingTag />
                  </div>
                  <p className="mt-1 truncate text-[10px] text-[#4f8a75]">{record.deadline ? `Closes ${fmtDate(record.deadline)}` : 'No deadline set'}</p>"""

new = """                  <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-[#0f3d2e]" title={recordTitle(record)}>{recordTitle(record)}</p>
                  <p className="mt-1.5 text-[10px] text-[#4f8a75]">{record.deadline ? `Closes ${fmtDate(record.deadline)}` : 'No deadline set'}</p>"""

n = content.count(old)
if n != 1:
    print(f"[FAIL] {n} matches, expected 1")
else:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("[ok] Ongoing card mini-tiles redesigned")
