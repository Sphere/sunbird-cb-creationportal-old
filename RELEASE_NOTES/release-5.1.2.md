# Release 5.1.2 — 2026-07-22

|                              |                                              |
| ---------------------------- | -------------------------------------------- |
| **Build branch deployed**    | `release-5.1.2` (Jenkins deploy source)      |
| **Tag**                      | `v5.1.2` (immutable marker + GitHub Release) |
| **Baseline (previous prod)** | `v5.1.1`                                     |
| **Commits**                  | `1` (Course Details → Course Builder fix)    |
| **Author**                   | Likhith Thammegowda                          |

## Summary

Fixes a blank-screen bug in the course authoring stepper. On the **Course Details** step, clicking **Next** when there were no unsaved changes left the page blank — the **Course Builder** step only appeared after the author moved the mouse or hovered the header. The view now renders immediately on **Next**.

## ✨ Features

- _None — patch release (bug fix)._

## 🐛 Fixes

- **author / course collection** — **Course Builder now renders immediately after clicking Next on Course Details.** When there were no unsaved edits (the "Content is up-to-date" path), the Next click swapped the view from the details form to the Course Builder step during the same change-detection pass but never re-triggered change detection, so the page stayed blank until the next browser event (e.g. a mouse move) repainted it. The up-to-date branch now calls `cdr.detectChanges()`, matching the successful-save branch. Adds unit tests that instantiate the component with mocked collaborators to pin the view swap + change-detection behaviour (`7fd3058`).

## 🏗️ Build / CI / Infra

- _None._

## 📚 Docs / Chore

- _None._

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none.
- **Backend / API contract dependencies:** none changed.
- **Breaking changes:** none. Change is scoped to the course-collection stepper's change-detection timing; no behaviour, data, or stored format changes.

## ✅ Pre-deploy checklist

- [ ] Build verified on a **fresh install** (`rm -rf node_modules && npm install --legacy-peer-deps && npm run build`)
- [ ] `npm run lint` clean
- [ ] `npm test -- --coverage` green
- [ ] Smoke-test: open a course, on **Course Details** click **Next** without editing anything — the **Course Builder** step appears immediately (no blank screen, no need to move the mouse)
- [ ] Rollback ref confirmed: `v5.1.1` / branch `release-5.1.1`

## Release & rollback

**Deploy** — a human runs the manual Jenkins job (`Jenkinsfile-sun`) pointed at the **build branch** `release-5.1.2` (deploy is from a branch, not a tag). Each release gets its own new build branch + a `v<X.Y.Z>` tag; the previous `release-5.1.1` branch stays frozen.

**Rollback** — re-run the same manual Jenkins job against the previous release branch `release-5.1.1`.

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
