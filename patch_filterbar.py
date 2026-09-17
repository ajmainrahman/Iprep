path = "artifacts/ielts-tracker/src/pages/HigherStudyPrep.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """      {/* Filter bar */}
      <div className="rounded-xl border p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          {uniqueCountries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="filter-application-country-all"
                onClick={() => setCountryFilter(null)}
                className="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors"
                style={!countryFilter
                  ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                  : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
              >
                All
              </button>
              {uniqueCountries.map(c => (
                <button
                  type="button"
                  data-testid={`filter-application-country-${c}`}
                  key={c}
                  onClick={() => setCountryFilter(countryFilter === c ? null : c)}
                  className="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors"
                  style={countryFilter === c
                    ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                    : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 xl:ml-auto">
            <div className="relative min-w-0 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--apps-text-muted)' }} />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search universities or programs..."
                aria-label="Search universities or programs"
                className="h-9 border pl-9 text-xs"
                style={{ backgroundColor: 'var(--apps-bg-page)', borderColor: 'var(--apps-border)', color: 'var(--apps-text-primary)' }}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium shrink-0" style={{ color: 'var(--apps-text-secondary)' }}>Priority:</span>
              {([null, 'high', 'medium', 'low'] as (Priority | null)[]).map(p => (
                <button
                  type="button"
                  data-testid={`filter-application-priority-${p ?? 'all'}`}
                  key={p ?? 'all'}
                  onClick={() => setPriorityFilter(p)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={priorityFilter === p
                    ? p
                      ? { backgroundColor: PRIORITY_META[p].bg.includes('red') ? 'var(--apps-priority-high-bg)' : PRIORITY_META[p].bg.includes('orange') ? 'var(--apps-priority-medium-bg)' : 'var(--apps-priority-low-bg)', color: p === 'high' ? 'var(--apps-priority-high)' : p === 'medium' ? 'var(--apps-priority-medium)' : 'var(--apps-priority-low)', borderColor: 'transparent' }
                      : { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                    : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
                >
                  {p ? PRIORITY_META[p].label : 'All'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium shrink-0" style={{ color: 'var(--apps-text-secondary)' }}>Readiness:</span>
              {([
                [null, 'All'],
                ['started', 'Just started'],
                ['progress', 'In progress'],
                ['ready', 'Ready'],
              ] as [('started' | 'progress' | 'ready' | null), string][]).map(([key, label]) => (
                <button
                  type="button"
                  data-testid={`filter-application-readiness-${key ?? 'all'}`}
                  key={key ?? 'all'}
                  onClick={() => setReadinessFilter(key)}
                  className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={readinessFilter === key
                    ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                    : { backgroundColor: 'var(--apps-bg-card)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>"""

new_block = """      {/* Filter bar */}
      <div className="rounded-xl border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] space-y-3" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--apps-text-muted)' }} />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search universities or programs..."
            aria-label="Search universities or programs"
            className="h-10 w-full border pl-9 text-sm"
            style={{ backgroundColor: 'var(--apps-bg-page)', borderColor: 'var(--apps-border)', color: 'var(--apps-text-primary)' }}
          />
        </div>

        {uniqueCountries.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
            <span className="text-xs font-semibold shrink-0 uppercase tracking-wide" style={{ color: 'var(--apps-text-muted)' }}>Country</span>
            <button
              type="button"
              data-testid="filter-application-country-all"
              onClick={() => setCountryFilter(null)}
              className="rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors shrink-0"
              style={!countryFilter
                ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                : { backgroundColor: 'var(--apps-bg-page)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
            >
              All
            </button>
            {uniqueCountries.map(c => (
              <button
                type="button"
                data-testid={`filter-application-country-${c}`}
                key={c}
                onClick={() => setCountryFilter(countryFilter === c ? null : c)}
                className="rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors shrink-0 whitespace-nowrap"
                style={countryFilter === c
                  ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                  : { backgroundColor: 'var(--apps-bg-page)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 pt-1 border-t" style={{ borderColor: 'var(--apps-border)' }}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold shrink-0 uppercase tracking-wide" style={{ color: 'var(--apps-text-muted)' }}>Priority</span>
            {([null, 'high', 'medium', 'low'] as (Priority | null)[]).map(p => (
              <button
                type="button"
                data-testid={`filter-application-priority-${p ?? 'all'}`}
                key={p ?? 'all'}
                onClick={() => setPriorityFilter(p)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={priorityFilter === p
                  ? p
                    ? { backgroundColor: PRIORITY_META[p].bg.includes('red') ? 'var(--apps-priority-high-bg)' : PRIORITY_META[p].bg.includes('orange') ? 'var(--apps-priority-medium-bg)' : 'var(--apps-priority-low-bg)', color: p === 'high' ? 'var(--apps-priority-high)' : p === 'medium' ? 'var(--apps-priority-medium)' : 'var(--apps-priority-low)', borderColor: 'transparent' }
                    : { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                  : { backgroundColor: 'var(--apps-bg-page)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
              >
                {p ? PRIORITY_META[p].label : 'All'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold shrink-0 uppercase tracking-wide" style={{ color: 'var(--apps-text-muted)' }}>Readiness</span>
            {([
              [null, 'All'],
              ['started', 'Just started'],
              ['progress', 'In progress'],
              ['ready', 'Ready'],
            ] as [('started' | 'progress' | 'ready' | null), string][]).map(([key, label]) => (
              <button
                type="button"
                data-testid={`filter-application-readiness-${key ?? 'all'}`}
                key={key ?? 'all'}
                onClick={() => setReadinessFilter(key)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                style={readinessFilter === key
                  ? { backgroundColor: 'var(--apps-accent)', color: '#fff', borderColor: 'var(--apps-accent)' }
                  : { backgroundColor: 'var(--apps-bg-page)', color: 'var(--apps-text-secondary)', borderColor: 'var(--apps-border)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>"""

count = content.count(old_block)
content = content.replace(old_block, new_block)
print(f"Filter bar block: replaced {count} occurrence(s)")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
