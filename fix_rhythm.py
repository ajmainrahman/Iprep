#!/usr/bin/env python3
"""Dashboard: fix the Study schedule (calendar) + Your study rhythm (streak/heatmap) layout.

Root causes fixed:
  1. The 52-week heatmap forced the right column to ~1100px wide, which squeezed the
     calendar to ~260px (crammed weekday names, touching dates). The heatmap now fits
     the card width (shows as many recent weeks as fit) and both columns can shrink.
  2. Both cards were `h-full` inside a column that also holds the heading, so they
     overflowed into the "Module progress" heading below. Columns are now flex columns.
  3. "1 DAYS" -> "1 DAY"; legend had a duplicated colour; future days no longer drawn.

Safe to run twice.   Usage (project root):  python3 fix_rhythm.py artifacts/ielts-tracker
"""
import os, sys

APP = sys.argv[1] if len(sys.argv) > 1 else "artifacts/ielts-tracker"
path = os.path.join(APP, "src/pages/Dashboard.tsx")
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


# ── 1. new responsive heatmap ───────────────────────────────────────────────
HEATMAP = r'''/* ─── Activity heatmap (fits its card; shows as many recent weeks as fit) ───── */
function StudyHeatmap({ sessions }: { sessions: any[] }) {
  const [tooltip, setTooltip] = useState<{ date: string; mins: number; x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBoxWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dayMap = useMemo(() => {
    const m: Record<string, number> = {};
    sessions.forEach((s: any) => {
      m[s.date] = (m[s.date] || 0) + Number(s.minutes || 0);
    });
    return m;
  }, [sessions]);

  const LABEL_COL = 28;
  const MIN_PITCH = 17;
  const weekCount = boxWidth > 0
    ? Math.max(10, Math.min(52, Math.floor((boxWidth - LABEL_COL) / MIN_PITCH)))
    : 26;

  const today = new Date();
  const todayStr = localDateStr(today);
  const start = addDays(startOfWeek(today), -(weekCount - 1) * 7);

  const weeks: { date: Date; dateStr: string; mins: number }[][] = [];
  let cur = new Date(start);
  while (cur <= today) {
    const week: { date: Date; dateStr: string; mins: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const ds = localDateStr(cur);
      week.push({ date: new Date(cur), dateStr: ds, mins: dayMap[ds] || 0 });
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }

  const cellColor = (mins: number) => {
    if (mins === 0) return '#E8EEF2';
    if (mins < 20) return '#A9DCE8';
    if (mins < 45) return '#19C7B7';
    return '#176B73';
  };

  const DAY_LABELS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };

  return (
    <div className="w-full" ref={boxRef}>
      <div
        className="grid gap-[3px]"
        style={{
          gridTemplateColumns: `${LABEL_COL - 3}px repeat(${weeks.length}, minmax(0, 1fr))`,
          gridTemplateRows: '16px repeat(7, auto)',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map(di => (
          <div
            key={`dl${di}`}
            className="flex items-center text-[9px] font-medium leading-none text-muted-foreground"
            style={{ gridColumn: 1, gridRow: di + 2 }}
          >
            {DAY_LABELS[di] || ''}
          </div>
        ))}
        {weeks.map((week, wi) => {
          const monthChanged = wi === 0 || week[0].date.getMonth() !== weeks[wi - 1][0].date.getMonth();
          // skip a label that would collide with the next month's label (needs ~3 columns of room)
          const nextChanged = wi === 0 && weeks.length > 1 && weeks[1][0].date.getMonth() !== week[0].date.getMonth();
          const showLabel = monthChanged && !nextChanged;
          return (
            <React.Fragment key={wi}>
              {showLabel && (
                <div
                  className="whitespace-nowrap text-[9px] font-medium leading-4 text-muted-foreground"
                  style={{ gridColumn: wi + 2, gridRow: 1 }}
                >
                  {week[0].date.toLocaleDateString(undefined, { month: 'short' })}
                </div>
              )}
              {week.map((day, di) => {
                if (day.dateStr > todayStr) return <div key={di} style={{ gridColumn: wi + 2, gridRow: di + 2 }} />;
                return (
                  <div
                    key={di}
                    className="aspect-square w-full cursor-pointer rounded-[4px] transition-opacity hover:opacity-80"
                    style={{ gridColumn: wi + 2, gridRow: di + 2, backgroundColor: cellColor(day.mins) }}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ date: day.dateStr, mins: day.mins, x: rect.left, y: rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {['#E8EEF2', '#A9DCE8', '#19C7B7', '#176B73'].map(c => (
          <div key={c} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-[#17243D] text-white text-xs px-2 py-1.5 rounded-lg shadow-lg pointer-events-none"
          style={{ top: tooltip.y - 36, left: tooltip.x - 20 }}
        >
          {tooltip.date}: {tooltip.mins > 0 ? `${tooltip.mins} min` : 'No study'}
        </div>
      )}
    </div>
  );
}

'''

