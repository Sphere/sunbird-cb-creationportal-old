# CLAUDE.md — Sunbird CB Creation Portal

Guidance for AI coding assistants (and developers) working in this repository. Read this before making design or code changes.

---

## 1. Project Overview

An enterprise Angular SPA for **creating, authoring, managing, and publishing educational content** — courses, knowledge artifacts, assessments, and learning materials. It is the **content-authoring (CMS) side** of the Sunbird Competency-Based (CB) learning ecosystem; learners consume content through a separate portal.

- **Organization:** Built for the Sphere/Aastrika ecosystem on top of Sunbird (EkStep / DIKSHA).
- **Repo:** https://github.com/Sphere/sunbird-cb-creationportal-old
- **Version:** 5.0.2 — **Angular 21** (migrated from Angular 8; see §8).

When asked about features or intent, frame answers as a content-creation / CMS tool for an education platform — not a learner-facing app.

---

## 2. Tech Stack

> Versions reflect the current `package.json` after the Angular 8→21 migration.

**Core:** Angular **21.2.x** (`@angular/build:application` builder, esbuild) · TypeScript **5.9** · RxJS **7.8** · Angular CLI **21.2.x** · zone.js 0.15. State is service-based (RxJS `BehaviorSubject`) — no NgRx/Redux.

**TS config:** `target/lib: ES2022`, `moduleResolution: bundler`, `useDefineForClassFields: false`.

**UI & styling:** Angular Material **21** + CDK (MDC components) · Tailwind CSS **3.4** · SCSS · themes `theme-orange` / `theme-igot` (lazy-loaded).

**Auth:** keycloak-angular **19** + keycloak-js **24** — OAuth2/OIDC SSO via `provideKeycloak()`; interceptor-based token injection. Legacy event API: `KeycloakEventLegacy` / `EventTypeLegacy`.

**Content/media:** ngx-extended-pdf-viewer 26 · video.js 7.6 · Quill 1.3 + ngx-quill 21 · ckeditor4-angular 5.2 (CKEditor 4 is EOL — see §8) · ace-builds · ngx-image-cropper · jsplumb · three.js · vis-network · D3 · Chart.js · xlsx · angularx-qrcode.

**Utilities:** moment + moment-timezone, dayjs, lodash, uuid, jQuery (legacy integrations), Shepherd.js, mustache, dom-to-image, file-saver, typeface-roboto.

**Build/DevOps:** ng-packagr 21 · Jest 29 · ESLint 9 / @angular-eslint 21 (legacy `.eslintrc.json`, flat config deferred) · gzipper (gzip+brotli) · Docker (multi-stage: `node:20` builder + `node:20-slim` runtime) · Jenkins.

---

## 3. Project Structure & Architecture

Monorepo with three tiers — **place code in the correct tier; never mix cross-tier concerns:**

```
src/app/                    # Main app shell: component/ routes/ services/ guards/ constants/ models/
project/ws/                 # Workspace library projects
  ├── app/                  # @ws/app    — feature pages (home, dashboard, search, profile, toc, frac, events)
  ├── author/               # @ws/author — content authoring UI + shared components/services
  └── viewer/               # @ws/viewer — content consumption viewer
library/ws-widget/          # Reusable widget libraries
  ├── collection/           # @ws-widget/collection — 50+ widgets
  ├── resolver/             # @ws-widget/resolver  — runtime widget resolution from JSON config
  └── utils/                # @ws-widget/utils     — auth, config, logging, shared utils
proxy/                      # Dev proxy configs
angular.json / Dockerfile* / Jenkinsfile
```

**Path aliases (tsconfig — use these, never relative paths across library boundaries):**

```
@ws-widget/resolver   → library/ws-widget/resolver
@ws-widget/collection → library/ws-widget/collection
@ws-widget/utils      → library/ws-widget/utils
@ws/app   → project/ws/app
@ws/author → project/ws/author
@ws/viewer → project/ws/viewer
```

**Key patterns:** lazy-loaded feature modules (`loadChildren`; budgets 4MB warn / 15MB error) · config-driven **widget system** (`@ws-widget/resolver` maps type strings → components at runtime) · interceptor chain (`AppInterceptorService` for Keycloak token + retry) · resolver-based data prefetch · guard chain (`GeneralGuard` → `LoginGuard` → `EmptyRouteGuard`) · `ws` selector prefix on all components.

