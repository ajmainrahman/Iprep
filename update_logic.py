#!/usr/bin/env python3
"""Within a Few Weeks - logic + layout update (Not Applied, totals card, smaller hero,
Resources dropdown, logo on auth pages).  Safe to run twice.

Usage (from the project root):  python3 update_logic.py artifacts/ielts-tracker
"""
import os, sys

APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
SRC = os.path.join(APP, "src")
if not os.path.isdir(SRC):
    sys.exit("Cannot find " + SRC + " - run this from the project root.")

problems = []


def load(rel):
    p = os.path.join(APP, rel)
    return p, open(p, encoding="utf-8").read()


def rep(text, old, new, label, count=1):
    """Replace exactly `count` occurrences of old; skip quietly if already applied."""
    if new in text:
        print("already:", label)
        return text
    n = text.count(old)
    if n != count:
        problems.append(f"{label}: expected {count} match(es), found {n}")
        print("MISSING:", label)
        return text
    print("ok     :", label)
    return text.replace(old, new)


# ===================================================================== HigherStudyPrep
p, s = load("src/pages/HigherStudyPrep.tsx")

# --- rename Not Eligible -> Not Applied (scholarships), muted look
s = rep(s,
    "  not_eligible:  { label: 'Not Eligible',  color: 'text-[#D95757] dark:text-[#D95757]',   bg: 'bg-[#FBEEEE] dark:bg-[#FBEEEE]/20' },",
    "  not_eligible:  { label: 'Not Applied',   color: 'text-slate-500 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800' },",
    "scholarship status label -> Not Applied")

# --- helpers
s = rep(s,
    "const FUNDING_TYPES = [",
    "/* \"Not Applied\" = parked. These sink to the bottom of every list, look dimmed,\n"
    "   and their documents are left out of every total. */\n"
    "const isAppNotApplied = (status: unknown) => String(status || '') === 'withdrawn';\n"
    "const isSchNotApplied = (status: unknown) => normalizeScholarshipStatus(status) === 'not_eligible';\n\n"
    "const FUNDING_TYPES = [",
    "helpers isAppNotApplied / isSchNotApplied")

# --- Overview: disabled-record helpers + totals ignore Not Applied docs
s = rep(s,
    "  const requirementsFor = (record: UnifiedRecord) => {",
    "  const isDisabledRecord = (record: UnifiedRecord) => {\n"
    "    const appOff = record.app ? isAppNotApplied(record.app.status) : true;\n"
    "    const schOff = record.scholarship ? isSchNotApplied(record.scholarship.status) : true;\n"
    "    return appOff && schOff;\n"
    "  };\n"
    "  const activeRequirementsFor = (record: UnifiedRecord) => [\n"
    "    ...(record.app && !isAppNotApplied(record.app.status) ? safeParseReqs(record.app.requirementsJson as string) : []),\n"
    "    ...(record.scholarship && !isSchNotApplied(record.scholarship.status) ? parseReqs(record.scholarship.requirementsJson) : []),\n"
    "  ];\n"
    "  const requirementsFor = (record: UnifiedRecord) => {",
    "overview helpers")
s = rep(s,
    "const totalRequirementItems = unifiedRecords.reduce((total, record) => total + requirementsFor(record).length, 0);",
    "const totalRequirementItems = unifiedRecords.reduce((total, record) => total + activeRequirementsFor(record).length, 0);",
    "overview total docs ignores Not Applied")
s = rep(s,
    "const completedRequirementItems = unifiedRecords.reduce((total, record) => total + requirementsFor(record).filter(item => item.done).length, 0);",
    "const completedRequirementItems = unifiedRecords.reduce((total, record) => total + activeRequirementsFor(record).filter(item => item.done).length, 0);",
    "overview completed docs ignores Not Applied")
s = rep(s,
    "    .sort((a, b) => {\n      if (!a.deadline && !b.deadline) return 0;",
    "    .sort((a, b) => {\n      const offA = isDisabledRecord(a) ? 1 : 0;\n      const offB = isDisabledRecord(b) ? 1 : 0;\n      if (offA !== offB) return offA - offB;\n      if (!a.deadline && !b.deadline) return 0;",
    "overview list: Not Applied last")
s = rep(s,
    "className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${timeline ? 'bg-white/90' : 'bg-white'}`}",
    "className={`group rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${timeline ? 'bg-white/90' : 'bg-white'}${isDisabledRecord(record) ? ' opacity-60' : ''}`}",
    "overview card dimmed")
