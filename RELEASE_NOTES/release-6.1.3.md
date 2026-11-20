# Release 6.1.3 — 2026-11-20

|                              |                                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Build branch deployed**    | `release-6.1.3` (Jenkins deploy source)                                   |
| **Tag**                      | `v6.1.3` (immutable marker + GitHub Release)                              |
| **Baseline (previous prod)** | `v6.1.2`                                                                  |
| **Commits**                  | `1` (non-merge): the AI Studio package update, version bump and this note |
| **Author**                   | Likhith Thammegowda                                                       |

## Summary

This release moves AI Studio's `@aastrika/ai-elements` from 0.9.0 to 0.9.1. Assessment Creation now offers the full Bloom's taxonomy as six levels, and two layout problems on the assessment screen are fixed. The AI Studio tags, attributes and events are the same, so no portal code changes. Nothing else changes.

## ✨ Features

- **ai-studio** — **Assessment Creation: the full Bloom's taxonomy.** Six level cards, three to a row: **Mixed** (every level in balance; the default), **Remember & understand**, **Apply**, **Analyse**, **Evaluate** and **Create**. They replace the four cards Mixed, Recall, Understanding and Application-oriented. Question cards name the new levels; questions in older assessments keep their old names.

## 🐛 Fixes

- **ai-studio** — **The assessment screen no longer scrolls sideways.** The soft light behind its top could widen the host page.
- **ai-studio** — **Between 861 and 1039 px wide, the pinned summary is solid,** so the form's words no longer show through it.

## 🏗️ Build / CI / Infra

- Dependency: `@aastrika/ai-elements` `0.9.0` → `0.9.1` (`package.json`). Same four elements, an identical `aastrika-elements.d.ts` and the same service endpoints as 0.9.0. The bundle size is unchanged (about 1.5 MB, in the lazy AI Studio chunk).

## 📚 Docs / Chore

- Version bump to 6.1.3 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none in the portal.
- **Backend / API contract dependencies:** **deploy the AI Studio service with the new Bloom's levels first.** An older service does not know the new levels and writes them as a mixed set of remember, understand and apply questions. The 6.1.2 note still applies: the service must also have the 0.9.0 endpoints (avatars, templates, cancel video, cost breakdown). No uiproxy change.
- **Breaking changes:** none for the portal.
- **Risk:** low. Dependency only, AI Studio screens only.

## ✅ Pre-deploy checklist

- [x] Lint: no portal source changed, so no new lint errors
- [x] Unit tests: 457 suites, 8,848 tests pass; coverage threshold met
- [x] Production build passes (`dist/www/en`); `@aastrika/ai-elements` 0.9.1 installed fresh from the npm registry and present in the lazy AI Studio chunk
- [ ] AI Studio service deployed with the new Bloom's levels (and the 0.9.0 endpoints)
- [ ] Smoke test after deploy: AI Studio → Assessment Creation shows six Bloom's level cards and does not scroll sideways; Content Creation and Reports open
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-6.1.2`

## Release & rollback

**Deploy** — this release ships as the **`release-6.1.3`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.1.3`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-6.1.2
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