### Angular 21 coding standards — apply to ALL new code and bug fixes

Adopt the modern Angular 21 API surface **wherever it fits the existing NgModule architecture.** The codebase stays NgModule-based and RxJS-service-based for consistency (see "Do NOT change unilaterally" below) — but everything else should be written the modern way. When you edit a file, modernize the lines you touch; don't opportunistically rewrite untouched code, and don't cross into the architectural items.

**Always use (no conflict with the architecture):**

- **DI:** `inject()` over constructor injection (`@angular-eslint/prefer-inject` flags this).
- **Templates:** built-in control flow `@if` / `@for` (always with `track`) / `@switch` — not `*ngIf` / `*ngFor` / `ngSwitch`. Self-closing tags where there's no content.
- **Local view state:** signals — `signal()`, `computed()`, `effect()` — for new component state instead of mutable fields.
- **Subscriptions:** `takeUntilDestroyed()` (+ `DestroyRef`) or the `async` pipe — never a hand-rolled `Subject` + `ngOnDestroy` in new code.
- **Change detection:** `ChangeDetectionStrategy.OnPush` on new components.
- **Forms:** strongly-typed reactive forms; prefer `NonNullableFormBuilder`; no `any` on form values.
- **Images:** `NgOptimizedImage` (`ngSrc`) for static images.
- **Heavy/optional UI:** `@defer` blocks to lazy-load expensive widgets (charts, editors, viewers).
- **HTTP:** typed `Observable<T>`; providers via `provideHttpClient(...)`.
- **Types:** no `any` (lint warns) — prefer `unknown` + narrowing, generics, and explicit return types on public methods.

**Prefer for genuinely new, isolated code — but match the surrounding file when editing existing code:**

- **Signal I/O:** `input()` / `output()` / `model()` instead of `@Input()` / `@Output()` decorators.
- **Functional route APIs:** `CanActivateFn`, `ResolveFn`, `HttpInterceptorFn` instead of class-based guards/resolvers/interceptors. (Existing `GeneralGuard` / `AppInterceptorService` stay class-based until a planned refactor.)

**Do NOT change unilaterally (architectural — needs a planned, approved refactor):**

- **NgModules stay.** New declarations added to an existing NgModule must set **`standalone: false`** — 503 declarations were migrated this way; mixing breaks the module graph. Do not convert the app to standalone components ad hoc.
- **Service state stays RxJS** (`BehaviorSubject`) — don't rewrite existing services to a signal store as a side effect.
- **The interceptor chain, guard chain, and widget-resolver system are load-bearing** — extend them, don't replace them.

**Rule of thumb:** consistency with the file you're editing beats partial modernization. Use the "Always use" list on touched lines; leave the "Do NOT change" items for a deliberate, reviewed refactor.

---

## 4. Developer Workflow

**Run locally** (port 3000; `prestart` runs `npm run tailwind` automatically):

```bash
npm start                # ng serve, proxies to cbp-sphere.aastrika.org
npm run start:cbp-dev    # proxy to cbp-dev-ip
npm run start:hindi      # Hindi locale
```

**Build** (postbuild runs gzip+brotli over ./dist/www):

```bash
npm run build           # production → dist/www/en  (see §8 for why /en matters)
npm run build-dev
npm run build-preprod
npm run build:local
```

**Test & lint:**

```bash
npm test                # Jest
npm run test-coverage
npm run lint            # ESLint (ng lint); lint:fix for autofix
```

**Node:** Angular 21 needs Node 20+. On some Windows shells Node isn't on PATH in non-interactive sessions — prepend your Node install dir to PATH before running `ng`/`npm`.

**CI/CD:** Jenkins (`Jenkinsfile`) → Docker build/push. Build output `dist/www/en` is served by an **Express** server (`dist/server.js`), **not nginx** — see §8. The GitHub Actions **Quality** workflow (`.github/workflows/quality.yml`) gates every PR on **lint + unit tests/coverage + production build** — all three must pass.

### Testing — required for every feature and fix

**Every new feature or bug fix ships with its own unit tests in the same change** — never deliver code test-less and defer the tests. CI enforces this: `npm test -- --coverage` runs in the Quality workflow and the `coverageThreshold` ratchet in `jest.config.js` fails the build if coverage regresses. Raise the threshold as coverage climbs; never lower it.