s = rep(s,
    "<span className=\"text-xs font-bold text-foreground\">{doneCount}/{reqs.length} done</span>",
    "<span className={`text-xs font-bold ${isDisabledRecord(record) ? 'text-muted-foreground/50 line-through' : 'text-foreground'}`} title={isDisabledRecord(record) ? 'Not counted while Not Applied' : undefined}>{doneCount}/{reqs.length} done</span>",
    "overview docs count disabled")

# --- Overview: combined total card
s = rep(s,
    "  return (\n    <div className=\"space-y-5 pb-4\" style={{ color: 'var(--apps-text-primary)' }}>",
    "  const activeApplicationCount = applicationRows.filter(app => !isAppNotApplied(app.status)).length;\n"
    "  const activeScholarshipCount = scholarshipRows.filter(item => !isSchNotApplied(item.status)).length;\n"
    "  const totalTargetCount = activeApplicationCount + activeScholarshipCount;\n"
    "  const notAppliedCount = (applicationRows.length - activeApplicationCount) + (scholarshipRows.length - activeScholarshipCount);\n\n"
    "  return (\n    <div className=\"space-y-5 pb-4\" style={{ color: 'var(--apps-text-primary)' }}>",
    "overview totals (variables)")
s = rep(s,
    "      <div className=\"grid grid-cols-2 gap-3 lg:grid-cols-4\">\n        {[\n          { label: 'Applications'",
    "      <div className=\"grid grid-cols-2 gap-3 lg:grid-cols-5\">\n"
    "        <div data-testid=\"unified-stat-total-targets\" className=\"col-span-2 rounded-2xl p-4 text-white lg:col-span-1\" style={{ background: 'linear-gradient(120deg, #17243D, #233B63, #176B73)' }}>\n"
    "          <div className=\"flex items-start justify-between gap-2\">\n"
    "            <div>\n"
    "              <p data-testid=\"text-total-targets\" className=\"font-heading text-3xl font-bold\">{totalTargetCount}</p>\n"
    "              <p className=\"mt-1 text-[11px] font-semibold text-[#A9DCE8]\">Applications + Scholarships</p>\n"
    "              <p className=\"mt-1 text-[10px] text-white/70\">{activeApplicationCount} application{activeApplicationCount === 1 ? '' : 's'} · {activeScholarshipCount} scholarship{activeScholarshipCount === 1 ? '' : 's'}</p>\n"
    "            </div>\n"
    "            <span className=\"flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[#A9DCE8]\"><Target className=\"h-4 w-4\" /></span>\n"
    "          </div>\n"
    "          {notAppliedCount > 0 && <p className=\"mt-2 text-[10px] text-white/50\">{notAppliedCount} Not Applied not counted</p>}\n"
    "        </div>\n"
    "        {[\n          { label: 'Applications'",
    "overview combined total card")

# --- Applications tab
s = rep(s,
    "    applicationRows.forEach(app => {\n      const requirements = safeParseReqs(app.requirementsJson as string);\n      docsCompleted += requirements.filter(item => item.done).length;\n      docsTotal += requirements.length;\n",
    "    applicationRows.forEach(app => {\n      const requirements = safeParseReqs(app.requirementsJson as string);\n      if (!isAppNotApplied(app.status)) {\n        docsCompleted += requirements.filter(item => item.done).length;\n        docsTotal += requirements.length;\n      }\n",
    "applications summary ignores Not Applied docs")
s = rep(s,
    "      .sort((a, b) => {\n        const da = String(a.deadline || '');\n        const db = String(b.deadline || '');\n        if (!da && !db) return 0;",
    "      .sort((a, b) => {\n        const offA = isAppNotApplied(a.status) ? 1 : 0;\n        const offB = isAppNotApplied(b.status) ? 1 : 0;\n        if (offA !== offB) return offA - offB;\n        const da = String(a.deadline || '');\n        const db = String(b.deadline || '');\n        if (!da && !db) return 0;",
    "applications sorted: Not Applied last")
s = rep(s,
    "{[...filteredApplications].sort((a, b) => {\n                const da = a.deadline as string | null;",
    "{[...filteredApplications].sort((a, b) => {\n                const offA = isAppNotApplied(a.status) ? 1 : 0;\n                const offB = isAppNotApplied(b.status) ? 1 : 0;\n                if (offA !== offB) return offA - offB;\n                const da = a.deadline as string | null;",
    "timeline sorted: Not Applied last")
s = rep(s,
    "             const sortedApps = filteredApplications;\n\n            if (countryFilter) {\n              return sortedApps.map(app => renderAppCard(app));\n            }",
    "             const sortedApps = filteredApplications.filter(app => !isAppNotApplied(app.status));\n             const notAppliedApps = filteredApplications.filter(app => isAppNotApplied(app.status));\n\n            if (countryFilter) {\n              return [...sortedApps, ...notAppliedApps].map(app => renderAppCard(app));\n            }",
    "applications list: split Not Applied")
