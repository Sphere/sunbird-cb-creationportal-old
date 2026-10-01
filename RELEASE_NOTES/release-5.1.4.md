# Release 5.1.4 — 2026-10-01

|                              |                                                     |
| ---------------------------- | --------------------------------------------------- |
| **Build branch deployed**    | `release-5.1.4` (Jenkins deploy source)             |
| **Tag**                      | `v5.1.4` (immutable marker + GitHub Release)        |
| **Baseline (previous prod)** | `v5.1.3`                                            |
| **Commits**                  | `4` (non-merge) — PR #209 (AI Studio library 0.7.1) |
| **Author**                   | princegupta1131                                     |

## Summary

This release fixes how AI Studio records who made a piece of content: it is now stored against the user's id, with their name beside it, instead of against a display name. It updates AI Studio to version 0.7.1 of the `@aastrika/ai-elements` package, which brings a voice picker you can listen to before choosing, a redesigned Content Studio and usage screen, and fixes to "make changes" on a video. It also stops the portal's styles from misaligning AI Studio, and tidies the header profile chip, the footer and the AI Studio entry in My Content.

## ✨ Features

- **ai-studio** — **AI Studio package 0.7.1.** Voices can be heard before they are chosen (a short sample in the video's language). Content Studio and the usage report get a cleaner layout with a stepper and summary. A voice chosen on a plan applies straight away, revising a plan keeps the edits made on the page, and the name typed for a video is the name shown in My videos and the dashboard (`14b83751`).
- **header** — The profile area is one chip, "Signed in as &lt;name&gt;", that opens the menu with **Logout**. Before, only the small avatar icon could be clicked (`d334acfe`).
- **footer** — The same links in a more compact layout: brand and links on one row, copyright on a thin strip below (`d334acfe`).
- **my-content** — The AI Studio entry is highlighted while one of its screens is open, and the breadcrumb shows the open feature's icon (`d334acfe`).

## 🐛 Fixes

- **ai-studio** — **Content is recorded against the user id, not a display name.** Rows used to carry a name such as "Prince Kumar Gupta" in the creator column, which merged people who share a name in the usage report and left "Your assessments" / "Your videos" empty, since history is filtered by user id. The portal now sends the user id as the creator and the name separately, and the name is found in every login mode, including token-only profiles (`334c77ca`). The package update makes sure that name actually reaches the service; in 0.6.1 it was dropped inside the elements (`14b83751`).
- **ai-studio** — **AI Studio no longer misaligns inside the portal.** The portal reached into the elements with `::ng-deep` rules on their class names, which silently stopped matching when the elements were redesigned. It now customises them only through their colour tokens; the elements set their own font, line height and width (`19bef58c`).

## 🏗️ Build / CI / Infra

- Dependency: **`@aastrika/ai-elements` 0.6.1 → 0.7.1** (`14b83751`). Same tags, attributes and events; no portal code change needed for it. The package is larger (it now bundles its own font) but is still loaded only when an AI Studio screen opens, so other pages are unaffected.

## 📚 Docs / Chore

- None.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none.
- **Backend / API contract dependencies:**
  - **AI service** at `master` `edb6a0a` or later — needed by 0.7.1's voice samples and "make changes" fixes. Already deployed.
  - **UI proxy `v5.2.16`** — the proxy sets the creator for every AI Studio call, so **content is attributed by user id only once v5.2.16 is live**. Until then the proxy still sends the display name and wins over the portal. Its Jenkins deploy failed on a Kubernetes credential (`client.authentication.k8s.io/v1alpha1` no longer accepted) and needs that fixed first. This release does not depend on it to work; attribution is simply corrected when it lands.
- **Breaking changes:** none. Content created before this release keeps the creator it was saved with; rows saved under a display name need a one-off data backfill to join the user's history.
- **Visible changes to sign off:** the header profile chip, the footer layout, and the My Content AI Studio entry look different.

## ✅ Pre-deploy checklist

- [ ] Build verified on a **fresh install** (`rm -rf node_modules && npm install --legacy-peer-deps && npm run build`) — the dependency version changed.
- [ ] `npm run lint` clean
- [ ] Smoke-tested on preprod: login, the header chip opens the menu and **Logout** works, the footer links open, author and publish a course
- [ ] AI Studio: create an assessment and a video plan; upload a PDF in Create video; play a voice sample; the AI Studio entry highlights in My Content
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-5.1.3`

Verified before release on the merged code: production build passes; the full unit suite passes (434 suites, 8,262 tests); `@aastrika/ai-elements` 0.7.1 is installed from the npm registry and present in the AI Studio bundle, which stays lazy-loaded.

## Release & rollback

**Deploy** — this release ships as the **`release-5.1.4`** branch. A human runs the manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-5.1.4`. Pushing the branch only provides the deploy source; it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-5.1.3
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
