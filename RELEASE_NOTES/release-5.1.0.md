# Release 5.1.0 — 2026-07-09

|                              |                                              |
| ---------------------------- | -------------------------------------------- |
| **Build branch deployed**    | `release-5.1.0` (Jenkins deploy source)      |
| **Tag**                      | `v5.1.0` (immutable marker + GitHub Release) |
| **Baseline (previous prod)** | `v5.0.2`                                     |
| **Commits**                  | `2` (FRAC competency migration + spec fix)   |
| **Author**                   | Likhith Thammegowda                          |

## Summary

Content authors now search and select competencies against the **FRAC entity-search API** instead of the legacy competency endpoint, and competency selection has been unified into a **single autocomplete field** (search + dropdown combined) across course creation, course settings, and the competency popup. Competency lookups now honour the **course's own language** rather than the browser locale, so authors working in a non-English course see competencies in that language.

## ✨ Features

- **author / competency** — Migrated the competency lookup from `/entityCompetency/getAllEntity` to the **FRAC entity search** endpoint `/proxies/v8/entity/v1/search` across editor.service, edit-meta, course-settings, create-course, my-content and app-toc-home; response mapping updated from `result.response` to `result.entity` throughout (`68be5fe`).
- **author / competency** — Unified competency selection into a **single `mat-autocomplete` field** (search + dropdown combined) in course-settings, create-course and competency-popup, removing the separate search bar for a simpler, consistent picker (`68be5fe`).
- **author / competency** — Competency entities are now fetched using the **course content language** (`contentMeta.lang` / `content.lang` / `cardContent[0].lang`) instead of the browser locale (`68be5fe`).

## 🐛 Fixes

- **author / create-course** — Fixed a `storeData()` crash on type-and-clear by isolating `competencySearchCtrl` from the reactive form, so free-text keystrokes never write a string into `competencies_v1` (`68be5fe`).
- **author / create-course** — Restored the `createSelfAssessment()` trigger on competency selection, which had been dropped during the autocomplete conversion (`68be5fe`).
- **author / competency** — Fixed autocomplete option styling: code pills (`#EFF6FF` bg, `#BFDBFE` border) and `mdc-list-item` primary-text flex alignment across all three components (`68be5fe`).
- **author / tests** — Updated create-course spec mocks to return `result.entity`, matching the new API shape (`1ae45d7`).

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
- **Backend / API contract dependencies:** requires the **FRAC entity-search API** `/apis/proxies/v8/entity/v1/search` to be available on the gateway and returning results under `result.entity`. Confirm this endpoint is live in the target environment before deploying.
- **Breaking changes:** none for authors. Internal: the legacy `/entityCompetency/getAllEntity` call is no longer used by these screens.

## ✅ Pre-deploy checklist

- [ ] Build verified on a **fresh install** (`rm -rf node_modules && npm install --legacy-peer-deps && npm run build`)
- [ ] `npm run lint` clean
- [ ] `npm test -- --coverage` green
- [ ] Smoke-test: create/edit a course, search a competency in the autocomplete, select it, save — confirm it persists and the self-assessment trigger still fires
- [ ] Verify competency search returns results in a non-English course's language
- [ ] Confirm `/apis/proxies/v8/entity/v1/search` is live in the target environment
- [ ] Rollback ref confirmed: `v5.0.2` / branch `release-5.0.2`

## Release & rollback

**Deploy** — a human runs the manual Jenkins job (`Jenkinsfile-sun`) pointed at the **build branch** `release-5.1.0` (deploy is from a branch, not a tag). Each release gets its own new build branch + a `v<X.Y.Z>` tag; the previous `release-5.0.2` branch stays frozen.

**Rollback** — re-run the same manual Jenkins job against the previous release branch `release-5.0.2`.

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
