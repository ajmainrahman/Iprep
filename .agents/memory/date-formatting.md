---
name: Date formatting rule
description: Why raw Date constructor on YYYY-MM-DD strings causes off-by-one and what to use instead
---

`new Date('2026-06-08')` is parsed as UTC midnight, which renders as the previous day in UTC-offset timezones.

Always use `fmtDate(d)` and `daysUntil(d)` from `artifacts/ielts-tracker/src/lib/utils/date.ts`.
These parse the YYYY-MM-DD string by splitting on `-` and using `new Date(y, m-1, day)` (local time).

**Why:** The app stores dates as plain YYYY-MM-DD strings. Direct `new Date(str)` interprets them as UTC, causing display bugs for users in non-UTC timezones.

**How to apply:** Any new component that displays or computes with a date field from the API must import from `@/lib/utils/date` rather than using native Date directly.
