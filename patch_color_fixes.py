path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    ("<FileText className=\"h-4 w-4 mb-1.5\" style={{ color: '#684888' }} />\n                <p className=\"text-lg font-black leading-none text-foreground\">{appRows.length}</p>",
     "<FileText className=\"h-4 w-4 mb-1.5\" style={{ color: '#D6416A' }} />\n                <p className=\"text-lg font-black leading-none text-foreground\">{appRows.length}</p>"),
    ("<GraduationCap className=\"h-4 w-4 mb-1.5\" style={{ color: '#684888' }} />\n                <p className=\"text-lg font-black leading-none text-foreground\">{(scholarships as any[]).length}</p>",
     "<GraduationCap className=\"h-4 w-4 mb-1.5\" style={{ color: '#D6416A' }} />\n                <p className=\"text-lg font-black leading-none text-foreground\">{(scholarships as any[]).length}</p>"),
    ("<CalendarClock className=\"h-4 w-4 mb-1.5\" style={{ color: '#684888' }} />\n                <p className=\"text-lg font-black leading-none text-foreground\">{upcomingDeadlineCount}</p>",
     "<CalendarClock className=\"h-4 w-4 mb-1.5\" style={{ color: '#D6416A' }} />\n                <p className=\"text-lg font-black leading-none text-foreground\">{upcomingDeadlineCount}</p>"),
    ("<ClipboardCheck className=\"h-4 w-4 mb-1.5\" style={{ color: '#684888' }} />",
     "<ClipboardCheck className=\"h-4 w-4 mb-1.5\" style={{ color: '#D6416A' }} />"),
    ("<span className=\"flex items-center gap-1.5 text-[13px] font-bold\" style={{ color: '#684888' }}>\n              Continue tracking",
     "<span className=\"flex items-center gap-1.5 text-[13px] font-bold\" style={{ color: '#D6416A' }}>\n              Continue tracking"),
    ("<span className=\"flex h-8 w-8 items-center justify-center rounded-full shrink-0 bg-white\" style={{ color: item.iconColor }}>",
     "<span className=\"flex h-8 w-8 items-center justify-center rounded-full shrink-0\" style={{ backgroundColor: item.iconBg, color: item.iconColor }}>"),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    print(f"[{count}x] {old.strip().splitlines()[0][:60]}...")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
