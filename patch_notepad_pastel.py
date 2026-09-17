path = "artifacts/ielts-tracker/src/pages/FlyNotepad.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Pastel TYPE_META palette
old_meta = """const TYPE_META: Record<NoteType, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
  note:   { label: 'Note',   icon: FileText,   color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' },
  plan:   { label: 'Plan',   icon: Target,     color: 'text-green-600',  bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' },
  budget: { label: 'Budget', icon: DollarSign, color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' },
  link:   { label: 'Link',   icon: LinkIcon,   color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' },
};"""

new_meta = """const TYPE_META: Record<NoteType, { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; chip: string }> = {
  note:   { label: 'Note',   icon: FileText,   color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800', chip: 'bg-white/70 dark:bg-black/20' },
  plan:   { label: 'Plan',   icon: Target,     color: 'text-violet-700 dark:text-violet-300',   bg: 'bg-violet-50 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800',     chip: 'bg-white/70 dark:bg-black/20' },
  budget: { label: 'Budget', icon: DollarSign, color: 'text-amber-700 dark:text-amber-300',     bg: 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',       chip: 'bg-white/70 dark:bg-black/20' },
  link:   { label: 'Link',   icon: LinkIcon,   color: 'text-rose-700 dark:text-rose-300',       bg: 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',           chip: 'bg-white/70 dark:bg-black/20' },
};"""

c1 = content.count(old_meta)
content = content.replace(old_meta, new_meta)
print(f"TYPE_META palette: {c1} occurrence(s)")

# 2. Pastel filter pills
old_filters = """      <div className="flex gap-2 flex-wrap">
        {(['all', 'note', 'plan', 'budget', 'link'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
              filterType === t
                ? 'bg-navy dark:bg-indigo text-white border-navy dark:border-indigo'
                : 'bg-background border-border text-muted-foreground hover:border-navy/40'
            }`}
          >
            {t === 'all' ? 'All' : TYPE_META[t].label + 's'}
          </button>
        ))}
      </div>"""

new_filters = """      <div className="flex gap-2 flex-wrap">
        {(['all', 'note', 'plan', 'budget', 'link'] as const).map(t => {
          const active = filterType === t;
          const pastel = t !== 'all' ? TYPE_META[t] : null;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3.5 py-1.5 rounded-full border font-medium transition-all ${
                active
                  ? pastel
                    ? `${pastel.bg} ${pastel.color} border-transparent shadow-sm`
                    : 'bg-navy dark:bg-indigo text-white border-navy dark:border-indigo'
                  : 'bg-background border-border text-muted-foreground hover:border-navy/40'
              }`}
            >
              {t === 'all' ? 'All' : TYPE_META[t].label + 's'}
            </button>
          );
        })}
      </div>"""

c2 = content.count(old_filters)
content = content.replace(old_filters, new_filters)
print(f"Filter pills: {c2} occurrence(s)")

# 3. Pastel note cards
old_card = """        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.note;
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={`group border transition-shadow hover:shadow-md ${meta.bg}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                      <div className="min-w-0">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                        <p className="font-semibold text-sm text-foreground leading-tight mt-0.5">{n.title}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(n)} className="p-1 rounded hover:bg-background/60 text-muted-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(n.id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {n.content && (
                    <p className="text-sm text-foreground/75 mt-2 whitespace-pre-wrap">{n.content}</p>
                  )}
                  {n.url && (
                    
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 text-xs mt-2 underline underline-offset-2 ${meta.color}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {n.url.replace(/^https?:\\/\\//, '').slice(0, 40)}{n.url.length > 40 ? '…' : ''}
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>"""

new_card = """        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.note;
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={`group rounded-2xl border-0 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${meta.bg}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.chip} ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                        <p className="font-semibold text-sm text-foreground leading-snug mt-0.5">{n.title}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(n)} className="p-1.5 rounded-lg hover:bg-white/70 dark:hover:bg-black/20 text-muted-foreground">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(n.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {n.content && (
                    <p className="text-sm text-foreground/75 mt-3 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  )}
                  {n.url && (
                    
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 text-xs mt-3 font-medium underline underline-offset-2 ${meta.color}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      {n.url.replace(/^https?:\\/\\//, '').slice(0, 40)}{n.url.length > 40 ? '…' : ''}
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>"""

c3 = content.count(old_card)
content = content.replace(old_card, new_card)
print(f"Note cards: {c3} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