Conventions (Jest + `jest-preset-angular`):

- **Spies/mocks:** `jest.spyOn` / `jest.fn()` — **not** Jasmine's global `spyOn` (this is a Jest project; `spyOn` is undefined).
- **Heavy components** (many injected deps / large template): instantiate the class **directly with mocked collaborators** and test its logic — full `TestBed` rendering of such components is brittle under jsdom. Light components: `TestBed` + `NO_ERRORS_SCHEMA`.
- **HTTP:** `provideHttpClient()` + `provideHttpClientTesting()` (the `HttpClientTestingModule` is deprecated).
- **Removed APIs:** use `waitForAsync`/`async-await` (not the removed `async()`), `TestBed.inject` (not `TestBed.get`).
- **Run via Node 20** (`nvs use node/20.20.1 && npx jest <pattern>`) — Node isn't always on PATH in non-interactive shells.
- The codegen skills (`add-feature-module`, `add-api-service`, `create-widget`) each include a test step + checklist item — follow them.

### Branching & release workflow

Feature branches are cut from **`main`** — the stable, production-aligned trunk. `development` and `stage` are environment branches that `main` is promoted through to verify before a release; `release-*` is the frozen production deploy snapshot.

| Branch            | Role                                                                                      | Cut features from it?                               |
| ----------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `main`            | **Stable trunk** (default, protected) — mirrors production, keeps moving as features land | ✅ **yes — branch here**, PR back here              |
| `development`     | Dev-environment branch (promotion target for verifying `main`)                            | ❌ promote into it                                  |
| `stage`           | Staging environment (pre-prod)                                                            | ❌ promote into it                                  |
| `release-<X.Y.Z>` | **Frozen** production deploy snapshot for a release                                       | ❌ release/hotfix only — never branch features here |

**New feature or fix:**

```bash
git checkout main && git pull --ff-only             # start from the stable trunk
git checkout -b feature/<short-name>                # or fix/<short-name>
# …implement WITH unit tests (see Testing above)…
git push -u origin feature/<short-name>             # open a PR INTO main
```

- **Branch from `main`, not `release-*`.** `main` holds the same stable code but is meant to advance; a release branch is frozen to its release. Branching features off a release branch breaks that.
- **Deploy is from a BRANCH, not a tag.** The manual Jenkins job (`github_release_tag`) is pointed at a per-release **build branch** `release-<X.Y.Z>`. Each release gets its **own new** build branch cut from `main`; **never advance a previous/frozen release branch** (e.g. `release-5.0.1` stays pinned).
- **The tag is `v<X.Y.Z>`** (immutable marker + GitHub Release). The build branch and the tag **must have different names** — a same-named branch+tag is an ambiguous git ref. So: branch `release-<X.Y.Z>`, tag `v<X.Y.Z>`.
- Old Angular 8 history is archived in tags (`angular-8-final`, `development-angular-8-final`, `angular21-migration-pr-archive`); the active branches are all Angular 21.

### Release runbook (when cutting a release)

Run the `release-notes` skill — it automates most of this. The full, ordered flow:

1. **Verify green:** lint + unit tests/coverage + production build all pass.
2. **On a prep branch** (never push to `main` directly): bump the version in `package.json` + `README.md` + `CLAUDE.md`, and write `RELEASE_NOTES/release-<X.Y.Z>.md` (diff vs the previous release tag; follow `RELEASE_NOTES/TEMPLATE.md`).
3. **PR → merge** the prep branch into `main`.
4. **Sync `development`** to `main` (and promote to `stage` when promoting).
5. From the merged `main` commit, cut the **build branch `release-<X.Y.Z>`** and the **tag `v<X.Y.Z>`**.
6. **Publish the GitHub Release** from the `v<X.Y.Z>` tag (body = the release note).
7. **Deploy** by pointing the Jenkins job at the **build branch** `release-<X.Y.Z>`. Rollback = re-run against the previous release branch/tag.

---

## 5. API & Backend Integration