s = rep(s,
    "            return sortedCountries.map(country => (\n              <div key={country}>",
    "            return (<>{sortedCountries.map(country => (\n              <div key={country}>",
    "applications list: open fragment")
s = rep(s,
    "                  {grouped[country].map(app => renderAppCard(app))}\n                </div>\n              </div>\n            ));\n          })()}",
    "                  {grouped[country].map(app => renderAppCard(app))}\n                </div>\n              </div>\n            ))}\n            {notAppliedApps.length > 0 && (\n              <div data-testid=\"section-not-applied-applications\">\n                <div className=\"flex items-center gap-2 mb-2 mt-3\">\n                  <h3 className=\"text-sm font-semibold text-muted-foreground uppercase tracking-wide\">Not Applied</h3>\n                  <div className=\"flex-1 h-px bg-border\" />\n                  <span className=\"text-xs text-muted-foreground\">{notAppliedApps.length}</span>\n                </div>\n                <div className=\"space-y-3\">\n                  {notAppliedApps.map(app => renderAppCard(app))}\n                </div>\n              </div>\n            )}</>);\n          })()}",
    "applications list: Not Applied section at bottom")
s = rep(s,
    "<Card key={app.id} data-testid={`card-application-${app.id}`} className=\"overflow-hidden transition-shadow hover:shadow-md\">",
    "<Card key={app.id} data-testid={`card-application-${app.id}`} className={`overflow-hidden transition-shadow hover:shadow-md${isAppNotApplied(app.status) ? ' opacity-60' : ''}`}>",
    "application card dimmed")
s = rep(s,
    "                        {reqs.length > 0 && (\n                          <span className=\"flex items-center gap-1 text-muted-foreground\">\n                            <FileText className=\"w-3 h-3\" />\n                            {doneCount}/{reqs.length} docs",
    "                        {reqs.length > 0 && (\n                          <span className={`flex items-center gap-1 ${isAppNotApplied(app.status) ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'}`} title={isAppNotApplied(app.status) ? 'Not counted while Not Applied' : undefined}>\n                            <FileText className=\"w-3 h-3\" />\n                            {doneCount}/{reqs.length} docs",
    "application docs count disabled")
s = rep(s,
    "<span className=\"text-muted-foreground\">{reqs.length ? `${done}/${reqs.length} docs` : 'No docs'}</span>",
    "<span className={isAppNotApplied(app.status) ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'}>{reqs.length ? `${done}/${reqs.length} docs` : 'No docs'}</span>",
    "kanban docs count disabled")

# --- Scholarships tab
s = rep(s,
    "    scholarshipRows.forEach(s => {\n      const requirements = parseReqs(s.requirementsJson);\n      docsCompleted += requirements.filter(item => item.done).length;\n      docsTotal += requirements.length;\n",
    "    scholarshipRows.forEach(s => {\n      const requirements = parseReqs(s.requirementsJson);\n      if (!isSchNotApplied(s.status)) {\n        docsCompleted += requirements.filter(item => item.done).length;\n        docsTotal += requirements.length;\n      }\n",
    "scholarships summary ignores Not Applied docs")
s = rep(s,
    "    if (sortMode === 'recent') return rows; // API already orders by createdAt desc — preserve that order\n    if (sortMode === 'status') {\n      return [...rows].sort((a, b) => (\n        SCH_STATUS_ORDER.indexOf(normalizeScholarshipStatus(a.status)) - SCH_STATUS_ORDER.indexOf(normalizeScholarshipStatus(b.status))\n      ));\n    }\n    return [...rows].sort((a, b) => {\n      const da = String(a.deadline || '');\n      const db = String(b.deadline || '');\n      if (!da && !db) return 0;\n      if (!da) return 1;\n      if (!db) return -1;\n      return da > db ? 1 : -1;\n    });\n",
    "    const pushNotAppliedDown = (list: typeof rows) => [...list.filter(item => !isSchNotApplied(item.status)), ...list.filter(item => isSchNotApplied(item.status))];\n"
    "    if (sortMode === 'recent') return pushNotAppliedDown(rows); // API already orders by createdAt desc — preserve that order\n    if (sortMode === 'status') {\n      return pushNotAppliedDown([...rows].sort((a, b) => (\n        SCH_STATUS_ORDER.indexOf(normalizeScholarshipStatus(a.status)) - SCH_STATUS_ORDER.indexOf(normalizeScholarshipStatus(b.status))\n      )));\n    }\n    return pushNotAppliedDown([...rows].sort((a, b) => {\n      const da = String(a.deadline || '');\n      const db = String(b.deadline || '');\n      if (!da && !db) return 0;\n      if (!da) return 1;\n      if (!db) return -1;\n      return da > db ? 1 : -1;\n    }));\n",
    "scholarships sorted: Not Applied last")