a = s.find("/* ─── 52-week heatmap")
b = s.find("/* ─── Progress visualisations")
if "Activity heatmap (fits its card" in s:
    print("already: responsive heatmap")
elif a == -1 or b == -1 or b < a:
    problems.append("heatmap: could not find the old heatmap block"); print("MISSING: responsive heatmap")
else:
    s = s[:a] + HEATMAP + s[b:]; print("ok     : responsive heatmap")

# ── 2. cards must not overflow their column ─────────────────────────────────
rep('<Card className="h-full overflow-hidden border border-[#E3EAF0] shadow-[0_8px_30px_rgba(23,36,61,.045)]">',
    '<Card className="flex flex-1 flex-col overflow-hidden border border-[#E3EAF0] shadow-[0_8px_30px_rgba(23,36,61,.045)]">',
    "streak card height")
rep('<CardContent className="space-y-5 p-4 sm:p-5">\n        <div className="flex items-center justify-between rounded-2xl border border-[#F2C75C]',
    '<CardContent className="flex flex-1 flex-col gap-5 p-4 sm:p-5">\n        <div className="flex items-center justify-between rounded-2xl border border-[#F2C75C]',
    "streak card content")
rep('<Card className="shadow-[0_8px_30px_rgba(23,36,61,.045)] border border-[#E3EAF0] h-full">',
    '<Card className="shadow-[0_8px_30px_rgba(23,36,61,.045)] border border-[#E3EAF0] flex-1">',
    "calendar card height")

# ── 3. columns can shrink + stretch ─────────────────────────────────────────
rep('        <div>\n          <div className="mb-3">\n            <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">Make time for practice</p>',
    '        <div className="flex min-w-0 flex-col">\n          <div className="mb-3">\n            <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">Make time for practice</p>',
    "left column")
rep('        <div>\n          <div className="mb-3">\n            <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">Consistency over intensity</p>',
    '        <div className="flex min-w-0 flex-col">\n          <div className="mb-3">\n            <p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#176B73]">Consistency over intensity</p>',
    "right column")

# ── 4. calendar header ──────────────────────────────────────────────────────
rep('<span className="flex items-center gap-2">\n            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DDF4F7]"><CalendarIcon',
    '<span className="flex min-w-0 items-center gap-2 whitespace-nowrap">\n            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#DDF4F7]"><CalendarIcon',
    "calendar title on one line")

# ── 5. wording ──────────────────────────────────────────────────────────────
rep('<p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">days</p>',
    '<p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{currentStreak === 1 ? \'day\' : \'days\'}</p>',
    "1 day / n days")
rep('<span className="text-sm font-bold text-[#B8860B]">{record} days</span>',
    '<span className="text-sm font-bold text-[#B8860B]">{record} {record === 1 ? \'day\' : \'days\'}</span>',
    "record wording")

open(path, "w", encoding="utf-8").write(s)
print()
if problems:
    print("SOME EDITS COULD NOT BE APPLIED (your file differs from what I expected):")
    for x in problems: print("  -", x)
    sys.exit(1)
print("All edits applied.")