**Proxy routes** (`proxy/localhost.proxy.json`): `/apis/*` → `https://cbp-sphere.aastrika.org/` (main gateway) · `/content-api/*` → `:3004` · `/content-store/*` → `:3005` · `/chat-bot/*` → `:3006` · `/mobile-apps/*` → `:3007` · `/LA/*` → `:3008` · `/assets/*` → CDN.

**Conventions:** Sunbird APIs are wrapped behind the `/apis/proxies/v8/` prefix (versions `/v1/ /v2/ /v8/`). New API calls should go through this prefix unless hitting a microservice directly. Content taxonomy uses `framework` + `channelId`.

**Auth flow:** Keycloak (OAuth2/OIDC SSO) → `AppInterceptorService` injects Bearer tokens → retry interceptor handles transient failures → role/group permissions drive feature visibility. Auth errors almost always trace to token expiry or a missing role.

---

## 6. Design & Development Constitution

**Mandatory for ALL design and code work. Run the Final Validation checklist before delivering any change.**

### Core principle: Enhance, Never Remove

Every redesign/refactor must improve usability, accessibility, hierarchy, consistency, discoverability, responsiveness, maintainability, and efficiency **while preserving ALL existing business functionality.**

- Aesthetics vs functionality → **functionality wins.**
- Code elegance vs business functionality → **business functionality wins.**

### Functionality preservation — NEVER REMOVE

Fields, inputs, text areas, dropdowns, checkboxes, radios, upload areas, buttons, links, nav items, tables, search, filters, sort, pagination, status indicators, validation messages, character counters, helper text, progress indicators, workflow steps, tabs, role-based functionality, permissions, business rules, notifications, alerts, API integrations, existing user flows. If functionality appears redundant, **improve its discoverability instead of removing it.**

### Design philosophy

Design for real users, not showcases. **Design for daily use, not Dribbble.** Prioritize Clarity · Speed · Efficiency · Discoverability · Accessibility · Consistency. A beautiful design that slows users down is a failed design.

### Design system

- **Layout:** responsive 12-column grid, max content width 1400px, logical grouping, consistent alignment, no excessive whitespace.
- **Consistency > creativity:** if a component exists, reuse it. No multiple styles for the same component type.
- **Spacing (8px system):** components 16–24px · card padding 24–32px · sections 32–48px · pages 48–64px.
- **Cards:** radius 12–16px, subtle shadows, consistent padding. Avoid heavy shadows / decorative styles.
- **Buttons:** Primary = filled · Secondary = outlined · Tertiary = text · Danger = destructive. **One dominant primary per screen.**
- **Typography:** page title 32 · section 24 · card 18 · body 16 · helper 14.

### Component rules

- **Forms:** smart defaults, inline validation, helper text below inputs, required indicators preserved, logical grouping. Avoid hidden errors and validation-only-after-submit.
- **Stepper:** clear current step + checkmarks on completed, "Step X of Y", no duplicate progress indicators.
- **Tables:** support (where applicable) search, sort, filter, pagination, bulk actions, export, column visibility.
- **Empty states:** must have explanation + recommended action + clear CTA.
- **System states:** every feature supports Loading · Empty · Error · Success.
- **File upload:** drag-and-drop, browse, progress, preview, replace, remove; show formats/size/dimension limits.

### Accessibility & responsive

WCAG AA, keyboard nav, visible focus, accessible contrast, screen-reader support, clear errors. Desktop full / tablet adaptive / mobile single-column — **no functionality lost on smaller screens.**

### Density & LMS rule

Optimize for productivity — avoid oversized cards/inputs/padding and large decorative elements. Every decision should help users **create / upload / configure / publish / manage / access reports faster.**

### Code quality & refactoring

Preserve functionality always. Improve for maintainability/readability/reusability/performance/consistency/scalability.

- **Allowed:** remove duplication, merge repeated logic, extract reusable components/services/utils, consolidate validations, simplify conditionals, improve naming/types/structure.
- **Not allowed:** removing functionality/business rules, changing user-facing or workflow behavior, breaking integrations/permissions/validation/accessibility, changing API contracts without approval.
- **Before refactoring:** identify duplication → verify identical behavior → preserve inputs/outputs → preserve business rules → verify no regression.

### Angular rules

Prefer reusable components over duplicate templates; reuse shared UI; move repeated logic into services/utils; strong typing; single-responsibility components; reduce template complexity; follow existing architecture; preserve API integrations and data flow.