s = rep(s,
    "    filteredScholarships.forEach(s => {\n      const country = String(s.country || 'Other');",
    "    filteredScholarships.filter(s => !isSchNotApplied(s.status)).forEach(s => {\n      const country = String(s.country || 'Other');",
    "scholarship groups exclude Not Applied")
s = rep(s,
    "  const sortedCountries = Object.keys(groupedScholarships).sort();\n",
    "  const notAppliedScholarships = React.useMemo(() => filteredScholarships.filter(s => isSchNotApplied(s.status)), [filteredScholarships]);\n  const sortedCountries = Object.keys(groupedScholarships).sort();\n",
    "scholarship Not Applied list")
s = rep(s,
    "            </section>\n          ))}\n        </div>\n      )}\n    </div>\n\n    <ScholarshipDetailDrawer",
    "            </section>\n          ))}\n          {notAppliedScholarships.length > 0 && (\n            <section data-testid=\"section-not-applied-scholarships\">\n              <div className=\"flex items-center gap-2 mb-2 mt-1\">\n                <h3 className=\"text-sm font-semibold text-muted-foreground uppercase tracking-wide\">Not Applied</h3>\n                <div className=\"flex-1 h-px bg-border\" />\n                <span className=\"text-xs text-muted-foreground\">{notAppliedScholarships.length}</span>\n              </div>\n              <div className=\"space-y-3\">\n                {notAppliedScholarships.map(s => renderSchCard(s))}\n              </div>\n            </section>\n          )}\n        </div>\n      )}\n    </div>\n\n    <ScholarshipDetailDrawer",
    "scholarship list: Not Applied section at bottom")
s = rep(s,
    "className=\"group overflow-hidden rounded-[20px] border-none shadow-none bg-white dark:bg-card hover:shadow-md transition-all\">",
    "className={`group overflow-hidden rounded-[20px] border-none shadow-none bg-white dark:bg-card hover:shadow-md transition-all${isSchNotApplied(s.status) ? ' opacity-60' : ''}`}>",
    "scholarship card dimmed")
s = rep(s,
    "{reqs.length > 0 && <span className=\"ml-auto font-normal normal-case tracking-normal text-muted-foreground\">{doneCount}/{reqs.length} done</span>}",
    "{reqs.length > 0 && <span className={`ml-auto font-normal normal-case tracking-normal ${isSchNotApplied(s.status) ? 'text-muted-foreground/50 line-through' : 'text-muted-foreground'}`} title={isSchNotApplied(s.status) ? 'Not counted while Not Applied' : undefined}>{doneCount}/{reqs.length} done</span>}",
    "scholarship docs count disabled")
open(p, "w", encoding="utf-8").write(s)

# ===================================================================== flyStyles
p, s = load("src/lib/flyStyles.ts")
s = rep(s, "not_eligible: { label: 'Not Eligible', ...FLY_PASTELS.rose },",
        "not_eligible: { label: 'Not Applied', ...FLY_PASTELS.slate },", "flyStyles label")
open(p, "w", encoding="utf-8").write(s)

# ===================================================================== App.tsx (Home)
p, s = load("src/App.tsx")

RESOURCES = '''/* ─── RESOURCES DROPDOWN (Home nav) ─────────────────────────────────────── */
// Add or edit links here. An entry with an empty href stays hidden until you paste a link.
const RESOURCE_LINKS: { label: string; href: string }[] = [
  { label: 'Updates about Fly', href: 'https://youtube.com/playlist?list=PLb9m3FmRpwa8&si=drHFHb2oD0EQ9IKL' },
  { label: 'Iprep 2027', href: 'https://youtube.com/playlist?list=PLT9y-1EiZd74&si=fDxh75q-X5ha7jGF' },
  { label: 'YouTube playlist', href: '' },
];

function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const links = RESOURCE_LINKS.filter(l => l.href);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} data-testid="button-resources-menu"
        className="inline-flex items-center gap-1 text-[13px] font-medium pb-1 border-b-2 border-transparent transition-colors hover:text-[#176B73]" style={{ color: open ? '#176B73' : '#64748B' }}>
        Resources <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-30 mt-2 w-64 rounded-2xl border bg-white p-1.5" style={{ borderColor: '#E3EAF0', boxShadow: '0 12px 32px rgba(23,36,61,.12)' }}>
          {links.map(l => (
            <a key={l.label} role="menuitem" href={l.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#233B63] transition-colors hover:bg-[#F8FAFC]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FBEEEE] text-[#D95757]"><Youtube className="h-4 w-4" /></span>
              <span className="flex-1">{l.label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[#94A3B8]" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── LANDING PAGE ──────────────────────────────────────────────────────── */'''
