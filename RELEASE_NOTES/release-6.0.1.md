# Release 6.0.1 — 2026-10-27

|                              |                                              |
| ---------------------------- | -------------------------------------------- |
| **Build branch deployed**    | `release-6.0.1` (Jenkins deploy source)      |
| **Tag**                      | `v6.0.1` (immutable marker + GitHub Release) |
| **Baseline (previous prod)** | `v6.0.0`                                     |
| **Commits**                  | `2` (non-merge) — one hotfix, plus this note |
| **Author**                   | Likhith Thammegowda                          |

## Summary

Hotfix for video resources. Since the move to Sunbird Spark, opening a video in Course Builder failed with "Unexpected end of JSON input" once the video had been saved on the new platform. The upload panel did not set up properly, and the video preview could fail to load. Videos now open normally, whether they were last saved before or after go-live, and in-video questions are kept. Nothing else changes.

## ✨ Features

- None.

## 🐛 Fixes

- **video** — **Video resources open again after being saved on Spark.** Spark returns `videoQuestions` as the list the portal saved, where the old platform returned text. The portal decoded it as text, so an empty list threw "Unexpected end of JSON input". In Course Builder this stopped the video setup partway, leaving the upload panel without its icon, accepted file types or enabled state. In the video player it stopped before the video address and poster were set. Both now accept either form; old text values read exactly as before (`f2eb774e`).

## 🏗️ Build / CI / Infra

- None. No dependency, build or deploy-layout change.

## 📚 Docs / Chore

- Version bump to 6.0.1 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none.
- **Backend / API contract dependencies:** none. The portal still saves `videoQuestions` as a list, as 6.0.0 did; only reading changed.
- **Breaking changes:** none.
- **Risk:** low. Two read sites changed, each covered by tests for the list form, the text form and empty or broken values.

## ✅ Pre-deploy checklist

- [x] `npm run lint` clean (0 errors)
- [x] Unit tests: 447 suites, 8,685 tests pass; coverage threshold met
- [x] Production build passes (`dist/www/en`)
- [ ] Smoke test after deploy: open a video resource saved since go-live in Course Builder; the upload panel shows and the console has no "Unexpected end of JSON input"; preview plays it
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-6.0.0`

## Release & rollback

**Deploy** — this release ships as the **`release-6.0.1`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.0.1`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-6.0.0
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