### Final Validation Checklist (verify before delivering)

All functionality preserved · no business logic/workflow steps removed · no controls hidden unnecessarily · no API/permissions broken · design system followed · accessibility & responsive maintained · UX improved / faster task completion / reduced cognitive load · Loading-Empty-Error-Success considered · duplicate code reduced & reusable components extracted · maintainability & readability improved · no regressions · production-ready design and code. **If any item fails, revise before presenting.**

---

## 7. UI Style & Angular/Material Conventions

### Font & input fields

- Use **Roboto** for all UI text everywhere (labels, hints, buttons, dialogs, snackbars, body).
- Input field style (baseline: `create-course.component.scss`): border `#b8c9d9` (hover `#8aaac8`, focus `#1C5D95` 2px), radius **8px**, compact vertical padding (8px top/bottom), input text 14px color `#1a2d45`, padding 16px horizontal, hint 10px color `#808080`. Put field-level overrides in component SCSS, global tokens in `src/styles/styles.scss`.

### Material MDC: replace, don't patch

Angular Material 17+ MDC components (`mat-form-field`, `mat-checkbox`, …) have internal touch-targets, pseudo-elements, and infix padding that **cannot be reliably overridden via CSS** — even with `::ng-deep` / `!important`. When a Material component causes height/spacing/alignment issues, **replace it with native HTML** instead of patching:

- `mat-form-field appearance="outline"` → `<input class="module-input">` (already styled to the tokens above).
- `mat-checkbox` → `<label class="rd-checkbox-item">` + `<input type="checkbox">` with `accent-color: #1C5D95`.
- `formControlName` and `[(ngModel)]` work identically on native elements.

### The global-utility `!important` trap

Never use `!important` in component SCSS to override a global utility class that also uses `!important`. Angular injects global styles (`styles.scss`, `utility.scss`) into `<head>` **after** component styles, so the global wins regardless of specificity. Instead: remove the utility class from the HTML and add a custom class without `!important`, or move spacing ownership to the parent via `gap`.

---

## 8. Migration Notes & Deploy Gotchas

The repo was migrated **Angular 8 (ViewEngine) → 21** across 4 milestones (8→12→15→17→21). Key changes: `@angular/build:application` builder; `HttpClientModule` → `provideHttpClient(withInterceptorsFromDi(), withJsonpSupport())`; `KeycloakAngularModule` → `provideKeycloak()`; 503 declarations marked `standalone: false`; removed `CanUpdateErrorState`; `@HostBinding('src')` → `@HostBinding('attr.src')`. Remaining non-blocking warnings: SCSS `@import` deprecation, video.js CommonJS optimization warnings.

**Three gotchas to respect:**

1. **ckeditor4-angular must stay ≥ 5.2.1.** v4.0.0 was built for Angular 15 and only "worked" locally because of stale **ngcc-compiled** artifacts in `node_modules`. Angular 21 removed ngcc, so a **fresh install (CI / Docker yarn install) fails** with `NG6002 … not compatible with Ivy`. v5.2.1 is Ivy-native; the `<ckeditor>` template API is unchanged. A green local build is NOT proof CI passes after a migration — validate with a fresh install. (CKEditor 4 is EOL; full editor replacement is a separate task.)

2. **Build script flags.** Build scripts use kebab-case `--base-href=/` only. Do **not** add `--output-path` on the CLI — it resets `browser:""` and breaks the deploy layout. Output path lives in `angular.json`. (Old pre-21 flags `--outputPath`/`--baseHref`/`--i18nLocale` are invalid and were removed.)

3. **Deploy output path = `dist/www/en` (the `/en` is required).** The Angular 21 builder nests output under a `browser/` subfolder by default → root `404`. The deploy is an **Express** server (`dist/server.js`, via `npm run serve:prod`), **not nginx**; it serves only from `dist/www/en/index.html`. Correct `angular.json` setting:
   ```json
   "outputPath": { "base": "dist/www/en", "browser": "" }
   ```
   `browser:""` removes the nested subfolder; `base` keeps the `en` segment the server hardcodes. Do NOT drop `/en`.

---

_Keep this file in sync when the stack, standards, or deploy layout change. It is the shared source of truth for AI-assisted work on this repo._