s = rep(s, "/* ─── LANDING PAGE ──────────────────────────────────────────────────────── */", RESOURCES, "Resources dropdown component")
s = rep(s,
    "<span title=\"Coming soon\" className=\"text-[13px] font-medium text-slate-400/70 cursor-not-allowed pb-1 border-b-2 border-transparent\">Resources</span>",
    "<ResourcesMenu />", "Resources nav uses dropdown")

# Not Applied is left out of Home totals
s = rep(s, "  appRows.forEach(a => {\n", "  appRows.forEach(a => {\n    if (a.status === 'withdrawn') return; // Not Applied: documents not counted\n", "home docs ignore Not Applied")
s = rep(s, "const upcomingApplications = appRows.filter(a => a.days !== null && a.days >= 0)",
        "const upcomingApplications = appRows.filter(a => a.status !== 'withdrawn' && a.days !== null && a.days >= 0)", "home deadlines ignore Not Applied")
s = rep(s, ".filter(s => s.days !== null && s.days >= 0)\n    .sort((a, b) => a.days - b.days)[0];",
        ".filter(s => s.status !== 'not_eligible' && s.days !== null && s.days >= 0)\n    .sort((a, b) => a.days - b.days)[0];", "home scholarship deadline ignores Not Applied")

# smaller hero card
s = rep(s, "<header className=\"px-4 sm:px-7 lg:px-10 pt-5 sm:pt-7\">", "<header className=\"px-4 sm:px-7 lg:px-10 pt-4 sm:pt-5\">", "hero: top spacing")
s = rep(s, "gap-8 lg:gap-12 items-center p-6 sm:p-9 lg:p-12\">", "gap-6 lg:gap-8 items-center p-5 sm:p-7 lg:p-8\">", "hero: padding")
s = rep(s, "px-3.5 py-2 mb-6 text-[10px] sm:text-[11px]", "px-3 py-1.5 mb-4 text-[10px] sm:text-[11px]", "hero: badge")
s = rep(s, "leading-[1.04] tracking-[-.045em] mb-5\" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(2.6rem, 5.1vw, 4.5rem)' }}",
        "leading-[1.04] tracking-[-.045em] mb-3\" style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(2rem, 3.6vw, 3.1rem)' }}", "hero: title size")
s = rep(s, "text-[14px] sm:text-[15px] leading-7 text-white/75 mb-7", "text-[13px] sm:text-[14px] leading-6 text-white/75 mb-5", "hero: paragraph")
s = rep(s, "mt-9 flex flex-wrap items-center gap-3", "mt-6 flex flex-wrap items-center gap-3", "hero: stat chips spacing")
s = rep(s, "rounded-2xl px-4 py-3", "rounded-2xl px-3.5 py-2.5", "hero: stat chips padding", count=2)
s = rep(s, "min-h-[250px] sm:min-h-[340px] lg:min-h-[420px]", "min-h-[170px] sm:min-h-[230px] lg:min-h-[290px]", "hero: image height")
open(p, "w", encoding="utf-8").write(s)

# ===================================================================== sign-in / sign-up logo
for rel in ("src/pages/SignInPage.tsx", "src/pages/SignUpPage.tsx"):
    p, s = load(rel)
    marker = "<h1 style={{ position: 'relative', color: '#FFFFFF'"
    if "/images/logo-mark.png" in s:
        print("already:", rel, "logo")
    elif marker in s:
        s = s.replace(marker, "<img src=\"/images/logo-mark.png\" alt=\"\" width=\"56\" height=\"56\" style={{ position: 'relative', display: 'block', margin: '0 auto 0.75rem' }} />\n          " + marker, 1)
        open(p, "w", encoding="utf-8").write(s)
        print("ok     :", rel, "logo")
    else:
        print("note   :", rel, "header differs - logo not added")

# ===================================================================== index.html
p, s = load("index.html")
if 'name="theme-color"' not in s:
    s = s.replace('<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
                  '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <meta name="theme-color" content="#17243D" />', 1)
    open(p, "w", encoding="utf-8").write(s)
    print("ok     : theme-color")

print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your file differs from what I expected):")
    for x in problems:
        print("  -", x)
    sys.exit(1)
print("All edits applied.")
