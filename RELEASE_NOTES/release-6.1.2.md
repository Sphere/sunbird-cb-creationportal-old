# Release 6.1.2 — 2026-11-20

|                              |                                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Build branch deployed**    | `release-6.1.2` (Jenkins deploy source)                                   |
| **Tag**                      | `v6.1.2` (immutable marker + GitHub Release)                              |
| **Baseline (previous prod)** | `v6.1.1`                                                                  |
| **Commits**                  | `1` (non-merge): the AI Studio package update, version bump and this note |
| **Author**                   | Likhith Thammegowda                                                       |

## Summary

This release updates AI Studio inside the portal (Content Creation, Assessment Creation, Reports) by moving `@aastrika/ai-elements` from 0.8.2 to 0.9.0. Creators get avatars and templates for their videos, a talking presenter, a confirmation step with a price before an AI change is applied to a finished video, and clearer handling of failed or stuck videos. The AI Studio tags, attributes and events are the same, so no portal code changes. Nothing else changes.

## ✨ Features

- **ai-studio** — **AI Studio `@aastrika/ai-elements` 0.9.0.** What creators see:
  - **Avatars:** create a presenter from a description, pictures or a video, pick one per person on the plan (or let **AI auto** choose), and save a person from a plan as an avatar. Avatars are private to their maker until an AI Studio admin shares them.
  - **Templates:** make a video style from up to five sample videos or from a description, then pick it as the video style. A template video follows the look of its references (cards, colours, framing, music, voice).
  - **Talking presenter** ("Avatar presenter") on slides, with the progress bar following each talking clip.
  - **Make changes:** an AI change to a finished video is described first, with its own price and the scenes it will remake, and is applied only on **Yes**. Big updates list the costliest scenes, each of which can be kept as it was.
  - **Scenes:** delete a scene (asked first) or add one after it, from the scene header.
  - **Failed or stuck videos** show as stopped, with the reason and **Try again** with its price, instead of an endless "being made".
  - **Cancel video** while it is being made.
  - **Dashboard:** a Templates and Avatars panel (share, edit, remove, restore), each video's cost by round, and the last change with its time in Reports.
  - **Follow my script** chip above the Creative brief.

## 🐛 Fixes

- None in the portal. Fixes inside AI Studio come with the package (above).

## 🏗️ Build / CI / Infra

- Dependency: `@aastrika/ai-elements` `0.8.2` → `0.9.0` (`package.json`). Same four elements (`aastrika-content-studio`, `aastrika-assessment`, `aastrika-reports`, `aastrika-fonts`) and an identical `aastrika-elements.d.ts`. The bundle grows from about 1.1 MB to 1.5 MB, and is still loaded only when an AI Studio screen opens, so other pages are unaffected.

## 📚 Docs / Chore

- Version bump to 6.1.2 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none in the portal.
- **Backend / API contract dependencies:** the new screens call new AI Studio service endpoints (`list-avatars`, `create-avatar`, `draw-avatar`, `list-templates`, `create-template`, `read-template`, `share-*`, `hide-*`, `restore-*`, `cancel-video`, `cost-breakdown`, `get-video/…/revision`). uiproxy already forwards every `aiStudio/studio/*` path, so **no uiproxy change** is needed. The **AI Studio service must be deployed at the version that matches 0.9.0**; on an older service, video creation as before keeps working, but avatar, template, cancel and cost-breakdown actions fail.
- **Breaking changes:** none for the portal.
- **Risk:** low for the portal (dependency only, AI Studio screens only). Medium for AI Studio if the service is older than the package.

## ✅ Pre-deploy checklist

- [x] Lint: no portal source changed, so no new lint errors
- [x] Unit tests: 457 suites, 8,848 tests pass; coverage threshold met
- [x] Production build passes (`dist/www/en`); `@aastrika/ai-elements` 0.9.0 installed fresh from the npm registry and present in the lazy AI Studio chunk
- [ ] AI Studio service deployed at the matching version
- [ ] Smoke test after deploy: AI Studio → Content Creation opens; the video style shows the template and avatar options; an existing video opens and plays; Assessment Creation and Reports open
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-6.1.1`

## Release & rollback

**Deploy** — this release ships as the **`release-6.1.2`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.1.2`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-6.1.1
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
