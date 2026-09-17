path = "artifacts/ielts-tracker/src/pages/FlyNotepad.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = [
    (
        '<Card key={n.id} className={`group border transition-shadow hover:shadow-md ${meta.bg}`}>',
        '<Card key={n.id} className={`group rounded-2xl border-0 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${meta.bg}`}>',
    ),
    (
        '<CardContent className="p-4">',
        '<CardContent className="p-5">',
    ),
    (
        '''<div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                      <div className="min-w-0">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                        <p className="font-semibold text-sm text-foreground leading-tight mt-0.5">{n.title}</p>
                      </div>
                    </div>''',
        '''<div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.chip} ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                        <p className="font-semibold text-sm text-foreground leading-snug mt-0.5">{n.title}</p>
                      </div>
                    </div>''',
    ),
    (
        '<button onClick={() => startEdit(n)} className="p-1 rounded hover:bg-background/60 text-muted-foreground">',
        '<button onClick={() => startEdit(n)} className="p-1.5 rounded-lg hover:bg-white/70 dark:hover:bg-black/20 text-muted-foreground">',
    ),
    (
        '<button onClick={() => deleteMutation.mutate(n.id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">',
        '<button onClick={() => deleteMutation.mutate(n.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-500">',
    ),
    (
        '<p className="text-sm text-foreground/75 mt-2 whitespace-pre-wrap">{n.content}</p>',
        '<p className="text-sm text-foreground/75 mt-3 whitespace-pre-wrap leading-relaxed">{n.content}</p>',
    ),
    (
        'className={`inline-flex items-center gap-1 text-xs mt-2 underline underline-offset-2 ${meta.color}`}',
        'className={`inline-flex items-center gap-1 text-xs mt-3 font-medium underline underline-offset-2 ${meta.color}`}',
    ),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    label = old.strip().splitlines()[0][:60]
    print(f"[{count}x] {label}...")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
