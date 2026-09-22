path = "artifacts/ielts-tracker/src/App.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    ("""          <button onClick={() => setLocation('/study/study')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#C8FBF2' }}>""",
     """          <div className="h-5 w-px bg-border hidden sm:block" />
          <button onClick={() => setLocation('/study/study')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#C8FBF2' }}>"""),

    ("""          <button onClick={() => setLocation('/study/practice')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FBD9E0' }}>""",
     """          <div className="h-5 w-px bg-border hidden sm:block" />
          <button onClick={() => setLocation('/study/practice')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FBD9E0' }}>"""),

    ("""          <button onClick={() => setLocation('/study/vocab')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#DCEFFB' }}>""",
     """          <div className="h-5 w-px bg-border hidden sm:block" />
          <button onClick={() => setLocation('/study/vocab')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#DCEFFB' }}>"""),

    ("""          <button onClick={() => setLocation('/study/planning')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FFE3C7' }}>
              <CalendarClock className="h-3.5 w-3.5" style={{ color: '#EA6A1F' }} />""",
     """          <div className="h-5 w-px bg-border hidden sm:block" />
          <button onClick={() => setLocation('/study/planning')} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground/80 hover:text-foreground transition-colors">
            <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FFE3C7' }}>
              <CalendarClock className="h-3.5 w-3.5" style={{ color: '#EA6A1F' }} />"""),

    ('<div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 bg-white">✈️</div>',
     '<div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white"><Plane className="h-5 w-5" style={{ color: \'#14142B\' }} /></div>'),

    ('<div className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 bg-white">📚</div>',
     '<div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-white"><BookOpen className="h-5 w-5" style={{ color: \'#14142B\' }} /></div>'),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    print(f"[{count}x] {old.strip().splitlines()[0][:60]}...")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
