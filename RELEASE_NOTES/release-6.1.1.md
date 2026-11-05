# Release 6.1.1 — 2026-11-03

|                              |                                              |
| ---------------------------- | -------------------------------------------- |
| **Build branch deployed**    | `release-6.1.1` (Jenkins deploy source)      |
| **Tag**                      | `v6.1.1` (immutable marker + GitHub Release) |
| **Baseline (previous prod)** | `v6.1.0`                                     |
| **Commits**                  | `3` (non-merge): two fixes, plus this note   |
| **Author**                   | Likhith Thammegowda                          |

## Summary

Hotfix for My Courses. Every published course showed "Updated Nov 3, 2026", which read as if they had all been published that day. A background update had touched almost every live course early on 3 Nov, and the card always showed the last-updated date. Published and retired courses now show the date they were actually published, and the Published list is ordered by that date. Draft and review lists are unchanged. Nothing else changes.

## ✨ Features

- None.

## 🐛 Fixes

- **my-content** — **Published course cards show their publish date.** The card looked for `publishedOn`, which the search index doesn't have, so it always fell back to "Updated {lastUpdatedOn}". A Live, Retired or Unpublished course now shows "Published {lastPublishedOn}". Any other course still shows "Updated {lastUpdatedOn}", and so does a published course with no publish date recorded (`ab679c76`).
- **my-content** — **The Published list is ordered by publish date.** The lists were sorted by `lastUpdatedOn`, which also changes when a background job touches a live course, so the 3 Nov update reshuffled the Published list. Lists of only live or retired courses (Published, Unpublished, the self-assessment Published and Retired lists, All Courses, the certificate lists and the external-review lists) now sort by `lastPublishedOn`, newest first. Draft, review and publish-queue lists keep `lastUpdatedOn` (`83138b75`).

## 🏗️ Build / CI / Infra

- None. No dependency, build or deploy-layout change.

## 📚 Docs / Chore

- Version bump to 6.1.1 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none.
- **Backend / API contract dependencies:** none. `lastPublishedOn` is already in the search index for every published course; the search accepts it as a sort key (checked on the live site).
- **Breaking changes:** none.
- **Risk:** low. Two display and ordering changes in My Courses, each covered by tests.
- **Not in this release:** course publishing on the live site currently fails with `mapper_parsing_exception … [creatorDetails]`. That is a server config fix (`string.only.fields` in `knowlg-publish-config`), being handled by DevOps, not a portal change.

## ✅ Pre-deploy checklist

- [x] `npm run lint` clean (0 errors)
- [x] Unit tests: 457 suites, 8,847 tests pass; coverage threshold met
- [x] Production build passes (`dist/www/en`)
- [ ] Smoke test after deploy: My Courses → Published shows "Published {date}" with the real publish dates, newest first; a draft course card still shows "Updated {date}"
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-6.1.0`

## Release & rollback

**Deploy** — this release ships as the **`release-6.1.1`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.1.1`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-6.1.0
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
