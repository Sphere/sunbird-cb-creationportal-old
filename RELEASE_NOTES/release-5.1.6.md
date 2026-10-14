# Release 5.1.6 — 2026-10-15

|                              |                                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Build branch deployed**    | `release-5.1.6` (Jenkins deploy source)                                   |
| **Tag**                      | `v5.1.6` (immutable marker + GitHub Release)                              |
| **Baseline (previous prod)** | `v5.1.5`                                                                  |
| **Commits**                  | `1` (non-merge) — AI Studio library `@aastrika/ai-elements` 0.7.1 → 0.8.1 |
| **Author**                   | Prince Gupta                                                              |

## Summary

This release updates AI Studio inside the portal (Content Creation, Assessment Creation, Reports) by moving `@aastrika/ai-elements` from 0.7.1 to 0.8.1. Creators get a guided setup, large PDFs that upload in full, edit-mode frames and roleplay pictures that show, and a content watermark they can turn on or off. Nothing else in the portal changes: the AI Studio tags, attributes and events are the same, so no portal code is touched.

## ✨ Features

- **ai-studio** — **Guided setup, one card at a time.** Training material, Video style and Video settings each fold to a done line with **Change** once finished, and say where they are (**Step n of 3**). **Generate scene plan** waits until the style is confirmed with **Continue**. Settings are icon tiles with one look and AA text contrast.
- **ai-studio** — **Content watermark.** On by default; every video (slides, watercolor, roleplay, edited, translated) carries the faded Aastrika AI Studio mark bottom-right. Off makes the video without it. The plan and the finished video show **Watermark on** or **No watermark**.
- **ai-studio** — **Start another video while one is being made.** **New video** shows during planning and rendering; the first keeps going and lands in My videos.
- **ai-studio** — **Drafts and planning (0.8.0).** My videos has **Videos | Drafts**; a plan not yet made into a video is kept and reopens with its whole setup. Planning is followed by polling, so a 60 s gateway timeout can no longer cut it off.
- **ai-studio** — **Plan review and slide themes (0.8.0).** "Worth a look" lists AI-review suggestions and checks, each with **Fix with AI**. Slides videos can describe their theme in words (Calm & clean, Warm & caring, Bold & dark, Custom theme…).

## 🐛 Fixes

- **ai-studio** — **Large PDFs upload in full.** A file over 5 MB is sent in pieces; through the portal's proxy the pieces' labels were lost and the service read only the first 5 MB ("Invalid PDF structure"). Pieces now go to a path the proxy forwards in full, and if anything still drops them the file is sent again whole.
- **ai-studio** — **Edit-mode frames and roleplay pictures show in the portal.** They are now fetched under `/v1/studio/get-video/…`, which the existing `aiStudioGetVideo` gateway route covers, with the session header.
- **ai-studio** — **The screen keeps following a video while the server is briefly busy (0.8.0).** A failed status check retries instead of freezing the progress.

## 🏗️ Build / CI / Infra

- Dependency: `@aastrika/ai-elements` `0.7.1` → `0.8.1` (`package.json`). No other dependency, build or deploy-layout change.

## 📚 Docs / Chore

- Version bump to 5.1.6 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none.
- **Backend / API contract dependencies:** AI Studio service `eee3368` (deployed 2026-10-15) serves the `get-video/vseg|uimg|jobs` paths. Large files go in pieces once the service has `b444a1a` (accepts pieces as the gateway delivers them, at `/upload/-piece`); until then they are sent whole, which works — verified with a 6.7 MB file. Against an older service, frames show their placeholder — nothing breaks.
- **Gateway / proxy:** no Kong or `sunbird-cb-uiproxy` change. The new paths start with existing routes (`aiStudioUpload`, `aiStudioGetVideo`).
- **Watermark rendering:** the AI Studio Lambda site was redeployed on 2026-10-15 with the watermark.
- **Breaking changes:** none. Tags, attributes and events of `@aastrika/ai-elements` are unchanged.

## ✅ Pre-deploy checklist

- [x] Build verified on the release code (`npm run build`)
- [x] AI Studio end-to-end on 0.8.1 against the deployed service (2026-10-15): 6.7 MB upload read in full; Generate waits for Continue; slides with watermark on (mark shown), slides with watermark off (no mark), watercolor (no mark), animated roleplay with 2 characters (mark shown); posters, playback and older videos in My videos
- [ ] Smoke-tested after deploy: login, open AI Studio → Content Creation, upload a document, plan a short video
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-5.1.5`

## Release & rollback

**Deploy** — this release ships as the **`release-5.1.6`** branch. A human runs the manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-5.1.6`. Pushing the branch only provides the deploy source; it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-5.1.5
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
