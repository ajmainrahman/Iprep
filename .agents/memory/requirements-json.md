---
name: Dynamic requirements design
description: How per-application checklist items are stored and why old boolean columns exist
---

Applications store requirements as `requirementsJson TEXT` — a JSON array of `{label: string, done: boolean}`.

The old boolean columns (`req_sop`, `req_lor1`, etc.) still exist in the DB for backward compat but are no longer used in the UI.

`safeParseReqs()` in `HigherStudyPrep.tsx` safely parses this field, returning `[]` on null or malformed JSON.

**Why:** User wanted add/remove/custom items per application rather than a fixed checklist. JSON field avoids a separate join table.

**How to apply:** When toggling/adding/removing a requirement, always fetch the current `requirementsJson`, mutate in memory, and send the full updated JSON via PUT. Never patch individual array elements via SQL.
