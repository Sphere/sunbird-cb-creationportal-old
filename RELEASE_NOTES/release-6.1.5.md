# Release 6.1.5 — 2026-11-26

|                              |                                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Build branch deployed**    | `release-6.1.5` (Jenkins deploy source)                                   |
| **Tag**                      | `v6.1.5` (immutable marker + GitHub Release)                              |
| **Baseline (previous prod)** | `v6.1.4`                                                                  |
| **Commits**                  | `1` (non-merge): the AI Studio package update, version bump and this note |
| **Author**                   | Likhith Thammegowda                                                       |

## Summary

This release moves AI Studio's `@aastrika/ai-elements` from 0.9.2 to 0.10.0. Creators can pick one character look for a whole video, apply the final check's fixes in one go, and see the plan's price follow their scene changes. The AI Studio tags, attributes and events are the same, so no portal code changes. Nothing else changes.

## ✨ Features

- **ai-studio** — **Character look.** An Illustrated scenes or roleplay plan has a Character look box: AI auto (the default), Realistic, 3D animated, 2D illustrated or Painted. Every person and picture in the video is drawn in that look. The list comes from the service, and the box is hidden when the service has looks turned off.
- **ai-studio** — **Ready QC fixes.** After the final check, its fixes are listed ready to apply in one go through Make changes, with the price shown first. Findings about bodies (hands, fingers) start unticked and are marked "please check".
- **ai-studio** — **The plan page's price follows the plan.** Deleting, changing or adding a scene before the video is made updates the price, every price line and the Create button.
- **ai-studio** — **Clearer plan page.** A long visual description is shortened, with "… Show more". "Watercolor illustrations" is now shown as **Illustrated scenes**.

## 🐛 Fixes

- **ai-studio** — The slide table editor is a real grid, and its fields are styled inside the portal page (they showed unstyled).

## 🏗️ Build / CI / Infra

- Dependency: `@aastrika/ai-elements` `0.9.2` → `0.10.0` (`package.json`). Same four elements, an identical `aastrika-elements.d.ts` and the same peer dependencies. The bundle grows by about 20 KB (about 1.5 MB, in the lazy AI Studio chunk).

## 📚 Docs / Chore

- Version bump to 6.1.5 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none in the portal.
- **Backend / API contract dependencies:** **deploy the AI Studio service with character looks, ready fixes and draft prices first.** With an older service the page works as in 0.9.2: no Character look box, no ready fixes and no live price. uiproxy already forwards every `aiStudio/studio/*` path, so **no uiproxy change** is needed.
- **Breaking changes:** none for the portal.
- **Risk:** low. Dependency only, AI Studio screens only.

## ✅ Pre-deploy checklist

- [x] Lint: no portal source changed, so no new lint errors
- [x] Unit tests: 457 suites, 8,848 tests pass; coverage threshold met
- [x] Production build passes (`dist/www/en`); `@aastrika/ai-elements` 0.10.0 installed fresh from the npm registry and present in the lazy AI Studio chunk
- [ ] AI Studio service deployed with character looks, ready fixes and draft prices
- [ ] Smoke test after deploy: AI Studio → Content Creation shows the Character look box on an Illustrated scenes plan; deleting a scene updates the price; Assessment Creation and Reports open
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-6.1.4`

## Release & rollback

**Deploy** — this release ships as the **`release-6.1.5`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.1.5`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-6.1.4
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
