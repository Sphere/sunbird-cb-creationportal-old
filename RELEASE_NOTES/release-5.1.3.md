# Release 5.1.3 — 2026-09-29

|                              |                                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Build branch deployed**    | `release-5.1.3` (Jenkins deploy source)                                   |
| **Tag**                      | `v5.1.3` (immutable marker + GitHub Release)                              |
| **Baseline (previous prod)** | `v5.1.2`                                                                  |
| **Commits**                  | `157` (non-merge) — PR #204 (Sonar A-grade program) + PR #206 (AI Studio) |
| **Authors**                  | Likhith Thammegowda, Santhoshhs21, princegupta1131, vpPavithra            |

## Summary

This release adds **AI Studio** to the authoring portal. It replaces the old hand-built "AI Hub" screens with the shared `@aastrika/ai-elements` package, which covers content creation, assessment creation and usage reports. Access is controlled by new AI Studio roles. It also includes a large quality pass driven by SonarQube: it clears the reliability bugs and security hotspots, fixes several authoring defects (competencies, gating locks, quiz/assessment labels), removes a lot of unused features and dead code, and raises unit-test coverage from about 11% to over 85%. The header profile avatar is visible again, so **Logout** can be reached.

## ✨ Features

- **ai-studio** — **AI Studio replaces AI Hub.** It is built on `@aastrika/ai-elements` (custom elements) and has three screens: **Content Creation**, **Assessment Creation** and **Reports**. Each one has its own route at `/author/my-content/ai-studio/<feature>`, and old `?status=AIHub` links still open. Translate and Question Creator are dropped because the elements now cover them (`bdd1a34f`).
- **ai-studio** — **Role-gated access.** `AI_STUDIO_CONTENT` → Content Creation, `AI_STUDIO_ASSESTEMENT` → Assessment, `AI_STUDIO_CREATOR` → both, `AI_STUDIO_ADMIN` → both plus Reports. The menu, the route guard and the landing page all read the same list. A user with only an AI Studio role gets their own sidebar panel and lands on their first feature (`e316ae51`, `8928d27c`).
- **ai-studio** — **Stable creator identity for usage reports.** Work is recorded against `userId` (falling back to userName, then email), and a separate, properly cased `creatorName` is sent for display (`e316ae51`, `2569b4d6`).
- **ai-studio** — The sidebar lines up with the content header for AI-Studio-only users, and the panel's padding and background are cleaned up (`79a96671`).
- **ai-studio** — The old hand-written AI Hub service is removed, since the elements replace it (`b57bd75f`).

## 🐛 Fixes

- **ai-studio** — Steps inside Content Creation and Assessment no longer render faded. The shell's global `.dim` rule is now scoped to `.outer.dim`, the page shell it was written for (`60cfd203`).
- **profile** — The header avatar is shown again (profile picture, or an icon if there is none), so the menu that holds **Logout** can be opened. It is aligned with the label and has an `aria-label` for screen readers (`8b6063f4`, `c52968bc`). Users with no profile photo now see a generic person icon instead of their initials (see Deploy notes).
- **author / competencies** — A course is limited to one competency, the competency preview works again, and competencies display in the language chosen on the course form (`9b0f4b82`, `1f109ca7`).
- **author / assessments** — Fixes the gating lock, quiz/assessment labelling, and defects in the assessment builder (`74667c7d`).
- **author / course form** — Two corrupted conditions in the `AUTH_INIT` form table are repaired (`95386b22`). The course icon is no longer blanked when the image is hosted outside the storage bucket (`523673df`).
- **security** — `postMessage` now targets specific origins and defaults to same-origin instead of `*` (`8fe2410b`, `76f2d3c6`). Unnecessary or inert sanitizer bypasses are removed, and the remaining ones go through one service (`def2e62e`, `96450ee6`, `deaa4938`, `54fd9b71`, `5d2ec606`). `Math.random()` is replaced with `crypto` (`01646b35`).
- **reliability (Sonar)** — Clears all 244 reliability bugs (Reliability C → A): discarded `map` results, async Promise executors, un-awaited navigations, self-assignments and identical branches, missing getter returns, sort comparators, and duplicate CSS declarations (`a11ec047`, `9df3eaac`, `6e80bea5`, `eff08b70`, `b9263e85`, `2a16014a`, `b35bd2fb`, `3196d1da` and related).
- **a11y** — The app navigation bar is a native `<nav>`, the org link can be reached by keyboard, and the certificate preview has alt text (`08b8aab7`, `f67d7c08`, `35ae32d6`, `5bed780a`).

