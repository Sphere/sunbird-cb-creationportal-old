# Release 6.0.0 — 2026-10-22

|                              |                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| **Build branch deployed**    | `release-6.0.0` (Jenkins deploy source)                                               |
| **Tag**                      | `v6.0.0` (immutable marker + GitHub Release)                                          |
| **Baseline (previous prod)** | `v5.1.6` (cut from `sunbird-spark/upgrade`); last release from `main` was `v5.1.5`    |
| **Commits**                  | `38` (non-merge) since `v5.1.5` on `main`; `1` since `v5.1.6` (plus this version bump) |
| **Author**                   | Likhith Thammegowda                                                                   |

## Summary

6.0.0 brings the **Sunbird Spark platform** work onto `main`. On 9 October the portal moved to the new Spark stack (new content, user and search services). Since then prod has been released from the `sunbird-spark/upgrade` branch (5.1.6). This release merges that branch into `main`, so the trunk now matches what prod runs, and future releases come from `main` again.

For creators, nothing changes compared with what prod runs today. The code is the 5.1.6 build plus AI Studio `@aastrika/ai-elements` 0.8.2, which the `release-5.1.6` build branch already carries. The version is a major one because this code works only on the Spark platform: it reads the Spark profile and content shapes, and must not be deployed against the old platform.

## ✨ Features (since 5.1.5 on `main`)

- **platform** — **Runs on Sunbird Spark.** Reads roles and the user id from the Spark profile shape (`6dd59c33`), accepts `competencies_v1` as a list (`6f89d233`), sends CBP contact metadata as JSON strings (`7bbee484`), and keeps the creator moving when discussion-forum creation fails (`122e264b`).
- **certificate** — **Design certificates in the portal**, from ready-made designs on S3 or your own upload, with a field placer and preview (`2c1090e2`). Follow-ups: preview for registry templates (`1e74a862`), progress and every outcome reported when attaching (`499b217b`), dialog preview, disable and load fixes (`111c6cd2`), no clipping on smaller screens (`ce9a1678`).
- **downtime** — **Planned downtime from the form service**: full maintenance page or partial banner, per portal host, everything set from the form, with a tester bypass link (`a5f87529`, `5f27ba92`, `b19e92b9`, `a6fff05e`). Already shipped to prod in 5.1.5.
- **ai-studio** — **AI Studio `@aastrika/ai-elements` 0.8.2**: guided setup, content watermark, drafts and planning, plan review and slide themes, large PDF uploads in full (0.8.1, shipped in 5.1.6), plus 0.8.2 (`61a606f9`).
- **loader** — The application loader shows over dialogs too (`e676c35a`).

## 🐛 Fixes (since 5.1.5 on `main`)

- **publish** — A resource left in **Failed** can be published again instead of asking for a retire (`8f56db2f`).
- **course-settings** — One Aastrika publisher id on every host and environment (`5f533ddf`, `95fc98f0`). The poster image is updated along with the course image (`5ea44c8b`, `bebf718b`).
- **editor** — `generateUrl` no longer returns `undefined` for off-bucket URLs (`51e83cba`). The uploaded thumbnail is shown instead of the 56 px publish thumbnail (`14d3e59f`).
- **profile** — The avatar shows, so the logout menu can be opened, and it lines up with the label (`7c3cf1a7`, `fc3fb7b6`).
- **zip-upload** — Readable guideline dialogs, a shared dialog body for both screens, and no body scrolling over the title (`cb3648c0`, `d1598a29`, `dc1ab8cb`).
- **shared** — The IPR dialog's Agree and close buttons are visible (`e49e9f34`).

## 🏗️ Build / CI / Infra

- **The Docker build stage uses Node 22**, so `video.js` 8.24.2 (pulled in by `videojs-contrib-quality-levels`) installs (`80a2ee63`). The runtime stage stays on `node:20-slim`. The intermediate pins were reverted (`21bb9bb2`, `7d73e5e0`, `0fb898cb`).
- **CI:** the build workflow uses yarn and SonarQube scan action v4, pointed at the self-hosted project key (`8a541807`, `2629a455`).
- **Dependency:** `@aastrika/ai-elements` `0.7.1` → `0.8.2` (`c2c8a0a9`, `61a606f9`).

## 📚 Docs / Chore

- The 5.1.6 release note (`c2c8a0a9`, `dfc42786`); a test expecting the default publisher as a list (`0caeaa58`).
- Version bump to 6.0.0 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged (5.2.1).
  - [x] Build toolchain — **the builder image is `node:22`** (`Dockerfile`). Local builds need Node 22 too: `video.js` 8.24.2 refuses Node 20 at install.
- **Platform:** **Sunbird Spark only.** Do not deploy to an environment still on the old platform; it reads the Spark profile and content shapes.
- **Config / env / secret changes:** none in the portal. Ready-made certificate designs and the downtime switch are configured outside the build: `aastar-assets/data/cbp-data.json` and the `app_update_info` form.
- **Same code as prod today:** prod runs `release-5.1.6` (5.1.6 + `ai-elements` 0.8.2). Deploying 6.0.0 changes only the version shown.
- **Breaking changes:** none for users. It is a major version for the platform requirement only.

## ✅ Pre-deploy checklist

- [x] Fresh install with Node 22 + yarn (as the Docker build does)
- [x] `npm run lint` clean
- [x] Unit tests with coverage pass
- [x] Production build passes
- [ ] Smoke test after deploy: login, My Content, open a course in the editor, AI Studio opens, certificate dialog lists the ready-made designs
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-5.1.6`

## Release & rollback

**Deploy** — this release ships as the **`release-6.0.0`** branch. A human runs the manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.0.0`. Pushing the branch only provides the deploy source; it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-5.1.6
```

(Jenkins → Docker → Helm pipeline.)
