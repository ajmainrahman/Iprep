---
name: Timezone date comparison bug
description: toISOString() returns UTC dates; breaks date comparison for users in UTC+ timezones
---

**Rule:** Never use `toISOString().split('T')[0]` to get today's local date for DB comparisons. Use a `localDateStr(d: Date)` helper instead.

**Why:** PostgreSQL text date fields store dates as "YYYY-MM-DD" entered by the user (local date). `toISOString()` returns UTC, which can be the previous day for users in UTC+1 to UTC+14 time zones. This causes heatmap cells and bar chart bars to show zero even when sessions exist.

**How to apply:** Any time you compute "today" or iterate over dates to compare against DB-stored text dates, use:
```ts
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```
Also parse stored "YYYY-MM-DD" strings as `new Date(y, mo-1, d)` (local constructor), NOT `new Date("YYYY-MM-DD")` which parses as UTC midnight.
