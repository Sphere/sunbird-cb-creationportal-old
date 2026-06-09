<!--
  PR template derived from CLAUDE.md §6 (Design & Development Constitution).
  Keep this PR small and focused. Check every box or explain why it doesn't apply.
-->

## What & why

<!-- What does this change do, and why is it needed? Link the ticket/issue. -->

## Type of change

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor (no behavior change)
- [ ] Design / UI
- [ ] Build / tooling / deploy

## How to test

<!-- Steps for a reviewer to verify locally. Include the route/feature touched. -->

---

## Conventions checklist (CLAUDE.md)

**Structure & architecture**
- [ ] Code is in the correct tier (`src/app` / `@ws/app` / `@ws/author` / `@ws/viewer` / `@ws-widget/*`); no cross-tier mixing
- [ ] Used path aliases (`@ws/*`, `@ws-widget/*`) — no relative paths across library boundaries
- [ ] New components/declarations set `standalone: false`; selector uses the `ws` / `ws-widget-` / `ws-app-` prefix
- [ ] Followed the relevant skill in `.claude/skills/` (widget / feature module / api service / form)

**Functionality preservation (Enhance, Never Remove)**
- [ ] No fields, controls, validations, permissions, or workflow steps removed
- [ ] No API contracts changed without approval
- [ ] Role/feature visibility (guards, `requiredFeatures`/`requiredRoles`) preserved

**Design system & UI**
- [ ] Reused existing components/tokens; Roboto everywhere; input styling matches the standard (`.module-input`, native-over-Material rule)
- [ ] 8px spacing system; one dominant primary action per screen
- [ ] No `!important` fighting a global utility class
- [ ] Loading / Empty / Error / Success states considered
- [ ] Accessible (WCAG AA, keyboard nav, visible focus) and responsive

**Quality gates**
- [ ] `npm run lint` passes
- [ ] Code is Prettier-formatted (pre-commit hook ran)
- [ ] `npm test` passes (or N/A)
- [ ] No regressions; production-ready

---

🤖 If anything here was skipped, say why above.
