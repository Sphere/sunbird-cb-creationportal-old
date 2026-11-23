# Release 6.1.4 — 2026-11-23

|                              |                                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Build branch deployed**    | `release-6.1.4` (Jenkins deploy source)                                   |
| **Tag**                      | `v6.1.4` (immutable marker + GitHub Release)                              |
| **Baseline (previous prod)** | `v6.1.3`                                                                  |
| **Commits**                  | `1` (non-merge): the AI Studio package update, version bump and this note |
| **Author**                   | Likhith Thammegowda                                                       |

## Summary

This release moves AI Studio's `@aastrika/ai-elements` from 0.9.1 to 0.9.2. Cancelling a video and the cost-by-round view now work through the platform gateway, and a long plan or change is no longer abandoned after 10 minutes while it is still being made. The AI Studio tags, attributes and events are the same, so no portal code changes. Nothing else changes.

## ✨ Features

- None in the portal.

## 🐛 Fixes

- **ai-studio** — **Cancel video and Cost by round work behind the gateway.** They now call `generate-video/cancel/:id` and `get-report/cost-breakdown/:id`, paths the gateway already routes. Their earlier paths were refused there (404).
- **ai-studio** — **A long plan or change is waited for while it is still being made.** The page used to give up 10 minutes after the start ("This is taking much longer than it should") even while the service was still working. It now waits as long as the plan or change shows it is alive, and stops only after 10 minutes with no sign of progress. A long upload's plan (14 minutes) now reaches the page.

## 🏗️ Build / CI / Infra

- Dependency: `@aastrika/ai-elements` `0.9.1` → `0.9.2` (`package.json`). Same four elements and an identical `aastrika-elements.d.ts`. The bundle size is unchanged (about 1.5 MB, in the lazy AI Studio chunk).

## 📚 Docs / Chore

- Version bump to 6.1.4 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none in the portal.
- **Backend / API contract dependencies:** **deploy the AI Studio service that answers the new paths first.** An older service does not know `generate-video/cancel/:id` or `get-report/cost-breakdown/:id`, so Cancel and Cost by round would fail. The new service still answers the old paths. uiproxy already forwards every `aiStudio/studio/*` path, so **no uiproxy change** is needed. The 6.1.2 and 6.1.3 service dependencies still apply.
- **Breaking changes:** none for the portal.
- **Risk:** low. Dependency only, AI Studio screens only.

## ✅ Pre-deploy checklist

- [x] Lint: no portal source changed, so no new lint errors
- [x] Unit tests: 457 suites, 8,848 tests pass; coverage threshold met
- [x] Production build passes (`dist/www/en`); `@aastrika/ai-elements` 0.9.2 installed fresh from the npm registry and present in the lazy AI Studio chunk
- [ ] AI Studio service deployed with the new cancel and cost-breakdown paths
- [ ] Smoke test after deploy: AI Studio → Content Creation opens; cancelling a video that is being made works; Reports shows a video's cost by round; Assessment Creation opens
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-6.1.3`

## Release & rollback

**Deploy** — this release ships as the **`release-6.1.4`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.1.4`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-6.1.3
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