## 🏗️ Build / CI / Infra

- New dependency: **`@aastrika/ai-elements` 0.6.1** (`bdd1a34f` and follow-ups).
- CI: `quality.yml` and `sonarcloud.yml` are replaced by `build.yml` (build, tests with coverage, SonarQube scan on PRs into main/master/production). The test step is `continue-on-error`, and **lint is no longer a CI gate** (`5d5c2677`, `ae84e139`, `b2d58a84`, `53bfb5c5`, `127da8da`, `0fc8cbee`, `8cfaa702`).
- SonarCloud analysis is scoped to app source, with coverage wired in (`413d18df`). `.scannerwork` is added to `.gitignore` (`5dbc757b`).

## 📚 Docs / Chore

- **Removed unused features** (not reachable in the authoring flow): the About and Mobile App public pages; course analytics, content insights and profile analytics; the app `events`, `setup` onboarding, `frac`, `info`, `my-dashboard` and `notifications-v2` features; the channel authoring and iap-assessment modules and the orphaned `CHANNEL` role; and many unused widgets, viewer content types and components (228 component files and 123 modules deleted) (`e299c217`, `a8d02075`, `bf51cf20`, `c4b1efcc`, `facc05ae`, `f006bb65`, `a5c65260`, `48fe8cee`, `14e18162`, `11d47229`, `7d589887` and related `refactor(dead-code)` commits).
- **Deduplication** (verified equivalent): `init.ts` goes from 4,649 to 618 lines and `widet.ts` from 2,359 to 665. Shared bases are introduced for my-content/all-content, edit-meta/course-settings and the two collection components, and the save-conflict handler is collapsed (`a8d02075`, `3aca4a72`, `314361e2`, `f4f0e650`, `03b8b54c`, `523673df`, `06c5c066`).
- **Test coverage** goes from about 11% to **over 85%** on all four metrics. The work adds 383 new spec files, raises the `coverageThreshold` ratchet to match, and fixes four previously failing suites (the `test(coverage)` wave commits, ending with `91397852` and `a94e03d9`).
- Sonar docs: all 47 security-hotspot dispositions are documented, with a replay script (`f187ae05`, `19bbdabb`, `8d08703a`, `1cbc1046`, `58d2dca9`).

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** **Keycloak roles.** AI Studio is visible **only** to users who hold `AI_STUDIO_CONTENT`, `AI_STUDIO_ASSESTEMENT`, `AI_STUDIO_CREATOR` or `AI_STUDIO_ADMIN`. Authors without one of these roles will no longer see AI Hub/AI Studio. Assign the roles before or at deploy.
- **Backend / API contract dependencies:** AI Studio calls `/apis/protected/v8/aiStudio`. The AI Studio backend must be deployed and routed at that path in prod. Usage rows now use `userId` as `creator` and add a `creatorName` field.
- **Breaking changes:** Removed routes (About, Mobile App, analytics/insights, events, frac, my-dashboard, notifications-v2, channel authoring) now fall through to the default route, and any bookmarks to them stop working. `postMessage` no longer uses the `*` target origin; smoke-test the embedded viewers (SCORM/HTML) and sub-applications.
- **Visible change — avatars without a photo:** prod currently shows the user's initials. After 5.1.3, a user with no profile picture sees a generic person icon, because the initials widget (`avatar-photo`) was removed as dead code (`73c3c767`). This is expected, not a regression; flag it at sign-off.
- **Size of change:** 1,641 files changed. Much of it is tests and deletions, but it touches the authoring forms (`init.ts` rewrite), so smoke-test course creation end to end.

## ✅ Pre-deploy checklist

- [ ] Build verified on a **fresh install** (`rm -rf node_modules && npm install --legacy-peer-deps && npm run build`). A green _local_ build does not prove CI passes, and `@aastrika/ai-elements` is new.
- [ ] `npm run lint` clean (no longer enforced in CI)
- [ ] **PR #204 QA sign-off** from its owner. About 148 of the 157 commits (reliability fixes, dead-code removal, dedup, the `init.ts` rewrite) come from #204, so most of the risk in this release sits there.
- [ ] AI Studio roles assigned in Keycloak; `/apis/protected/v8/aiStudio` reachable on prod
- [ ] Smoke-tested on preprod: login, avatar → Logout, author a course (competency, icon upload, assessment), publish, and each AI Studio screen under each role
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-5.1.2`

## Release & rollback

**Deploy** — this release ships as the **`release-5.1.3`** branch. A human runs the manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-5.1.3`. Pushing the branch only provides the deploy source; it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-5.1.2
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
