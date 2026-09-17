import re

path = "artifacts/ielts-tracker/src/pages/HigherStudyPrep.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_priority_card = """        <div className="rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" style={{ backgroundColor: 'var(--apps-bg-card)', borderColor: 'var(--apps-border)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--apps-text-primary)' }}>By Priority</p>
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--apps-progress-track)' }}>
                {(['high', 'medium', 'low'] as Priority[]).map(priority => (
                  <div
                    key={priority}
                    style={{
                      width: `${(applicationSummary.priorityCounts[priority] / priorityTotal) * 100}%`,
                      backgroundColor: priority === 'high' ? 'var(--apps-priority-high)' : priority === 'medium' ? 'var(--apps-priority-medium)' : 'var(--apps-priority-low)',
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: 'var(--apps-text-muted)' }}>
                {(['high', 'medium', 'low'] as Priority[]).map(priority => (
                  <span key={priority} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority === 'high' ? 'var(--apps-priority-high)' : priority === 'medium' ? 'var(--apps-priority-medium)' : 'var(--apps-priority-low)' }} />
                    {PRIORITY_META[priority].label} {applicationSummary.priorityCounts[priority]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
"""

if old_priority_card in content:
    content = content.replace(old_priority_card, "")
    print("DONE: removed By Priority card")
else:
    print("MISS: priority card block not found")

old_withdrawn = "  withdrawn:      { label: 'Withdrawn',      color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800' },"
new_withdrawn = "  withdrawn:      { label: 'Not Applied',    color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800' },"

if old_withdrawn in content:
    content = content.replace(old_withdrawn, new_withdrawn)
    print("DONE: renamed Withdrawn to Not Applied")
else:
    print("MISS: withdrawn label not found")

old_pulse_map = "{(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][]).map(([status, meta]) => {"
new_pulse_map = """{(Object.entries(APP_STATUS_META) as [AppStatus, typeof APP_STATUS_META[AppStatus]][])
            .filter(([status]) => !(['shortlisted', 'preparing', 'under_review', 'accepted', 'deferred'] as AppStatus[]).includes(status))
            .map(([status, meta]) => {"""

if old_pulse_map in content:
    content = content.replace(old_pulse_map, new_pulse_map)
    print("DONE: filtered 5 statuses from pulse tiles")
else:
    print("MISS: pulse map line not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
