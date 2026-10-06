# Release 5.1.5 — 2026-10-06

|                              |                                                  |
| ---------------------------- | ------------------------------------------------ |
| **Build branch deployed**    | `release-5.1.5` (Jenkins deploy source)          |
| **Tag**                      | `v5.1.5` (immutable marker + GitHub Release)     |
| **Baseline (previous prod)** | `v5.1.4`                                         |
| **Commits**                  | `4` (non-merge) — planned downtime, nothing else |
| **Author**                   | Likhith Thammegowda                              |

## Summary

This release lets us put the creation portal into planned maintenance without a deploy. A switch in the form service either shows a banner while the portal keeps working (partial downtime), or replaces the whole portal with a maintenance page so nobody can create or edit content (full downtime) — which is what the content freeze for the upcoming platform upgrade needs. Testers can still get in with a bypass link, and the portal comes back by itself when the switch is turned off. With the switch off, the portal behaves exactly as in 5.1.4.

## ✨ Features

- **downtime** — **Full and partial planned downtime, switched from the form service.** The portal reads `DOWN_TIME_INFO.WEB` from the `app_update_info` form before signing anyone in. Full downtime shows a maintenance page instead of starting a Keycloak login (which may itself be down) and blocks every route; partial downtime shows a banner. Open tabs re-check the switch on an interval, so turning it on or off needs no reload. Testers bypass it with `?downtimeBypass=<code>`, or by org (`bypassOrgs`) (`e7827e32`).
- **downtime** — **Each portal host has its own switch.** The section is chosen by host first (`cbp-sphere` on prod, `cbp-uat` on UAT), then `cbp`, then `default`, so environments sharing a form service can be switched separately (`5bbc3db9`).
- **downtime** — **Everything on the page and banner is set from the form.** Title, message, note, button label, bypass notice, logo (an https URL, e.g. an S3 svg/png), its size and alt text, whether the banner can be closed, colours and banner position. The banner no longer covers the header — the nav bar moves down below it. The page uses the portal's Roboto font and design-system sizes (`1ed49465`).
- **downtime** — **Full and partial side by side.** A section can hold a `full` and a `partial` block, each switched on separately; whichever is on applies, and full wins when both are. The single `isEnabled` + `type` shape still works (`466644c4`).

## 🐛 Fixes

- None.

## 🏗️ Build / CI / Infra

- None. No dependency, build or deploy-layout change.

## 📚 Docs / Chore

- Version bump to 5.1.5 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none to deploy. Downtime is configured afterwards in the `app_update_info` form (`DOWN_TIME_INFO.WEB`).
- **Backend / API contract dependencies:** the public form read `POST /apis/v1/form/read` — already served on prod without a session (verified 2026-10-06, HTTP 200).
- **Safe by default:** with no CBP section, or every section switched off, there is no downtime. If the form read fails, the portal carries on normally — a form-service outage can never lock users out.
- **⚠ Shared `default` section:** prod's form currently has `ekshamata`, `sphere`, `aastrika-stage` and `default` (all off). CBP falls back to `default` when it has no section of its own, so **switching `default` on also takes CBP down.** To control CBP on its own, add a `cbp-sphere` section; once it exists, `default` no longer affects CBP.
- **Edit the form by adding a section,** never by replacing the whole `DOWN_TIME_INFO` object — other apps' sections live in it.
- **Breaking changes:** none.

## ✅ Pre-deploy checklist

- [x] Build verified on a **fresh install** (`npm install --legacy-peer-deps && npm run build`)
- [x] `npm run lint` clean (0 errors)
- [ ] Smoke-tested after deploy: login, author a course, publish — with downtime off
- [ ] Downtime check on prod with a `cbp-sphere` section: partial banner, then full page, then `?downtimeBypass=<code>`, then switched off (the page reloads by itself)
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-5.1.4`

Verified before release on the release code: production build passes on a fresh install; the full unit suite passes (438 suites, 8,335 tests).

## Release & rollback

**Deploy** — this release ships as the **`release-5.1.5`** branch. A human runs the manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-5.1.5`. Pushing the branch only provides the deploy source; it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-5.1.4
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
