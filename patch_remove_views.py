path = "artifacts/ielts-tracker/src/pages/HigherStudyPrep.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Force viewMode to always initialize/stay as 'list' (ignore any stale saved kanban/timeline)
old_state = """  const [viewMode,    setViewMode]    = useState<'list' | 'timeline' | 'kanban'>(() => {
    try {
      const saved = sessionStorage.getItem('apps-view-mode');
      return saved === 'list' || saved === 'timeline' || saved === 'kanban' ? saved : 'list';
    } catch { return 'list'; }
  });
  useEffect(() => {
    try { sessionStorage.setItem('apps-view-mode', viewMode); } catch { /* storage unavailable — non-fatal */ }
  }, [viewMode]);"""

new_state = """  const [viewMode,    setViewMode]    = useState<'list' | 'timeline' | 'kanban'>('list');"""

c1 = content.count(old_state)
content = content.replace(old_state, new_state)
print(f"viewMode state init: {c1} occurrence(s)")

# 2. Remove Pipeline and Timeline buttons, keep only List
old_toggle = """          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--apps-border)' }}>
            <button
              type="button"
              data-testid="button-applications-view-list"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'list' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`}
              style={viewMode === 'list' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              type="button"
              data-testid="button-applications-view-kanban"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'kanban' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`}
              style={viewMode === 'kanban' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}
            >
              <Layers className="w-3.5 h-3.5" /> Pipeline
            </button>
            <button
              type="button"
              data-testid="button-applications-view-timeline"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'timeline' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`}
              style={viewMode === 'timeline' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}
            >
              <GitBranch className="w-3.5 h-3.5" /> Timeline
            </button>
          </div>"""

new_toggle = """          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--apps-border)' }}>
            <button
              type="button"
              data-testid="button-applications-view-list"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 transition-colors flex items-center gap-1 text-xs font-medium ${viewMode === 'list' ? 'text-white' : 'hover:bg-[var(--apps-bg-page)]'}`}
              style={viewMode === 'list' ? { backgroundColor: 'var(--apps-accent)' } : { color: 'var(--apps-text-secondary)' }}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>"""

c2 = content.count(old_toggle)
content = content.replace(old_toggle, new_toggle)
print(f"View toggle buttons: {c2} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
