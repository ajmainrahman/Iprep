---
name: FlyStudy architecture
description: How the dual-mode landing → Fly/Study routing works without a router
---

App has no React Router. Mode state (`'home' | 'fly' | 'study'`) lives in `MainApp` in `App.tsx`.

- `home` → renders `<LandingPage>` (full-screen dark Nordic hero)
- `fly` → renders `<FlyLayout>` which manages its own `FlyTab` state and renders `<HigherStudyPrep tab={tab} onTabChange={...} />`
- `study` → renders `<StudyLayout>` which manages its own `StudyTab` state

Fly mode sidebar uses `.fly-mode` CSS class to override `--sidebar-*` vars to indigo (#6366F1 family).
Study mode sidebar uses the default teal/navy CSS vars.

**Why:** User wanted a landing page as a gateway. No URLs needed, so no router overhead.

**How to apply:** When adding a new top-level section, add another mode to `AppMode` and a new Layout component following the same pattern as `FlyLayout`/`StudyLayout`.
